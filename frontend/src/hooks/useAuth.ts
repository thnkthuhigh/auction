import { useMutation } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { disconnectSocket } from '@/services/socket.service';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const { setAuth, clearAuth, user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth(data.user, data.tokens);
      toast.success(`Chào mừng ${data.user.username}!`);
      navigate('/');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Đăng nhập thất bại');
    },
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      setAuth(data.user, data.tokens);
      toast.success('Đăng ký thành công!');
      navigate('/');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Đăng ký thất bại');
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
    register: registerMutation.mutate,
    logout,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}
