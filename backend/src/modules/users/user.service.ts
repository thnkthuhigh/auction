import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      avatar: true,
      balance: true,
      role: true,
      createdAt: true,
      _count: {
        select: { auctions: true, bids: true, wonAuctions: true },
      },
    },
  });

  if (!user) throw new AppError('User not found', 404);

  return {
    ...user,
    balance: Number(user.balance),
    totalAuctions: user._count.auctions,
    totalBids: user._count.bids,
    wonAuctions: user._count.wonAuctions,
  };
}

export async function getUserById(targetId: string) {
  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      username: true,
      avatar: true,
      createdAt: true,
      _count: { select: { auctions: true, wonAuctions: true } },
    },
  });

  if (!user) throw new AppError('User not found', 404);
  return user;
}

export async function updateProfile(userId: string, data: { username?: string; avatar?: string }) {
  if (data.username) {
    const existing = await prisma.user.findFirst({
      where: { username: data.username, NOT: { id: userId } },
    });
    if (existing) throw new AppError('Username đã được sử dụng', 409);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      username: true,
      avatar: true,
      balance: true,
      role: true,
      createdAt: true,
    },
  });

  return { ...updated, balance: Number(updated.balance) };
}

export async function getMyBids(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [bids, total] = await Promise.all([
    prisma.bid.findMany({
      where: { bidderId: userId },
      include: {
        auction: {
          select: { id: true, title: true, status: true, currentPrice: true, winnerId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.bid.count({ where: { bidderId: userId } }),
  ]);

  return {
    data: bids.map((b: (typeof bids)[number]) => ({ ...b, amount: Number(b.amount) })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getMyAuctions(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [auctions, total] = await Promise.all([
    prisma.auction.findMany({
      where: { sellerId: userId },
      include: { category: true, _count: { select: { bids: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auction.count({ where: { sellerId: userId } }),
  ]);

  return {
    data: auctions.map((a: (typeof auctions)[number]) => ({
      ...a,
      startPrice: Number(a.startPrice),
      currentPrice: Number(a.currentPrice),
      totalBids: a._count.bids,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
