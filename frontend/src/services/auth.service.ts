import api from './api.service';
import type { LoginDTO, RegisterDTO, AuthResponse } from '@auction/shared';

export const authService = {
  register: async (data: RegisterDTO): Promise<AuthResponse> => {
    const res = await api.post('/auth/register', data);
    return res.data.data;
  },

  login: async (data: LoginDTO): Promise<AuthResponse> => {
    const res = await api.post('/auth/login', data);
    return res.data.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
  },
};
