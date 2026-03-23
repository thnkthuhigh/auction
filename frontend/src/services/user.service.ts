import api from './api.service';
import type { AuctionStatus } from '@auction/shared';

interface MyBidAuction {
  id: string;
  title: string;
  status: AuctionStatus;
  currentPrice: number;
  winnerId: string | null;
}

interface MyBidItem {
  id: string;
  amount: number;
  createdAt: string;
  bidderId: string;
  auctionId: string;
  auction: MyBidAuction;
}

interface MyBidsResponse {
  success: boolean;
  data: MyBidItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const userService = {
  getMyBids: async (params: { page?: number; limit?: number } = {}) => {
    const res = await api.get<MyBidsResponse>('/users/me/bids', { params });
    return res.data;
  },
};

export type { MyBidItem };
