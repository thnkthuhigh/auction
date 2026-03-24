import api from './api.service';

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
