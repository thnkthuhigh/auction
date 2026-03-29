import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import logoSrc from '@/assets/auctionhub-logo.svg';
import type { ApiResponse, LoginDTO } from '@auction/shared';
import type { AxiosError } from 'axios';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export default function LoginPage() {
  const { loginAsync, isLoggingIn } = useAuth();
  const [submitError, setSubmitError] = useState('');
  const inputClassName =
    'w-full rounded-xl border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#CB5C72] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500';

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

      if (emailError) setError('email', { type: 'server', message: emailError });
      if (passwordError) setError('password', { type: 'server', message: passwordError });
      if (emailError || passwordError) return;

      setSubmitError(message);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FFF3F5] to-white px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#E7B8C1] bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <img src={logoSrc} alt="AuctionHub" className="h-12 w-12 rounded-xl shadow-sm" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Đăng nhập</h1>
          <p className="mt-1 text-gray-500">Chào mừng trở lại AuctionHub Luxury</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
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
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
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
              <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full rounded-xl bg-[#7A1F2B] py-2.5 font-semibold text-white transition-colors hover:bg-[#611521] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="space-y-1 rounded-lg border border-[#F0D3D8] bg-[#FFF6F8] p-3 text-xs text-gray-600">
          <p className="font-semibold text-[#7A1F2B]">Tài khoản test:</p>
          <p>- admin@auction.com / admin123456</p>
          <p>- seller@auction.com / user123456</p>
          <p>- buyer@auction.com / user123456</p>
        </div>

        <p className="text-center text-sm text-gray-500">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-medium text-[#7A1F2B] hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
