import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token
api.interceptors.request.use((config) => {
  const tokens = useAuthStore.getState().tokens;
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

// Auto refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { tokens, setAuth, user, clearAuth } = useAuthStore.getState();
      if (tokens?.refreshToken) {
        try {
          const res = await axios.post(`${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`, {
            refreshToken: tokens.refreshToken,
          });
          const newTokens = res.data.data;
          setAuth(user!, newTokens);
          original.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          return api(original);
        } catch {
          clearAuth();
          window.location.href = '/login';
        }
      } else {
        clearAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
