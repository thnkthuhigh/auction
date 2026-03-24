import type { Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import type { UpdateUserLockInput } from './user.schema';

type AdminUserListParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role;
  isActive?: boolean;
};

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
          select: { id: true, title: true, status: true, currentPrice: true },
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

export async function getAdminUsers(params: AdminUserListParams) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const limit = params.limit && params.limit > 0 ? params.limit : 20;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    ...(params.role && { role: params.role }),
    ...(typeof params.isActive === 'boolean' && { isActive: params.isActive }),
    ...(params.search && {
      OR: [
        { email: { contains: params.search, mode: 'insensitive' } },
        { username: { contains: params.search, mode: 'insensitive' } },
      ],
    }),
  };

  const [users, total, activeUsers, lockedUsers, adminUsers] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        role: true,
        isActive: true,
        lockReason: true,
        lockedAt: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            auctions: true,
            bids: true,
            wonAuctions: true,
          },
        },
      },
      orderBy: [{ isActive: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
  ]);

  return {
    summary: {
      totalUsers: activeUsers + lockedUsers,
      activeUsers,
      lockedUsers,
      adminUsers,
      memberUsers: activeUsers + lockedUsers - adminUsers,
    },
    data: users.map((user) => ({
      ...user,
      balance: Number(user.balance),
      totalAuctions: user._count.auctions,
      totalBids: user._count.bids,
      wonAuctions: user._count.wonAuctions,
      _count: undefined,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function updateUserLockStatus(
  currentAdminId: string,
  targetUserId: string,
  input: UpdateUserLockInput,
) {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });

  if (!target) {
    throw new AppError('User not found', 404);
  }

  if (target.id === currentAdminId) {
    throw new AppError('Cannot lock or unlock your own account', 400);
  }

  if (target.role === 'ADMIN' && !input.isActive) {
    throw new AppError('Cannot lock admin account', 400);
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      isActive: input.isActive,
      lockedAt: input.isActive ? null : new Date(),
      lockReason: input.isActive ? null : input.reason?.trim() || null,
    },
    select: {
      id: true,
      email: true,
      username: true,
      avatar: true,
      role: true,
      isActive: true,
      lockReason: true,
      lockedAt: true,
      balance: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          auctions: true,
          bids: true,
          wonAuctions: true,
        },
      },
    },
  });

  return {
    ...updated,
    balance: Number(updated.balance),
    totalAuctions: updated._count.auctions,
    totalBids: updated._count.bids,
    wonAuctions: updated._count.wonAuctions,
    _count: undefined,
  };
}
