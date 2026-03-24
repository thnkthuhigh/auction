import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { disconnectSocket } from '@/services/socket.service';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import type { ApiResponse } from '@auction/shared';

function getApiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiResponse>;
  return axiosError.response?.data?.message || fallback;
}

export function useAuth() {
  const { setAuth, clearAuth, user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth(data.user, data.tokens);
      toast.success(`Chào mừng ${data.user.username}!`);
      navigate(data.user.role === 'ADMIN' ? '/admin' : '/');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Đăng nhập thất bại'));
    },
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      setAuth(data.user, data.tokens);
      toast.success('Đăng ký thành công!');
      navigate(data.user.role === 'ADMIN' ? '/admin' : '/');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Đăng ký thất bại'));
    },
  });

  const logout = () => {
    authService.logout().catch(() => {});
    clearAuth();
    disconnectSocket();
    toast.success('Đã đăng xuất');
    navigate('/login');
  };

  return {
    user,
    isAuthenticated,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    logout,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}
