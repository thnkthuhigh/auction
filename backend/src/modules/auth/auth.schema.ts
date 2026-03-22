import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Email khong hop le')
    .transform((value) => value.toLowerCase()),
  username: z
    .string()
    .trim()
    .min(3, 'Username toi thieu 3 ky tu')
    .max(20, 'Username toi da 20 ky tu')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username chi chua chu, so va dau gach duoi'),
  password: z.string().min(8, 'Mat khau toi thieu 8 ky tu'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Email khong hop le')
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Mat khau khong duoc trong'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
