import api from './api.service';
import type {
  Auction,
  AuctionReviewStatus,
  AuctionStatus,
  Bid,
  CreateAuctionDTO,
  AuctionFilters,
  PaginatedResponse,
  Category,
} from '@auction/shared';

export type ReviewAuctionAction = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

export interface CreateAuctionSessionPayload {
  startTime: string;
  endTime: string;
  startPrice: number;
  minBidStep: number;
}

export interface CancelAuctionSessionPayload {
  reason?: string;
}

export interface UpdateAuctionPayload {
  title?: string;
  description?: string;
  imageUrl?: string;
  startTime?: string;
  endTime?: string;
}

export interface AdminReviewQueueItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  startPrice: number;
  currentPrice: number;
  minBidStep: number;
  status: AuctionStatus;
  reviewStatus: AuctionReviewStatus;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  startTime: string;
  endTime: string;
  createdAt: string;
  sellerId: string;
  winnerId?: string | null;
  winnerUsername?: string;
  categoryId: string;
  totalBids: number;
  seller?: {
    id: string;
    username: string;
    email?: string;
    avatar?: string | null;
  };
  winner?: {
    id: string;
    username: string;
  } | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface AdminSystemLogItem {
  id: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  source: string;
  meta?: unknown;
  createdAt: string;
}

export interface AdminSystemLogsResponse {
  data: AdminSystemLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminMonitoringSummary {
  totalAuctions: number;
  pendingAuctions: number;
  activeAuctions: number;
  endedAuctions: number;
  suspendedAuctions: number;
  cancelledAuctions: number;
  pendingReviewProducts: number;
  totalBids: number;
  bidsLast24h: number;
  staleActiveAuctions: number;
  upcomingStarts24h: number;
}

export interface AdminMonitoringResponse {
  summary: AdminMonitoringSummary;
  data: AdminReviewQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type PlaceBidResponse = Bid & {
  currentPrice: number;
  totalBids: number;
};

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

  updateAuction: async (id: string, payload: UpdateAuctionPayload): Promise<Auction> => {
    const res = await api.put(`/auctions/${id}`, payload);
    return res.data.data;
  },

  deleteAuction: async (id: string): Promise<void> => {
    await api.delete(`/auctions/${id}`);
  },

  submitForReview: async (id: string): Promise<Auction> => {
    const res = await api.post(`/auctions/${id}/submit`);
    return res.data.data;
  },

  getMyAuctions: async (
    filters: { status?: string; page?: number; limit?: number } = {},
  ): Promise<PaginatedResponse<Auction>> => {
    const res = await api.get('/auctions/my', { params: filters });
    return res.data;
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

  placeBid: async (
    auctionId: string,
    amount: number,
    clientRequestId?: string,
  ): Promise<PlaceBidResponse> => {
    const res = await api.post('/bids', { auctionId, amount, clientRequestId });
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

  getAdminMonitoring: async (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: AuctionStatus;
      reviewStatus?: AuctionReviewStatus;
      sortBy?: 'updatedAt' | 'createdAt' | 'startTime' | 'endTime' | 'currentPrice';
      sortOrder?: 'asc' | 'desc';
    } = {},
  ) => {
    const res = await api.get<AdminMonitoringResponse>('/auctions/admin/monitoring', {
      params,
    });
    return res.data;
  },

  getAdminSystemLogs: async (
    params: {
      page?: number;
      limit?: number;
      level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
      source?: string;
      search?: string;
    } = {},
  ) => {
    const res = await api.get<AdminSystemLogsResponse>('/auctions/admin/system-logs', {
      params,
    });
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

  createAuctionSession: async (auctionId: string, payload: CreateAuctionSessionPayload) => {
    const res = await api.patch<{ data: AdminReviewQueueItem }>(
      `/auctions/${auctionId}/session`,
      payload,
    );
    return res.data.data;
  },

  updateAuctionSessionConfig: async (auctionId: string, payload: CreateAuctionSessionPayload) => {
    const res = await api.patch<{ data: AdminReviewQueueItem }>(
      `/auctions/${auctionId}/session-config`,
      payload,
    );
    return res.data.data;
  },

  cancelAuctionSession: async (auctionId: string, payload: CancelAuctionSessionPayload = {}) => {
    const res = await api.patch<{ data: AdminReviewQueueItem }>(
      `/auctions/${auctionId}/session/cancel`,
      payload,
    );
    return res.data.data;
  },

  suspendAuctionSession: async (auctionId: string, payload: CancelAuctionSessionPayload = {}) => {
    const res = await api.patch<{ data: AdminReviewQueueItem }>(
      `/auctions/${auctionId}/session/suspend`,
      payload,
    );
    return res.data.data;
  },
};
