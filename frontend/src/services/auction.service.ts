import api from './api.service';
import type {
  Auction,
  CreateAuctionDTO,
  AuctionFilters,
  PaginatedResponse,
  Category,
} from '@auction/shared';

export type ReviewAuctionAction = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

export interface AdminReviewQueueItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  startPrice: number;
  currentPrice: number;
  minBidStep: number;
  status: 'PENDING' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  reviewStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  startTime: string;
  endTime: string;
  createdAt: string;
  sellerId: string;
  categoryId: string;
  totalBids: number;
  seller?: {
    id: string;
    username: string;
    email?: string;
    avatar?: string | null;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

export const auctionService = {
  getAuctions: async (filters: AuctionFilters = {}): Promise<PaginatedResponse<Auction>> => {
    const res = await api.get('/auctions', { params: filters });
    return res.data;
  },

  getAuctionById: async (id: string): Promise<Auction> => {
    const res = await api.get(`/auctions/${id}`);
    return res.data.data;
  },

  createAuction: async (data: CreateAuctionDTO): Promise<Auction> => {
    const res = await api.post('/auctions', data);
    return res.data.data;
  },

  deleteAuction: async (id: string): Promise<void> => {
    await api.delete(`/auctions/${id}`);
  },

  getCategories: async (): Promise<Category[]> => {
    const res = await api.get('/auctions/categories');
    return res.data.data;
  },

  getBids: async (auctionId: string, page = 1) => {
    const res = await api.get(`/bids/auction/${auctionId}`, {
      params: { page },
    });
    return res.data;
  },

  placeBid: async (auctionId: string, amount: number) => {
    const res = await api.post('/bids', { auctionId, amount });
    return res.data.data;
  },

  getAdminReviewQueue: async (params: { page?: number; limit?: number } = {}) => {
    const res = await api.get<PaginatedResponse<AdminReviewQueueItem>>(
      '/auctions/admin/review-queue',
      {
        params,
      },
    );
    return res.data;
  },

  reviewAuction: async (
    auctionId: string,
    payload: { action: ReviewAuctionAction; note?: string },
  ) => {
    const res = await api.patch<{ data: AdminReviewQueueItem }>(
      `/auctions/${auctionId}/review`,
      payload,
    );
    return res.data.data;
  },
};
