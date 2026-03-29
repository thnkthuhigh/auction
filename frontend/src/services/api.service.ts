/* eslint-disable no-restricted-imports */
import axios, { type AxiosError, type AxiosResponse } from 'axios';
import type { AuthTokens } from '@auction/shared';
import { useAuthStore } from '@/store/auth.store';

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

const refreshClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const tokens = useAuthStore.getState().tokens;
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      const { tokens, setAuth, user, clearAuth } = useAuthStore.getState();
      if (!tokens?.refreshToken || !user) {
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = (await refreshClient.post('/auth/refresh', {
          refreshToken: tokens.refreshToken,
        })) as AxiosResponse<{ data: AuthTokens }>;
        const newTokens = res.data.data;

        setAuth(user, newTokens);
        original.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        return api(original);
      } catch {
        clearAuth();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export default api;
