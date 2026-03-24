import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Gavel } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { ApiResponse, LoginDTO } from '@auction/shared';
import type { AxiosError } from 'axios';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

/**
 * TV4 phụ trách trang này
 */
export default function LoginPage() {
  const { loginAsync, isLoggingIn } = useAuth();
  const [submitError, setSubmitError] = useState('');
  const inputClassName =
    'w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<LoginDTO>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    setSubmitError('');
    clearErrors(['email', 'password']);

    try {
      await loginAsync({
        email: data.email.trim(),
        password: data.password,
      });
    } catch (error) {
      const apiError = error as AxiosError<ApiResponse>;
      const message = apiError.response?.data?.message || 'Đăng nhập thất bại';
      const fieldErrors = apiError.response?.data?.errors;
      const emailError = fieldErrors?.email?.[0];
      const passwordError = fieldErrors?.password?.[0];

      if (emailError) {
        setError('email', { type: 'server', message: emailError });
      }

      if (passwordError) {
        setError('password', { type: 'server', message: passwordError });
      }

      if (emailError || passwordError) {
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
          <h1 className="text-2xl font-bold text-gray-900">Đăng nhập</h1>
          <p className="text-gray-500 mt-1">Chào mừng trở lại AuctionHub</p>
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
              disabled={isLoggingIn}
              className={`${inputClassName} ${errors.email ? 'border-red-400 focus:ring-red-500' : 'border-gray-300'}`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
            </label>
            <input
              {...register('password')}
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              disabled={isLoggingIn}
              className={`${inputClassName} ${errors.password ? 'border-red-400 focus:ring-red-500' : 'border-gray-300'}`}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {submitError && <p className="text-red-500 text-sm">{submitError}</p>}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
          <p className="font-medium">Tài khoản demo:</p>
          <p>📧 seller@auction.com / user123456</p>
          <p>📧 buyer@auction.com / user123456</p>
        </div>

        <p className="text-center text-sm text-gray-500">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-blue-600 font-medium hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
