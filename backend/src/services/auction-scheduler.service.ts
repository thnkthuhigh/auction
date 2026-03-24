import cron from 'node-cron';
import { prisma } from '../config/database';
import { getIO } from '../socket/socket.server';

/**
 * Chạy mỗi 30 giây – kiểm tra và cập nhật trạng thái đấu giá
 * TV3 phụ trách module này
 */
export function startAuctionScheduler() {
  // Bắt đầu các đấu giá PENDING đã đến startTime
  cron.schedule('*/30 * * * * *', async () => {
    const now = new Date();

    // Kích hoạt đấu giá REVIEW đã đến startTime (admin đã duyệt, chờ lịch bắt đầu)
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

      console.log(`▶️  Started ${toStart.length} auction(s)`);
    }

    // Kết thúc các đấu giá ACTIVE đã hết endTime
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
      console.log(`🏁 Ended ${toEnd.length} auction(s)`);
    }
  });

  console.log('⏰ Auction scheduler started');
}
