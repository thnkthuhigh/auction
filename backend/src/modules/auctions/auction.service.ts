import type { AuctionReviewStatus, Prisma } from '@prisma/client';
import type { AuctionStatus } from '@auction/shared';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { redis, REDIS_KEYS } from '../../config/redis';
import type {
  CancelAuctionSessionInput,
  CreateAuctionInput,
  CreateAuctionSessionInput,
  ReviewAuctionInput,
  UpdateAuctionSessionConfigInput,
  UpdateAuctionInput,
} from './auction.schema';

function formatAuction(a: Record<string, unknown> & { _count?: { bids: number } }) {
  return {
    ...a,
    startPrice: Number(a.startPrice),
    currentPrice: Number(a.currentPrice),
    minBidStep: Number(a.minBidStep),
    totalBids: a._count?.bids ?? 0,
    _count: undefined,
  };
}

type AdminMonitoringParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: AuctionStatus;
  reviewStatus?: AuctionReviewStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

function validateSessionWindow(startTime: Date, endTime: Date) {
  if (startTime >= endTime) {
    throw new AppError('endTime must be after startTime', 400);
  }

  if (endTime <= new Date()) {
    throw new AppError('endTime must be in the future', 400);
  }
}

export async function getMyAuctions(
  userId: string,
  filters: {
    status?: AuctionStatus;
    page?: number;
    limit?: number;
  } = {},
) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
  const skip = (page - 1) * limit;

  const where: Prisma.AuctionWhereInput = {
    sellerId: userId,
    ...(filters.status && { status: filters.status }),
  };

  const [auctions, total] = await Promise.all([
    prisma.auction.findMany({
      where,
      include: {
        seller: { select: { id: true, username: true, avatar: true } },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { bids: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auction.count({ where }),
  ]);

  return {
    data: auctions.map((auction) =>
      formatAuction(auction as Record<string, unknown> & { _count?: { bids: number } }),
    ),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAuctions(filters: {
  status?: AuctionStatus;
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const {
    status,
    categoryId,
    search,
    page = 1,
    limit = 12,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;
  const skip = (page - 1) * limit;

  const where = {
    ...(status && { status }),
    ...(categoryId && { categoryId }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const validSortBy = ['createdAt', 'endTime', 'currentPrice'].includes(sortBy)
    ? sortBy
    : 'createdAt';

  const [auctions, total] = await Promise.all([
    prisma.auction.findMany({
      where,
      include: {
        seller: { select: { id: true, username: true, avatar: true } },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { bids: true } },
      },
      orderBy: { [validSortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.auction.count({ where }),
  ]);

  return {
    data: auctions.map(formatAuction),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAuctionById(id: string) {
  const auction = await prisma.auction.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, username: true, avatar: true } },
      winner: { select: { id: true, username: true } },
      category: true,
      _count: { select: { bids: true } },
    },
  });

  if (!auction) throw new AppError('Auction not found', 404);
  return formatAuction(auction as Record<string, unknown> & { _count?: { bids: number } });
}

export async function createAuction(sellerId: string, input: CreateAuctionInput) {
  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);

  if (startTime >= endTime) {
    throw new AppError('Thời gian kết thúc phải sau thời gian bắt đầu');
  }

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
  });
  if (!category) throw new AppError('Category not found', 404);

  const auction = await prisma.auction.create({
    data: {
      title: input.title,
      description: input.description,
      imageUrl: input.imageUrl,
      startPrice: input.startPrice,
      currentPrice: input.startPrice,
      minBidStep: input.minBidStep ?? 1000,
      startTime,
      endTime,
      sellerId,
      categoryId: input.categoryId,
    },
    include: {
      seller: { select: { id: true, username: true } },
      category: true,
      _count: { select: { bids: true } },
    },
  });

  return formatAuction(auction as Record<string, unknown> & { _count?: { bids: number } });
}

export async function createAuctionSession(auctionId: string, input: CreateAuctionSessionInput) {
  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  validateSessionWindow(startTime, endTime);

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { id: true, status: true, reviewStatus: true },
  });

  if (!auction) {
    throw new AppError('Auction not found', 404);
  }

  if (auction.reviewStatus !== 'APPROVED') {
    throw new AppError('Only approved products can have auction sessions', 400);
  }

  if (auction.status === 'ACTIVE') {
    throw new AppError('Cannot create or update session for active auction', 400);
  }

  if (auction.status === 'ENDED') {
    throw new AppError('Cannot create or update session for ended auction', 400);
  }

  const updated = await prisma.auction.update({
    where: { id: auctionId },
    data: {
      startTime,
      endTime,
      startPrice: input.startPrice,
      currentPrice: input.startPrice,
      minBidStep: input.minBidStep,
      status: 'PENDING',
    },
    include: {
      seller: { select: { id: true, username: true, avatar: true } },
      category: { select: { id: true, name: true, slug: true } },
      reviewedBy: { select: { id: true, username: true, email: true } },
      _count: { select: { bids: true } },
    },
  });

  await redis.set(REDIS_KEYS.auctionCurrentPrice(auctionId), input.startPrice);
  await redis.del(REDIS_KEYS.auctionBidCount(auctionId));

  return formatAuction(updated as Record<string, unknown> & { _count?: { bids: number } });
}

export async function updateAuctionSessionConfig(
  auctionId: string,
  input: UpdateAuctionSessionConfigInput,
) {
  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  validateSessionWindow(startTime, endTime);

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: {
      id: true,
      status: true,
      reviewStatus: true,
      _count: { select: { bids: true } },
    },
  });

  if (!auction) {
    throw new AppError('Auction not found', 404);
  }

  if (auction.reviewStatus !== 'APPROVED') {
    throw new AppError('Only approved products can be configured', 400);
  }

  if (auction.status !== 'PENDING') {
    throw new AppError('Only pending sessions can be configured', 400);
  }

  if (auction._count.bids > 0) {
    throw new AppError('Cannot change session config after bids exist', 400);
  }

  const updated = await prisma.auction.update({
    where: { id: auctionId },
    data: {
      startTime,
      endTime,
      startPrice: input.startPrice,
      currentPrice: input.startPrice,
      minBidStep: input.minBidStep,
    },
    include: {
      seller: { select: { id: true, username: true, avatar: true } },
      category: { select: { id: true, name: true, slug: true } },
      reviewedBy: { select: { id: true, username: true, email: true } },
      _count: { select: { bids: true } },
    },
  });

  await redis.set(REDIS_KEYS.auctionCurrentPrice(auctionId), input.startPrice);
  await redis.del(REDIS_KEYS.auctionBidCount(auctionId));

  return formatAuction(updated as Record<string, unknown> & { _count?: { bids: number } });
}

export async function cancelAuctionSession(auctionId: string, _input?: CancelAuctionSessionInput) {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { id: true, status: true, reviewStatus: true },
  });

  if (!auction) {
    throw new AppError('Auction not found', 404);
  }

  if (auction.reviewStatus !== 'APPROVED') {
    throw new AppError('Only approved products can be managed', 400);
  }

  if (auction.status === 'ENDED' || auction.status === 'CANCELLED') {
    throw new AppError('Auction session is already closed', 400);
  }

  const updated = await prisma.auction.update({
    where: { id: auctionId },
    data: { status: 'CANCELLED' },
    include: {
      seller: { select: { id: true, username: true, avatar: true } },
      category: { select: { id: true, name: true, slug: true } },
      reviewedBy: { select: { id: true, username: true, email: true } },
      _count: { select: { bids: true } },
    },
  });

  await redis.del(REDIS_KEYS.auctionCurrentPrice(auctionId));
  await redis.del(REDIS_KEYS.auctionBidCount(auctionId));

  return formatAuction(updated as Record<string, unknown> & { _count?: { bids: number } });
}

export async function getAdminMonitoring(params: AdminMonitoringParams) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const limit = params.limit && params.limit > 0 ? params.limit : 12;
  const sortBy = params.sortBy ?? 'updatedAt';
  const sortOrder = params.sortOrder ?? 'desc';
  const skip = (page - 1) * limit;

  const where: Prisma.AuctionWhereInput = {
    ...(params.status && { status: params.status }),
    ...(params.reviewStatus && { reviewStatus: params.reviewStatus }),
    ...(params.search && {
      OR: [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { seller: { username: { contains: params.search, mode: 'insensitive' } } },
      ],
    }),
  };

  const validSortBy = ['updatedAt', 'createdAt', 'startTime', 'endTime', 'currentPrice'].includes(
    sortBy,
  )
    ? sortBy
    : 'updatedAt';

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [
    items,
    total,
    statusGrouped,
    pendingReviewProducts,
    totalBids,
    bidsLast24h,
    staleActive,
    upcomingStarts,
  ] = await Promise.all([
    prisma.auction.findMany({
      where,
      include: {
        seller: { select: { id: true, username: true, avatar: true } },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { bids: true } },
      },
      orderBy: { [validSortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.auction.count({ where }),
    prisma.auction.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.auction.count({ where: { reviewStatus: 'PENDING_REVIEW' } }),
    prisma.bid.count(),
    prisma.bid.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.auction.count({ where: { status: 'ACTIVE', endTime: { lte: now } } }),
    prisma.auction.count({
      where: { status: 'PENDING', startTime: { gte: now, lte: next24Hours } },
    }),
  ]);

  const statusCounts: Record<AuctionStatus, number> = {
    PENDING: 0,
    REVIEW: 0,
    ACTIVE: 0,
    ENDED: 0,
    CANCELLED: 0,
  };

  for (const row of statusGrouped) {
    statusCounts[row.status as AuctionStatus] = row._count._all;
  }

  return {
    summary: {
      totalAuctions:
        statusCounts.PENDING + statusCounts.ACTIVE + statusCounts.ENDED + statusCounts.CANCELLED,
      pendingAuctions: statusCounts.PENDING,
      activeAuctions: statusCounts.ACTIVE,
      endedAuctions: statusCounts.ENDED,
      cancelledAuctions: statusCounts.CANCELLED,
      pendingReviewProducts,
      totalBids,
      bidsLast24h,
      staleActiveAuctions: staleActive,
      upcomingStarts24h: upcomingStarts,
    },
    data: items.map((item) =>
      formatAuction(item as Record<string, unknown> & { _count?: { bids: number } }),
    ),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function updateAuction(id: string, sellerId: string, input: UpdateAuctionInput) {
  const auction = await prisma.auction.findUnique({ where: { id } });
  if (!auction) throw new AppError('Auction not found', 404);
  if (auction.sellerId !== sellerId) throw new AppError('Forbidden', 403);
  if (auction.status !== 'PENDING') throw new AppError('Chỉ có thể chỉnh sửa đấu giá chưa bắt đầu');

  const updated = await prisma.auction.update({
    where: { id },
    data: {
      ...input,
      ...(input.startTime && { startTime: new Date(input.startTime) }),
      ...(input.endTime && { endTime: new Date(input.endTime) }),
    },
    include: {
      seller: { select: { id: true, username: true } },
      category: true,
      _count: { select: { bids: true } },
    },
  });

  return formatAuction(updated as Record<string, unknown> & { _count?: { bids: number } });
}

export async function deleteAuction(id: string, sellerId: string, isAdmin: boolean) {
  const auction = await prisma.auction.findUnique({ where: { id } });
  if (!auction) throw new AppError('Auction not found', 404);
  if (!isAdmin && auction.sellerId !== sellerId) throw new AppError('Forbidden', 403);
  if (auction.status === 'ACTIVE') throw new AppError('Không thể xoá đấu giá đang diễn ra');

  await prisma.auction.delete({ where: { id } });
  await redis.del(REDIS_KEYS.auctionCurrentPrice(id));
  await redis.del(REDIS_KEYS.auctionBidCount(id));
}

export async function submitAuctionForReview(id: string, sellerId: string) {
  const auction = await prisma.auction.findUnique({ where: { id } });
  if (!auction) throw new AppError('Auction not found', 404);
  if (auction.sellerId !== sellerId) throw new AppError('Forbidden', 403);
  if (auction.status !== 'PENDING')
    throw new AppError('Chỉ có thể gửi duyệt đấu giá ở trạng thái bản nháp (PENDING)');

  const updated = await prisma.auction.update({
    where: { id },
    data: { status: 'REVIEW' },
    include: {
      seller: { select: { id: true, username: true } },
      category: true,
      _count: { select: { bids: true } },
    },
  });

  return formatAuction(updated as Record<string, unknown> & { _count?: { bids: number } });
}

export async function getMyAuctions(
  sellerId: string,
  filters: { status?: string; page?: number; limit?: number } = {},
) {
  const { status, page = 1, limit = 12 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.AuctionWhereInput = {
    sellerId,
    ...(status && { status: status as AuctionStatus }),
  };

  const [auctions, total] = await Promise.all([
    prisma.auction.findMany({
      where,
      include: {
        seller: { select: { id: true, username: true, avatar: true } },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { bids: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auction.count({ where }),
  ]);

  return {
    data: auctions.map((a) => formatAuction(a as Record<string, unknown> & { _count?: { bids: number } })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: 'asc' } });
}

const REVIEW_ACTION_TO_STATUS: Record<ReviewAuctionInput['action'], AuctionReviewStatus> = {
  APPROVE: 'APPROVED',
  REJECT: 'REJECTED',
  REQUEST_CHANGES: 'CHANGES_REQUESTED',
};

export async function getReviewQueue(params: { page?: number; limit?: number }) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const limit = params.limit && params.limit > 0 ? params.limit : 20;
  const skip = (page - 1) * limit;

  const where = { reviewStatus: 'PENDING_REVIEW' as const };

  const [items, total] = await Promise.all([
    prisma.auction.findMany({
      where,
      include: {
        seller: { select: { id: true, username: true, email: true } },
        category: { select: { id: true, name: true, slug: true } },
        reviewedBy: { select: { id: true, username: true, email: true } },
        _count: { select: { bids: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.auction.count({ where }),
  ]);

  return {
    data: items.map((item) =>
      formatAuction(item as Record<string, unknown> & { _count?: { bids: number } }),
    ),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function reviewAuction(
  auctionId: string,
  reviewerId: string,
  input: ReviewAuctionInput,
) {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { id: true, reviewStatus: true },
  });

  if (!auction) {
    throw new AppError('Auction not found', 404);
  }

  if (auction.reviewStatus !== 'PENDING_REVIEW') {
    throw new AppError('Auction này đã được xử lý duyệt trước đó', 400);
  }

  const updated = await prisma.auction.update({
    where: { id: auctionId },
    data: {
      reviewStatus: REVIEW_ACTION_TO_STATUS[input.action],
      reviewNote: input.note?.trim() ? input.note.trim() : null,
      reviewedAt: new Date(),
      reviewedById: reviewerId,
    },
    include: {
      seller: { select: { id: true, username: true, avatar: true } },
      category: { select: { id: true, name: true, slug: true } },
      reviewedBy: { select: { id: true, username: true, email: true } },
      _count: { select: { bids: true } },
    },
  });

  return formatAuction(updated as Record<string, unknown> & { _count?: { bids: number } });
}
