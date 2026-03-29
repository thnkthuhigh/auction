import api from './api.service';
import type { AuctionStatus, UpdateProfileDTO, UserProfile } from '@auction/shared';

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

export interface AdminUserItem {
  id: string;
  email: string;
  username: string;
  avatar?: string | null;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  lockReason?: string | null;
  lockedAt?: string | null;
  balance: number;
  createdAt: string;
  updatedAt: string;
  totalAuctions: number;
  totalBids: number;
  wonAuctions: number;
}

export interface AdminUsersSummary {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  adminUsers: number;
  memberUsers: number;
}

export interface AdminUsersResponse {
  summary: AdminUsersSummary;
  data: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const userService = {
  getMe: async () => {
    const res = await api.get<{ data: UserProfile }>('/users/me');
    return res.data.data;
  },

  updateMe: async (payload: UpdateProfileDTO) => {
    const res = await api.put<{ data: UserProfile }>('/users/me', payload);
    return res.data.data;
  },

  getMyBids: async (params: { page?: number; limit?: number } = {}) => {
    const res = await api.get<MyBidsResponse>('/users/me/bids', { params });
    return res.data;
  },

  getAdminUsers: async (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      role?: 'USER' | 'ADMIN';
      isActive?: boolean;
    } = {},
  ) => {
    const res = await api.get<AdminUsersResponse>('/users/admin/list', { params });
    return res.data;
  },

  updateAdminUserStatus: async (
    userId: string,
    payload: { isActive: boolean; reason?: string },
  ) => {
    const res = await api.patch<{ data: AdminUserItem }>(`/users/admin/${userId}/status`, payload);
    return res.data.data;
  },
};

export type { MyBidItem };
