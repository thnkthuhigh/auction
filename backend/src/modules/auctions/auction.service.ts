import type { AuctionStatus } from '@auction/shared';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { redis, REDIS_KEYS } from '../../config/redis';
import type { CreateAuctionInput, UpdateAuctionInput } from './auction.schema';

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

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: 'asc' } });
}
