import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { redis, REDIS_KEYS } from '../../config/redis';
import { getIO } from '../../socket/socket.server';

function isAuctionExpired(endTime: Date): boolean {
  return endTime.getTime() <= Date.now();
}

export async function placeBid(bidderId: string, auctionId: string, amount: number) {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { bids: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });

  if (!auction) throw new AppError('Auction not found', 404);
  if (auction.status !== 'ACTIVE') throw new AppError('Auction is not active');
  if (auction.sellerId === bidderId) throw new AppError('Cannot bid on your own auction');
  if (isAuctionExpired(auction.endTime)) throw new AppError('Auction has ended');

  const currentPrice = Number(auction.currentPrice);
  const minRequired = currentPrice + Number(auction.minBidStep);

  if (amount < minRequired) {
    throw new AppError(`Minimum bid is ${minRequired.toLocaleString('vi-VN')} VND`);
  }

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

    const liveCurrentPrice = Number(latestAuction.currentPrice);
    const liveMinRequired = liveCurrentPrice + Number(latestAuction.minBidStep);

    if (amount < liveMinRequired) {
      throw new AppError(`Minimum bid is ${liveMinRequired.toLocaleString('vi-VN')} VND`);
    }

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
