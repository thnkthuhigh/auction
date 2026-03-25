import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { redis, REDIS_KEYS } from '../../config/redis';
import { getIO } from '../../socket/socket.server';

function isAuctionExpired(endTime: Date): boolean {
  return endTime.getTime() <= Date.now();
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
    throw new AppError('Invalid bid amount', 400);
  }

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: {
      id: true,
      status: true,
      sellerId: true,
      endTime: true,
      currentPrice: true,
      minBidStep: true,
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
        },
      });

      if (!latestAuction) {
        throw new AppError('Auction not found', 404);
      }

      if (latestAuction.status !== 'ACTIVE' || isAuctionExpired(latestAuction.endTime)) {
        throw new AppError('Auction has ended', 400);
      }

      const latestCurrentPrice = Number(latestAuction.currentPrice);
      const latestMinBidStep = Number(latestAuction.minBidStep);
      validateBidAmount(amount, latestCurrentPrice, latestMinBidStep);

      const previousLeader = await tx.bid.findFirst({
        where: { auctionId },
        orderBy: [{ amount: 'desc' }, { createdAt: 'desc' }],
        select: { bidderId: true },
      });

      const updateResult = await tx.auction.updateMany({
        where: {
          id: auctionId,
          status: 'ACTIVE',
          endTime: { gt: new Date() },
          currentPrice: latestAuction.currentPrice,
        },
        data: {
          currentPrice: amount,
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
        },
        include: {
          bidder: { select: { id: true, username: true, avatar: true } },
        },
      });

      return {
        bid: newBid,
        previousLeaderBidderId: previousLeader?.bidderId,
      };
    },
  );

  await Promise.all([
    redis.set(REDIS_KEYS.auctionCurrentPrice(auctionId), amount),
    redis.incr(REDIS_KEYS.auctionBidCount(auctionId)),
  ]);

  const io = getIO();
  const totalBids = await prisma.bid.count({ where: { auctionId } });

  const bidPayload = {
    id: bid.id,
    amount: Number(bid.amount),
    createdAt: bid.createdAt.toISOString(),
    bidderId: bid.bidderId,
    bidderUsername: bid.bidder.username,
    bidderAvatar: bid.bidder.avatar ?? undefined,
    auctionId,
  };

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

  return {
    ...bidPayload,
    currentPrice: amount,
    totalBids,
  };
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
    data: bids.map((b: (typeof bids)[number]) => ({
      id: b.id,
      amount: Number(b.amount),
      createdAt: b.createdAt.toISOString(),
      bidderId: b.bidderId,
      bidderUsername: b.bidder.username,
      bidderAvatar: b.bidder.avatar,
      auctionId,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
