import cron from 'node-cron';
import { REDIS_KEYS, redis } from '../config/redis';
import { prisma } from '../config/database';
import { getIO } from '../socket/socket.server';
import { logger } from '../utils/logger';

function resolvePositiveInt(rawValue: string | undefined, fallback: number): number {
  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const SCHEDULER_BATCH_LIMIT = resolvePositiveInt(process.env.SCHEDULER_BATCH_LIMIT, 50);
let isSchedulerTickRunning = false;

async function clearRealtimeCacheForAuctions(auctionIds: string[]) {
  if (auctionIds.length === 0) return;

  const keys = auctionIds.flatMap((auctionId) => [
    REDIS_KEYS.auctionRealtimeSnapshot(auctionId),
    REDIS_KEYS.auctionCurrentPrice(auctionId),
    REDIS_KEYS.auctionBidCount(auctionId),
    REDIS_KEYS.auctionRecentBids(auctionId),
  ]);

  try {
    await redis.del(...keys);
  } catch (error) {
    logger.warn(
      'Failed to clear realtime cache after scheduler update',
      {
        auctionCount: auctionIds.length,
        reason: error instanceof Error ? error.message : 'unknown-error',
      },
      'scheduler',
    );
  }
}

export function startAuctionScheduler() {
  cron.schedule('* * * * * *', async () => {
    if (isSchedulerTickRunning) return;
    isSchedulerTickRunning = true;

    try {
      const now = new Date();

      const toStart = await prisma.auction.findMany({
        where: {
          status: 'PENDING',
          reviewStatus: 'APPROVED',
          startTime: { lte: now },
        },
        orderBy: { startTime: 'asc' },
        take: SCHEDULER_BATCH_LIMIT,
        select: { id: true, endTime: true },
      });

      if (toStart.length > 0) {
        const toStartIds = toStart.map((auction) => auction.id);
        await prisma.auction.updateMany({
          where: { id: { in: toStartIds } },
          data: { status: 'ACTIVE' },
        });
        await clearRealtimeCacheForAuctions(toStartIds);

        const io = getIO();
        toStart.forEach((auction: (typeof toStart)[number]) => {
          io.to(`auction:${auction.id}`).emit('auction:started', {
            auctionId: auction.id,
            endsAt: auction.endTime.toISOString(),
          });
        });

        logger.info('Auctions started by scheduler', { count: toStart.length }, 'scheduler');
      }

      const toEnd = await prisma.auction.findMany({
        where: { status: 'ACTIVE', endTime: { lte: now } },
        orderBy: { endTime: 'asc' },
        take: SCHEDULER_BATCH_LIMIT,
        select: {
          id: true,
          sellerId: true,
          currentPrice: true,
          heldBidderId: true,
          heldAmount: true,
        },
      });

      for (const auction of toEnd) {
        const topBid = await prisma.bid.findFirst({
          where: { auctionId: auction.id },
          orderBy: [{ amount: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
          include: {
            bidder: {
              select: { id: true, username: true },
            },
          },
        });

        const winnerId = topBid?.bidderId ?? null;
        const finalPrice = Number(auction.currentPrice);
        const heldBidderId = auction.heldBidderId;
        const heldAmount = Number(auction.heldAmount);

        await prisma.$transaction(async (tx) => {
          let additionalCharge = 0;

          if (winnerId) {
            if (heldBidderId === winnerId) {
              additionalCharge = Math.max(0, finalPrice - heldAmount);
            } else {
              additionalCharge = finalPrice;
            }

            if (additionalCharge > 0) {
              const winner = await tx.user.findUnique({
                where: { id: winnerId },
                select: { balance: true },
              });

              if (!winner || Number(winner.balance) < additionalCharge) {
                throw new Error(
                  `Winner ${winnerId} has insufficient balance for settlement of auction ${auction.id}`,
                );
              }

              await tx.user.update({
                where: { id: winnerId },
                data: {
                  balance: { decrement: additionalCharge },
                },
              });
            }

            await tx.user.update({
              where: { id: auction.sellerId },
              data: {
                balance: { increment: finalPrice },
              },
            });
          }

          if (heldBidderId && Number.isFinite(heldAmount) && heldAmount > 0) {
            const refundableAmount =
              heldBidderId === winnerId ? Math.max(0, heldAmount - finalPrice) : heldAmount;

            if (refundableAmount > 0) {
              await tx.user.update({
                where: { id: heldBidderId },
                data: {
                  balance: { increment: refundableAmount },
                },
              });
            }
          }

          await tx.auction.update({
            where: { id: auction.id },
            data: {
              status: 'ENDED',
              winnerId,
              heldBidderId: null,
              heldAmount: 0,
            },
          });
        });

        const io = getIO();
        io.to(`auction:${auction.id}`).emit('auction:ended', {
          auctionId: auction.id,
          winner: topBid ? { id: topBid.bidder.id, username: topBid.bidder.username } : undefined,
          finalPrice: Number(auction.currentPrice),
        });
      }
      await clearRealtimeCacheForAuctions(toEnd.map((auction) => auction.id));

      if (toEnd.length > 0) {
        logger.info('Auctions ended by scheduler', { count: toEnd.length }, 'scheduler');
      }
    } catch (error) {
      logger.error('Auction scheduler tick failed', error, 'scheduler');
    } finally {
      isSchedulerTickRunning = false;
    }
  });

  logger.info('Auction scheduler started', undefined, 'scheduler');
}
