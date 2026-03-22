import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  username: z
    .string()
    .min(3, 'Username tối thiểu 3 ký tự')
    .max(20, 'Username tối đa 20 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username chỉ chứa chữ, số và dấu gạch dưới'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
  password: z.string().trim().min(1, 'Mật khẩu không được trống'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
