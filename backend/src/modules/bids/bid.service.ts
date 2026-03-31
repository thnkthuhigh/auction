import { Prisma, type AuctionStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { REDIS_KEYS, redis } from '../../config/redis';
import { getIO } from '../../socket/socket.server';
import { logger } from '../../utils/logger';

function isAuctionExpired(endTime: Date): boolean {
  return endTime.getTime() <= Date.now();
}

function resolvePositiveInt(rawValue: string | undefined, fallback: number): number {
  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const BID_RATE_LIMIT_WINDOW_MS = resolvePositiveInt(process.env.BID_RATE_LIMIT_WINDOW_MS, 1500);
const BID_RATE_LIMIT_MAX_REQUESTS = resolvePositiveInt(process.env.BID_RATE_LIMIT_MAX_REQUESTS, 3);
const SNAPSHOT_CACHE_TTL_MS = resolvePositiveInt(process.env.BID_SNAPSHOT_CACHE_TTL_MS, 500);
const SNAPSHOT_BIDS_LIMIT = resolvePositiveInt(process.env.BID_SNAPSHOT_BIDS_LIMIT, 50);
const REDIS_SNAPSHOT_CACHE_TTL_SECONDS = resolvePositiveInt(
  process.env.BID_REDIS_SNAPSHOT_CACHE_TTL_SECONDS,
  2,
);
const BID_CACHE_TTL_SECONDS = resolvePositiveInt(process.env.BID_CACHE_TTL_SECONDS, 24 * 60 * 60);
const BID_IDEMPOTENCY_RESULT_TTL_SECONDS = resolvePositiveInt(
  process.env.BID_IDEMPOTENCY_RESULT_TTL_SECONDS,
  120,
);
const BID_IDEMPOTENCY_LOCK_TTL_MS = resolvePositiveInt(
  process.env.BID_IDEMPOTENCY_LOCK_TTL_MS,
  5000,
);
const BID_IDEMPOTENCY_WAIT_TIMEOUT_MS = resolvePositiveInt(
  process.env.BID_IDEMPOTENCY_WAIT_TIMEOUT_MS,
  2500,
);
const BID_IDEMPOTENCY_POLL_INTERVAL_MS = resolvePositiveInt(
  process.env.BID_IDEMPOTENCY_POLL_INTERVAL_MS,
  80,
);

type BidWithBidder = {
  id: string;
  amount: Prisma.Decimal;
  createdAt: Date;
  bidderId: string;
  auctionId: string;
  bidder: { username: string; avatar: string | null };
};

type BidClientPayload = ReturnType<typeof mapBidForClient>;

type BidRealtimeSnapshot = {
  auctionId: string;
  currentPrice: number;
  totalBids: number;
  status: AuctionStatus;
  endsAt: string;
  bids: BidClientPayload[];
};

type PlaceBidResult = BidClientPayload & {
  currentPrice: number;
  totalBids: number;
};

const snapshotCache = new Map<string, { expiresAt: number; snapshot: BidRealtimeSnapshot }>();
const snapshotInFlight = new Map<string, Promise<BidRealtimeSnapshot>>();

function buildSnapshotCacheKey(auctionId: string, limit: number): string {
  return `${auctionId}:${limit}`;
}

function withServerTime(snapshot: BidRealtimeSnapshot) {
  return {
    ...snapshot,
    serverTime: new Date().toISOString(),
  };
}

function sliceSnapshotByLimit(
  snapshot: BidRealtimeSnapshot,
  limit: number,
): BidRealtimeSnapshot | null {
  if (snapshot.bids.length < limit) {
    return null;
  }

  if (snapshot.bids.length === limit) {
    return snapshot;
  }

  return {
    ...snapshot,
    bids: snapshot.bids.slice(0, limit),
  };
}

function pruneSnapshotCacheIfNeeded() {
  if (snapshotCache.size < 3000) return;

  const now = Date.now();
  for (const [key, value] of snapshotCache.entries()) {
    if (value.expiresAt <= now) {
      snapshotCache.delete(key);
    }
  }
}

function invalidateSnapshotCache(auctionId: string) {
  const prefix = `${auctionId}:`;
  for (const key of snapshotCache.keys()) {
    if (key.startsWith(prefix)) {
      snapshotCache.delete(key);
    }
  }

  void redis.del(REDIS_KEYS.auctionRealtimeSnapshot(auctionId)).catch((error) => {
    logger.warn(
      'Failed to clear redis realtime snapshot cache',
      {
        auctionId,
        reason: error instanceof Error ? error.message : 'unknown-error',
      },
      'bid',
    );
  });
}

function parseRealtimeSnapshotCache(raw: string): BidRealtimeSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as Partial<BidRealtimeSnapshot>;
    if (
      typeof parsed.auctionId !== 'string' ||
      typeof parsed.currentPrice !== 'number' ||
      typeof parsed.totalBids !== 'number' ||
      typeof parsed.status !== 'string' ||
      typeof parsed.endsAt !== 'string' ||
      !Array.isArray(parsed.bids)
    ) {
      return null;
    }

    const bids = parsed.bids
      .map((item) => {
        if (
          typeof item !== 'object' ||
          item === null ||
          typeof (item as BidClientPayload).id !== 'string' ||
          typeof (item as BidClientPayload).auctionId !== 'string' ||
          typeof (item as BidClientPayload).bidderId !== 'string' ||
          typeof (item as BidClientPayload).bidderUsername !== 'string' ||
          typeof (item as BidClientPayload).createdAt !== 'string' ||
          typeof (item as BidClientPayload).amount !== 'number'
        ) {
          return null;
        }

        return {
          id: (item as BidClientPayload).id,
          auctionId: (item as BidClientPayload).auctionId,
          bidderId: (item as BidClientPayload).bidderId,
          bidderUsername: (item as BidClientPayload).bidderUsername,
          bidderAvatar:
            typeof (item as BidClientPayload).bidderAvatar === 'string'
              ? (item as BidClientPayload).bidderAvatar
              : undefined,
          createdAt: (item as BidClientPayload).createdAt,
          amount: (item as BidClientPayload).amount,
        };
      })
      .filter((item): item is BidClientPayload => item !== null);

    return {
      auctionId: parsed.auctionId,
      currentPrice: parsed.currentPrice,
      totalBids: parsed.totalBids,
      status: parsed.status as AuctionStatus,
      endsAt: parsed.endsAt,
      bids,
    };
  } catch {
    return null;
  }
}

async function readRedisRealtimeSnapshot(
  auctionId: string,
  limit: number,
): Promise<BidRealtimeSnapshot | null> {
  try {
    const raw = await redis.get(REDIS_KEYS.auctionRealtimeSnapshot(auctionId));
    if (!raw) return null;

    const parsed = parseRealtimeSnapshotCache(raw);
    if (!parsed) return null;

    return sliceSnapshotByLimit(parsed, limit);
  } catch (error) {
    logger.warn(
      'Failed to read redis realtime snapshot cache',
      {
        auctionId,
        reason: error instanceof Error ? error.message : 'unknown-error',
      },
      'bid',
    );
    return null;
  }
}

async function writeRedisRealtimeSnapshot(snapshot: BidRealtimeSnapshot): Promise<void> {
  if (REDIS_SNAPSHOT_CACHE_TTL_SECONDS <= 0) return;

  try {
    await redis.set(
      REDIS_KEYS.auctionRealtimeSnapshot(snapshot.auctionId),
      JSON.stringify(snapshot),
      'EX',
      REDIS_SNAPSHOT_CACHE_TTL_SECONDS,
    );
  } catch (error) {
    logger.warn(
      'Failed to write redis realtime snapshot cache',
      {
        auctionId: snapshot.auctionId,
        reason: error instanceof Error ? error.message : 'unknown-error',
      },
      'bid',
    );
  }
}

function parseCachedBid(rawBid: string): BidClientPayload | null {
  try {
    const parsed = JSON.parse(rawBid) as Partial<BidClientPayload>;
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.auctionId !== 'string' ||
      typeof parsed.bidderId !== 'string' ||
      typeof parsed.bidderUsername !== 'string' ||
      typeof parsed.createdAt !== 'string' ||
      typeof parsed.amount !== 'number' ||
      !Number.isFinite(parsed.amount)
    ) {
      return null;
    }

    return {
      id: parsed.id,
      auctionId: parsed.auctionId,
      bidderId: parsed.bidderId,
      bidderUsername: parsed.bidderUsername,
      bidderAvatar: typeof parsed.bidderAvatar === 'string' ? parsed.bidderAvatar : undefined,
      createdAt: parsed.createdAt,
      amount: parsed.amount,
    };
  } catch {
    return null;
  }
}

function mapBidForClient(bid: BidWithBidder) {
  return {
    id: bid.id,
    amount: Number(bid.amount),
    createdAt: bid.createdAt.toISOString(),
    bidderId: bid.bidderId,
    bidderUsername: bid.bidder.username,
    bidderAvatar: bid.bidder.avatar ?? undefined,
    auctionId: bid.auctionId,
  };
}

function normalizeClientRequestId(clientRequestId?: string): string | null {
  if (typeof clientRequestId !== 'string') return null;
  const normalized = clientRequestId.trim();
  return normalized.length >= 8 ? normalized : null;
}

function getBidIdempotencyKeys(bidderId: string, auctionId: string, clientRequestId: string) {
  return {
    resultKey: REDIS_KEYS.bidIdempotencyResult(bidderId, auctionId, clientRequestId),
    lockKey: REDIS_KEYS.bidIdempotencyLock(bidderId, auctionId, clientRequestId),
  };
}

async function readBidIdempotencyResult(
  bidderId: string,
  auctionId: string,
  clientRequestId: string,
): Promise<PlaceBidResult | null> {
  try {
    const { resultKey } = getBidIdempotencyKeys(bidderId, auctionId, clientRequestId);
    const raw = await redis.get(resultKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlaceBidResult>;
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.auctionId !== 'string' ||
      typeof parsed.bidderId !== 'string' ||
      typeof parsed.bidderUsername !== 'string' ||
      typeof parsed.createdAt !== 'string' ||
      typeof parsed.amount !== 'number' ||
      typeof parsed.currentPrice !== 'number' ||
      typeof parsed.totalBids !== 'number'
    ) {
      return null;
    }

    return {
      id: parsed.id,
      auctionId: parsed.auctionId,
      bidderId: parsed.bidderId,
      bidderUsername: parsed.bidderUsername,
      bidderAvatar: typeof parsed.bidderAvatar === 'string' ? parsed.bidderAvatar : undefined,
      createdAt: parsed.createdAt,
      amount: parsed.amount,
      currentPrice: parsed.currentPrice,
      totalBids: parsed.totalBids,
    };
  } catch {
    return null;
  }
}

async function cacheBidIdempotencyResult(
  bidderId: string,
  auctionId: string,
  clientRequestId: string,
  result: PlaceBidResult,
) {
  try {
    const { resultKey } = getBidIdempotencyKeys(bidderId, auctionId, clientRequestId);
    await redis.set(resultKey, JSON.stringify(result), 'EX', BID_IDEMPOTENCY_RESULT_TTL_SECONDS);
  } catch (error) {
    logger.warn(
      'Failed to cache bid idempotency result',
      {
        bidderId,
        auctionId,
        clientRequestId,
        reason: error instanceof Error ? error.message : 'unknown-error',
      },
      'bid',
    );
  }
}

async function acquireBidIdempotencyLock(
  bidderId: string,
  auctionId: string,
  clientRequestId: string,
): Promise<string | null> {
  const token = `${Date.now()}:${Math.random().toString(16).slice(2)}`;
  const { lockKey } = getBidIdempotencyKeys(bidderId, auctionId, clientRequestId);

  try {
    const lockResult = await redis.set(lockKey, token, 'PX', BID_IDEMPOTENCY_LOCK_TTL_MS, 'NX');
    return lockResult === 'OK' ? token : null;
  } catch (error) {
    logger.warn(
      'Failed to acquire bid idempotency lock',
      {
        bidderId,
        auctionId,
        clientRequestId,
        reason: error instanceof Error ? error.message : 'unknown-error',
      },
      'bid',
    );
    return null;
  }
}

async function releaseBidIdempotencyLock(
  bidderId: string,
  auctionId: string,
  clientRequestId: string,
  token: string,
) {
  const { lockKey } = getBidIdempotencyKeys(bidderId, auctionId, clientRequestId);

  try {
    await redis.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      lockKey,
      token,
    );
  } catch (error) {
    logger.warn(
      'Failed to release bid idempotency lock',
      {
        bidderId,
        auctionId,
        clientRequestId,
        reason: error instanceof Error ? error.message : 'unknown-error',
      },
      'bid',
    );
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForBidIdempotencyResult(
  bidderId: string,
  auctionId: string,
  clientRequestId: string,
): Promise<PlaceBidResult | null> {
  const deadline = Date.now() + BID_IDEMPOTENCY_WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const cached = await readBidIdempotencyResult(bidderId, auctionId, clientRequestId);
    if (cached) return cached;

    const existing = await resolveBidResultFromExistingRequest(
      bidderId,
      auctionId,
      clientRequestId,
    );
    if (existing) {
      await cacheBidIdempotencyResult(bidderId, auctionId, clientRequestId, existing);
      return existing;
    }

    await sleep(BID_IDEMPOTENCY_POLL_INTERVAL_MS);
  }

  return null;
}

async function assertBidRateLimit(bidderId: string, auctionId: string): Promise<void> {
  const key = REDIS_KEYS.bidRateLimit(bidderId, auctionId);

  try {
    const currentCount = await redis.incr(key);

    if (currentCount === 1) {
      await redis.pexpire(key, BID_RATE_LIMIT_WINDOW_MS);
    }

    if (currentCount > BID_RATE_LIMIT_MAX_REQUESTS) {
      throw new AppError('Bạn đặt giá quá nhanh. Vui lòng thử lại sau ít giây.', 429);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.warn(
      'Bid rate limit check failed, fallback to DB validation only',
      {
        bidderId,
        auctionId,
        reason: error instanceof Error ? error.message : 'unknown-error',
      },
      'bid',
    );
  }
}

function validateBidAmount(amount: number, currentPrice: number, minBidStep: number) {
  const minRequired = currentPrice + minBidStep;

  if (amount < minRequired) {
    throw new AppError(`Minimum bid is ${minRequired.toLocaleString('vi-VN')} VND`, 400);
  }

  const diffFromCurrent = amount - currentPrice;
  if (diffFromCurrent % minBidStep !== 0) {
    const roundedDiff = Math.ceil(diffFromCurrent / minBidStep) * minBidStep;
    const nextValidBid = currentPrice + roundedDiff;

    throw new AppError(
      `Bid must follow step ${minBidStep.toLocaleString(
        'vi-VN',
      )} VND. Suggested: ${nextValidBid.toLocaleString('vi-VN')} VND`,
      400,
    );
  }
}

async function hydrateBidCacheIfMissing(params: {
  auctionId: string;
  currentPrice: number;
  totalBids: number;
  bids: BidClientPayload[];
  hasCachedCurrentPrice: boolean;
  hasCachedCount: boolean;
  hasCachedBids: boolean;
}) {
  const {
    auctionId,
    currentPrice,
    totalBids,
    bids,
    hasCachedCurrentPrice,
    hasCachedCount,
    hasCachedBids,
  } = params;

  const shouldWriteCurrentPrice = !hasCachedCurrentPrice;
  const shouldWriteCount = !hasCachedCount;
  const shouldWriteBids = !hasCachedBids;

  if (!shouldWriteCurrentPrice && !shouldWriteCount && !shouldWriteBids) {
    return;
  }

  try {
    const pipeline = redis.multi();

    if (shouldWriteCurrentPrice) {
      pipeline.set(REDIS_KEYS.auctionCurrentPrice(auctionId), currentPrice);
    }

    if (shouldWriteCount) {
      pipeline.set(REDIS_KEYS.auctionBidCount(auctionId), totalBids);
      pipeline.expire(REDIS_KEYS.auctionBidCount(auctionId), BID_CACHE_TTL_SECONDS);
    }

    if (shouldWriteBids) {
      const recentBidsKey = REDIS_KEYS.auctionRecentBids(auctionId);
      pipeline.del(recentBidsKey);
      if (bids.length > 0) {
        pipeline.rpush(recentBidsKey, ...bids.map((bid) => JSON.stringify(bid)));
      }
      pipeline.ltrim(recentBidsKey, 0, SNAPSHOT_BIDS_LIMIT - 1);
      pipeline.expire(recentBidsKey, BID_CACHE_TTL_SECONDS);
    }

    await pipeline.exec();
  } catch (error) {
    logger.warn(
      'Failed to hydrate bid snapshot cache',
      {
        auctionId,
        reason: error instanceof Error ? error.message : 'unknown-error',
      },
      'bid',
    );
  }
}

async function resolveTotalBidCountAfterAcceptedBid(
  auctionId: string,
  bidPayload: BidClientPayload,
): Promise<number> {
  const countKey = REDIS_KEYS.auctionBidCount(auctionId);
  const recentBidsKey = REDIS_KEYS.auctionRecentBids(auctionId);

  try {
    const pipelineResults = await redis
      .multi()
      .set(REDIS_KEYS.auctionCurrentPrice(auctionId), bidPayload.amount)
      .incr(countKey)
      .expire(countKey, BID_CACHE_TTL_SECONDS)
      .lpush(recentBidsKey, JSON.stringify(bidPayload))
      .ltrim(recentBidsKey, 0, SNAPSHOT_BIDS_LIMIT - 1)
      .expire(recentBidsKey, BID_CACHE_TTL_SECONDS)
      .exec();

    const incrValue = pipelineResults?.[1]?.[1];
    let totalBids = Number(incrValue);

    if (!Number.isInteger(totalBids) || totalBids <= 0) {
      totalBids = await prisma.bid.count({ where: { auctionId } });
      await redis.set(countKey, totalBids, 'EX', BID_CACHE_TTL_SECONDS);
      return totalBids;
    }

    // If cache key was missing after a restart, INCR starts from 1.
    // In that case we fix it once from DB, then subsequent increments are O(1).
    if (totalBids === 1) {
      const actualTotal = await prisma.bid.count({ where: { auctionId } });
      if (actualTotal > 1) {
        totalBids = actualTotal;
        await redis.set(countKey, actualTotal, 'EX', BID_CACHE_TTL_SECONDS);
      }
    }

    return totalBids;
  } catch (error) {
    logger.warn(
      'Redis cache update failed after bid accepted',
      {
        auctionId,
        reason: error instanceof Error ? error.message : 'unknown-error',
      },
      'bid',
    );

    const totalFromDb = await prisma.bid.count({ where: { auctionId } });
    return totalFromDb;
  }
}

async function resolveBidResultFromExistingRequest(
  bidderId: string,
  auctionId: string,
  clientRequestId: string,
): Promise<PlaceBidResult | null> {
  const existingBid = await prisma.bid.findFirst({
    where: {
      bidderId,
      auctionId,
      clientRequestId,
    },
    include: {
      bidder: { select: { username: true, avatar: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!existingBid) return null;

  let totalBids = Number(await redis.get(REDIS_KEYS.auctionBidCount(auctionId)));
  if (!Number.isInteger(totalBids) || totalBids <= 0) {
    totalBids = await prisma.bid.count({ where: { auctionId } });
  }

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { currentPrice: true },
  });
  const auctionCurrentPrice = auction ? Number(auction.currentPrice) : Number(existingBid.amount);

  const payload = mapBidForClient(existingBid);
  return {
    ...payload,
    currentPrice: Math.max(auctionCurrentPrice, payload.amount),
    totalBids,
  };
}

async function loadBidRealtimeSnapshot(
  auctionId: string,
  limit: number,
): Promise<BidRealtimeSnapshot> {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: {
      id: true,
      currentPrice: true,
      status: true,
      endTime: true,
    },
  });

  if (!auction) {
    throw new AppError('Auction not found', 404);
  }

  const recentLimit = Math.max(1, Math.min(limit, SNAPSHOT_BIDS_LIMIT));
  const [cachedCurrentPrice, cachedTotalBids, cachedBidsRaw] = await Promise.all([
    redis.get(REDIS_KEYS.auctionCurrentPrice(auctionId)),
    redis.get(REDIS_KEYS.auctionBidCount(auctionId)),
    redis.lrange(REDIS_KEYS.auctionRecentBids(auctionId), 0, recentLimit - 1),
  ]);

  // NOTE: redis.get() returns null when key doesn't exist.
  // Number(null) === 0, which incorrectly passes the >= 0 check.
  // Guard against null before parsing to avoid treating "no cache" as "price = 0".
  const parsedCurrentPrice = cachedCurrentPrice !== null ? Number(cachedCurrentPrice) : NaN;
  const hasCachedCurrentPrice = Number.isFinite(parsedCurrentPrice) && parsedCurrentPrice > 0;
  const currentPrice = hasCachedCurrentPrice ? parsedCurrentPrice : Number(auction.currentPrice);

  const parsedTotalBids = cachedTotalBids !== null ? Number(cachedTotalBids) : NaN;
  const hasCachedCount = Number.isInteger(parsedTotalBids) && parsedTotalBids >= 0;
  let totalBids: number | null = hasCachedCount ? parsedTotalBids : null;

  const parsedCachedBids = cachedBidsRaw
    .map(parseCachedBid)
    .filter((bid): bid is BidClientPayload => bid !== null)
    .slice(0, recentLimit);
  const hasCachedBids = parsedCachedBids.length > 0;
  let bids = parsedCachedBids;

  if (!hasCachedBids || totalBids === null) {
    const [dbBids, dbTotalBids] = await Promise.all([
      hasCachedBids
        ? Promise.resolve([] as BidWithBidder[])
        : prisma.bid.findMany({
            where: { auctionId },
            include: {
              bidder: { select: { username: true, avatar: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: recentLimit,
          }),
      totalBids !== null ? Promise.resolve(totalBids) : prisma.bid.count({ where: { auctionId } }),
    ]);

    if (!hasCachedBids) {
      bids = dbBids.map((bid) => mapBidForClient(bid));
    }
    totalBids = dbTotalBids;

    await hydrateBidCacheIfMissing({
      auctionId,
      currentPrice,
      totalBids,
      bids,
      hasCachedCurrentPrice,
      hasCachedCount,
      hasCachedBids,
    });
  }

  return {
    auctionId,
    currentPrice,
    totalBids: totalBids ?? 0,
    status: auction.status,
    endsAt: auction.endTime.toISOString(),
    bids,
  };
}

async function placeBidUnsafe(
  bidderId: string,
  auctionId: string,
  amount: number,
  clientRequestId?: string | null,
) {
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    throw new AppError('Invalid bid amount', 400);
  }

  await assertBidRateLimit(bidderId, auctionId);

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: {
      id: true,
      status: true,
      sellerId: true,
      endTime: true,
      currentPrice: true,
      minBidStep: true,
      heldBidderId: true,
      heldAmount: true,
    },
  });

  if (!auction) {
    throw new AppError('Auction not found', 404);
  }

  if (auction.status !== 'ACTIVE') {
    throw new AppError('Auction is not active', 400);
  }

  if (auction.sellerId === bidderId) {
    throw new AppError('Cannot bid on your own auction', 403);
  }

  if (isAuctionExpired(auction.endTime)) {
    throw new AppError('Auction has ended', 400);
  }

  validateBidAmount(amount, Number(auction.currentPrice), Number(auction.minBidStep));

  const { bid, previousLeaderBidderId } = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const latestAuction = await tx.auction.findUnique({
        where: { id: auctionId },
        select: {
          id: true,
          status: true,
          endTime: true,
          currentPrice: true,
          minBidStep: true,
          heldBidderId: true,
          heldAmount: true,
        },
      });

      if (!latestAuction) {
        throw new AppError('Auction not found', 404);
      }

      if (latestAuction.status !== 'ACTIVE' || isAuctionExpired(latestAuction.endTime)) {
        throw new AppError('Auction has ended', 400);
      }

      validateBidAmount(
        amount,
        Number(latestAuction.currentPrice),
        Number(latestAuction.minBidStep),
      );

      const previousHeldBidderId = latestAuction.heldBidderId;
      const previousHeldAmount = Number(latestAuction.heldAmount);
      const additionalHoldRequired =
        previousHeldBidderId === bidderId ? amount - previousHeldAmount : amount;

      if (additionalHoldRequired > 0) {
        const bidder = await tx.user.findUnique({
          where: { id: bidderId },
          select: { balance: true, isActive: true },
        });

        if (!bidder || !bidder.isActive) {
          throw new AppError('User not found or inactive', 403);
        }

        const bidderBalance = Number(bidder.balance);
        if (bidderBalance < additionalHoldRequired) {
          throw new AppError(
            `Số dư không đủ. Cần thêm ${(additionalHoldRequired - bidderBalance).toLocaleString(
              'vi-VN',
            )} VND để đặt giá.`,
            400,
          );
        }

        await tx.user.update({
          where: { id: bidderId },
          data: {
            balance: { decrement: additionalHoldRequired },
          },
        });
      }

      if (
        previousHeldBidderId &&
        previousHeldBidderId !== bidderId &&
        Number.isFinite(previousHeldAmount) &&
        previousHeldAmount > 0
      ) {
        await tx.user.update({
          where: { id: previousHeldBidderId },
          data: {
            balance: { increment: previousHeldAmount },
          },
        });
      }

      const updateResult = await tx.auction.updateMany({
        where: {
          id: auctionId,
          status: 'ACTIVE',
          endTime: { gt: new Date() },
          currentPrice: latestAuction.currentPrice,
          heldBidderId: previousHeldBidderId,
          heldAmount: latestAuction.heldAmount,
        },
        data: {
          currentPrice: amount,
          heldBidderId: bidderId,
          heldAmount: amount,
        },
      });

      if (updateResult.count === 0) {
        throw new AppError('Current price changed, please place bid again', 409);
      }

      const newBid = await tx.bid.create({
        data: {
          amount,
          bidderId,
          auctionId,
          clientRequestId: clientRequestId ?? null,
        },
        include: {
          bidder: { select: { username: true, avatar: true } },
        },
      });

      return {
        bid: newBid,
        previousLeaderBidderId: previousHeldBidderId ?? undefined,
      };
    },
  );

  const bidPayload = mapBidForClient(bid);
  const totalBids = await resolveTotalBidCountAfterAcceptedBid(auctionId, bidPayload);
  invalidateSnapshotCache(auctionId);

  const io = getIO();
  io.to(`auction:${auctionId}`).emit('bid:new', {
    bid: bidPayload,
    currentPrice: amount,
    totalBids,
  });

  if (previousLeaderBidderId && previousLeaderBidderId !== bidderId) {
    io.to(`user:${previousLeaderBidderId}`).emit('user:outbid', {
      auctionId,
      newPrice: amount,
      newBidder: bid.bidder.username,
    });
  }

  logger.info(
    'Bid accepted',
    {
      bidId: bid.id,
      auctionId,
      bidderId,
      amount,
      totalBids,
      previousLeaderBidderId: previousLeaderBidderId ?? null,
      clientRequestId: clientRequestId ?? null,
      createdAt: bid.createdAt.toISOString(),
    },
    'bid',
  );

  return {
    ...bidPayload,
    currentPrice: amount,
    totalBids,
  };
}

export async function placeBid(
  bidderId: string,
  auctionId: string,
  amount: number,
  clientRequestId?: string,
) {
  const normalizedClientRequestId = normalizeClientRequestId(clientRequestId);

  if (!normalizedClientRequestId) {
    return placeBidUnsafe(bidderId, auctionId, amount);
  }

  const cached = await readBidIdempotencyResult(bidderId, auctionId, normalizedClientRequestId);
  if (cached) return cached;

  const existingFromDb = await resolveBidResultFromExistingRequest(
    bidderId,
    auctionId,
    normalizedClientRequestId,
  );
  if (existingFromDb) {
    await cacheBidIdempotencyResult(bidderId, auctionId, normalizedClientRequestId, existingFromDb);
    return existingFromDb;
  }

  const lockToken = await acquireBidIdempotencyLock(bidderId, auctionId, normalizedClientRequestId);
  if (!lockToken) {
    const waitingResult = await waitForBidIdempotencyResult(
      bidderId,
      auctionId,
      normalizedClientRequestId,
    );
    if (waitingResult) return waitingResult;
  }

  try {
    const retryCached = await readBidIdempotencyResult(
      bidderId,
      auctionId,
      normalizedClientRequestId,
    );
    if (retryCached) return retryCached;

    const retryExisting = await resolveBidResultFromExistingRequest(
      bidderId,
      auctionId,
      normalizedClientRequestId,
    );
    if (retryExisting) {
      await cacheBidIdempotencyResult(
        bidderId,
        auctionId,
        normalizedClientRequestId,
        retryExisting,
      );
      return retryExisting;
    }

    try {
      const created = await placeBidUnsafe(bidderId, auctionId, amount, normalizedClientRequestId);
      await cacheBidIdempotencyResult(bidderId, auctionId, normalizedClientRequestId, created);
      return created;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const deduplicated = await resolveBidResultFromExistingRequest(
          bidderId,
          auctionId,
          normalizedClientRequestId,
        );
        if (deduplicated) {
          await cacheBidIdempotencyResult(
            bidderId,
            auctionId,
            normalizedClientRequestId,
            deduplicated,
          );
          return deduplicated;
        }
      }

      throw error;
    }
  } finally {
    if (lockToken) {
      await releaseBidIdempotencyLock(bidderId, auctionId, normalizedClientRequestId, lockToken);
    }
  }
}

export async function getBidsByAuction(auctionId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [bids, total] = await Promise.all([
    prisma.bid.findMany({
      where: { auctionId },
      include: {
        bidder: { select: { username: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.bid.count({ where: { auctionId } }),
  ]);

  return {
    data: bids.map((bid) => mapBidForClient(bid)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getBidRealtimeSnapshot(auctionId: string, limit = 20) {
  const boundedLimit = Math.max(1, Math.min(limit, SNAPSHOT_BIDS_LIMIT));
  const cacheKey = buildSnapshotCacheKey(auctionId, boundedLimit);

  const cached = snapshotCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return withServerTime(cached.snapshot);
  }

  const inFlightSnapshot = snapshotInFlight.get(cacheKey);
  if (inFlightSnapshot) {
    return withServerTime(await inFlightSnapshot);
  }

  const redisCached = await readRedisRealtimeSnapshot(auctionId, boundedLimit);
  if (redisCached) {
    if (SNAPSHOT_CACHE_TTL_MS > 0) {
      snapshotCache.set(cacheKey, {
        expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS,
        snapshot: redisCached,
      });
      pruneSnapshotCacheIfNeeded();
    }
    return withServerTime(redisCached);
  }

  const inFlightAfterRedis = snapshotInFlight.get(cacheKey);
  if (inFlightAfterRedis) {
    return withServerTime(await inFlightAfterRedis);
  }

  const loadPromise = loadBidRealtimeSnapshot(auctionId, boundedLimit);
  snapshotInFlight.set(cacheKey, loadPromise);

  try {
    const snapshot = await loadPromise;
    await writeRedisRealtimeSnapshot(snapshot);
    if (SNAPSHOT_CACHE_TTL_MS > 0) {
      snapshotCache.set(cacheKey, {
        expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS,
        snapshot,
      });
      pruneSnapshotCacheIfNeeded();
    }

    return withServerTime(snapshot);
  } finally {
    snapshotInFlight.delete(cacheKey);
  }
}
