import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Gavel } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { ApiResponse, RegisterDTO } from '@auction/shared';
import type { AxiosError } from 'axios';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  username: z
    .string()
    .min(3, 'Username tối thiểu 3 ký tự')
    .max(20, 'Username tối đa 20 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Chỉ chứa chữ, số và dấu gạch dưới'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});

/**
 * TV4 phụ trách trang này
 */
export default function RegisterPage() {
  const { registerAsync, isRegistering } = useAuth();
  const [submitError, setSubmitError] = useState('');
  const inputClassName =
    'w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<RegisterDTO>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    setSubmitError('');
    clearErrors(['email', 'username']);

    try {
      await registerAsync({
        email: data.email.trim(),
        username: data.username.trim(),
        password: data.password,
      });
    } catch (error) {
      const apiError = error as AxiosError<ApiResponse>;
      const message = apiError.response?.data?.message || 'Đăng ký thất bại';
      const normalizedMessage = message.toLowerCase();

      if (normalizedMessage.includes('email')) {
        setError('email', { type: 'server', message });
        return;
      }

      if (normalizedMessage.includes('username')) {
        setError('username', { type: 'server', message });
        return;
      }

      setSubmitError(message);
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <Gavel className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Đăng ký</h1>
          <p className="text-gray-500 mt-1">Tạo tài khoản AuctionHub</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              {...register('email', {
                setValueAs: (value: string) => value.trim(),
              })}
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              disabled={isRegistering}
              className={`${inputClassName} ${errors.email ? 'border-red-400 focus:ring-red-500' : 'border-gray-300'}`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              {...register('username', {
                setValueAs: (value: string) => value.trim(),
              })}
              id="username"
              type="text"
              placeholder="username"
              autoComplete="username"
              aria-invalid={Boolean(errors.username)}
              disabled={isRegistering}
              className={`${inputClassName} ${errors.username ? 'border-red-400 focus:ring-red-500' : 'border-gray-300'}`}
            />
            {errors.username && (
              <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
            </label>
            <input
              {...register('password')}
              id="password"
              type="password"
              placeholder="Tối thiểu 8 ký tự"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              disabled={isRegistering}
              className={`${inputClassName} ${errors.password ? 'border-red-400 focus:ring-red-500' : 'border-gray-300'}`}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {submitError && <p className="text-red-500 text-sm">{submitError}</p>}

          <button
            type="submit"
            disabled={isRegistering}
            className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRegistering ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
