import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import logoSrc from '@/assets/auctionhub-logo.svg';
import type { ApiResponse, RegisterDTO } from '@auction/shared';
import type { AxiosError } from 'axios';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  username: z
    .string()
    .min(3, 'Tên đăng nhập tối thiểu 3 ký tự')
    .max(20, 'Tên đăng nhập tối đa 20 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Chỉ chứa chữ, số và dấu gạch dưới'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});

export default function RegisterPage() {
  const { registerAsync, isRegistering } = useAuth();
  const [submitError, setSubmitError] = useState('');
  const inputClassName =
    'w-full rounded-xl border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#CB5C72] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500';

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FFF3F5] to-white px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#E7B8C1] bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <img src={logoSrc} alt="AuctionHub" className="h-12 w-12 rounded-xl shadow-sm" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Đăng ký</h1>
          <p className="mt-1 text-gray-500">Tạo tài khoản AuctionHub Luxury</p>
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
              disabled={isRegistering}
              className={`${inputClassName} ${errors.email ? 'border-red-400 focus:ring-red-500' : 'border-gray-300'}`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-700">
              Tên đăng nhập
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
              <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
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
              <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

          <button
            type="submit"
            disabled={isRegistering}
            className="w-full rounded-xl bg-[#7A1F2B] py-2.5 font-semibold text-white transition-colors hover:bg-[#611521] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRegistering ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-medium text-[#7A1F2B] hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
