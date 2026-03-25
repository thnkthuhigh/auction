import cron from 'node-cron';
import { prisma } from '../config/database';
import { getIO } from '../socket/socket.server';
import { logger } from '../utils/logger';

export function startAuctionScheduler() {
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const now = new Date();

      const toStart = await prisma.auction.findMany({
        where: { status: 'REVIEW', startTime: { lte: now } },
        select: { id: true, endTime: true },
      });

      if (toStart.length > 0) {
        await prisma.auction.updateMany({
          where: { id: { in: toStart.map((a: (typeof toStart)[number]) => a.id) } },
          data: { status: 'ACTIVE' },
        });

        const io = getIO();
        toStart.forEach((auction: (typeof toStart)[number]) => {
          io.to(`auction:${auction.id}`).emit('auction:started', {
            auctionId: auction.id,
            endsAt: auction.endTime.toISOString(),
          });
        });

        logger.info('Auctions started by scheduler', { count: toStart.length });
      }

      const toEnd = await prisma.auction.findMany({
        where: { status: 'ACTIVE', endTime: { lte: now } },
        include: {
          bids: {
            orderBy: { amount: 'desc' },
            take: 1,
            include: { bidder: { select: { id: true, username: true } } },
          },
        },
      });

      for (const auction of toEnd) {
        const topBid = auction.bids[0];
        const winnerId = topBid?.bidderId ?? null;

        await prisma.auction.update({
          where: { id: auction.id },
          data: { status: 'ENDED', winnerId },
        });

        const io = getIO();
        io.to(`auction:${auction.id}`).emit('auction:ended', {
          auctionId: auction.id,
          winner: topBid ? { id: topBid.bidder.id, username: topBid.bidder.username } : undefined,
          finalPrice: Number(auction.currentPrice),
        });
      }

      if (toEnd.length > 0) {
        logger.info('Auctions ended by scheduler', { count: toEnd.length });
      }
    } catch (error) {
      logger.error('Auction scheduler tick failed', error);
    }
  });

  logger.info('Auction scheduler started');
}
