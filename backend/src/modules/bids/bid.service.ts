import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { redis, REDIS_KEYS } from '../../config/redis';
import { getIO } from '../../socket/socket.server';

function isAuctionExpired(endTime: Date): boolean {
  return endTime.getTime() <= Date.now();
}

function mapBidForClient(bid: {
  id: string;
  amount: Prisma.Decimal;
  createdAt: Date;
  bidderId: string;
  auctionId: string;
  bidder: { username: string; avatar: string | null };
}) {
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
      `Bid must follow step ${minBidStep.toLocaleString('vi-VN')} VND. Suggested: ${nextValidBid.toLocaleString('vi-VN')} VND`,
      400,
    );
  }
}

export async function placeBid(bidderId: string, auctionId: string, amount: number) {
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    throw new AppError('Số tiền đặt giá không hợp lệ', 400);
  }

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { bids: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });

  if (!auction) throw new AppError('Auction not found', 404);
  if (auction.status !== 'ACTIVE') throw new AppError('Auction is not active');
  if (auction.sellerId === bidderId) throw new AppError('Cannot bid on your own auction');
  if (isAuctionExpired(auction.endTime)) throw new AppError('Auction has ended');

  const currentPrice = Number(auction.currentPrice);
  validateBidAmount(amount, currentPrice, Number(auction.minBidStep));

  const [bid, updatedAuction] = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const latestAuction = await tx.auction.findUnique({
      where: { id: auctionId },
      select: {
        id: true,
        status: true,
        endTime: true,
        currentPrice: true,
        minBidStep: true,
      },
    });

    if (!latestAuction) throw new AppError('Auction not found', 404);
    if (latestAuction.status !== 'ACTIVE' || isAuctionExpired(latestAuction.endTime)) {
      throw new AppError('Auction has ended');
    }

    validateBidAmount(amount, Number(latestAuction.currentPrice), Number(latestAuction.minBidStep));

    const newBid = await tx.bid.create({
      data: { amount, bidderId, auctionId },
      include: {
        bidder: { select: { id: true, username: true, avatar: true } },
      },
    });

    const updated = await tx.auction.update({
      where: { id: auctionId },
      data: { currentPrice: amount },
    });

    return [newBid, updated] as const;
  });

  await redis.set(REDIS_KEYS.auctionCurrentPrice(auctionId), amount);
  await redis.incr(REDIS_KEYS.auctionBidCount(auctionId));

  const io = getIO();
  const totalBids = await prisma.bid.count({ where: { auctionId } });

  const bidPayload = mapBidForClient(bid);

  io.to(`auction:${auctionId}`).emit('bid:new', {
    bid: bidPayload,
    currentPrice: Number(updatedAuction.currentPrice),
    totalBids,
  });

  const prevBid = auction.bids[0];
  if (prevBid && prevBid.bidderId !== bidderId) {
    io.to(`user:${prevBid.bidderId}`).emit('user:outbid', {
      auctionId,
      newPrice: amount,
      newBidder: bid.bidder.username,
    });
  }

  return { ...bidPayload, currentPrice: amount, totalBids };
}

export async function getBidsByAuction(auctionId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [bids, total] = await Promise.all([
    prisma.bid.findMany({
      where: { auctionId },
      include: {
        bidder: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.bid.count({ where: { auctionId } }),
  ]);

  return {
    data: bids.map((b: (typeof bids)[number]) => mapBidForClient(b)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getBidRealtimeSnapshot(auctionId: string, limit = 20) {
  const [auction, bids, totalBids] = await Promise.all([
    prisma.auction.findUnique({
      where: { id: auctionId },
      select: {
        id: true,
        currentPrice: true,
        status: true,
        endTime: true,
      },
    }),
    prisma.bid.findMany({
      where: { auctionId },
      include: {
        bidder: { select: { username: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.bid.count({ where: { auctionId } }),
  ]);

  if (!auction) {
    throw new AppError('Auction not found', 404);
  }

  return {
    auctionId,
    currentPrice: Number(auction.currentPrice),
    totalBids,
    status: auction.status,
    endsAt: auction.endTime.toISOString(),
    serverTime: new Date().toISOString(),
    bids: bids.map((bid) =>
      mapBidForClient({
        ...bid,
        bidder: {
          username: bid.bidder.username,
          avatar: bid.bidder.avatar,
        },
      }),
    ),
  };
}
