import { type Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { redis, REDIS_KEYS } from '../../config/redis';
import { getIO } from '../../socket/socket.server';

export async function placeBid(bidderId: string, auctionId: string, amount: number) {
  // Validate auction exists and is active
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { bids: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });

  if (!auction) throw new AppError('Auction not found', 404);
  if (auction.status !== 'ACTIVE') throw new AppError('Đấu giá không đang diễn ra');
  if (auction.sellerId === bidderId)
    throw new AppError('Không thể đặt giá cho đấu giá của chính mình');
  if (new Date() > auction.endTime) throw new AppError('Đấu giá đã kết thúc');

  const currentPrice = Number(auction.currentPrice);
  const minRequired = currentPrice + Number(auction.minBidStep);

  if (amount < minRequired) {
    throw new AppError(`Giá thầu tối thiểu là ${minRequired.toLocaleString('vi-VN')} VNĐ`);
  }

  // Use DB transaction to prevent race conditions
  const [bid, updatedAuction] = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

  // Update Redis cache
  await redis.set(REDIS_KEYS.auctionCurrentPrice(auctionId), amount);
  await redis.incr(REDIS_KEYS.auctionBidCount(auctionId));

  // Emit real-time event
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

  // Notify previous highest bidder
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
