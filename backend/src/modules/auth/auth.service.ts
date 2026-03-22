import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import type { RegisterInput, LoginInput } from './auth.schema';

const SALT_ROUNDS = 12;

function generateTokens(userId: string) {
  const accessExpiry = (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];
  const refreshExpiry = (process.env.JWT_REFRESH_EXPIRES_IN ||
    '7d') as jwt.SignOptions['expiresIn'];

  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: accessExpiry,
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: refreshExpiry,
  });
  return { accessToken, refreshToken };
}

function toPublicUser(user: {
  id: string;
  email: string;
  username: string;
  avatar: string | null;
  balance: Prisma.Decimal;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
}) {
  return {
    ...user,
    balance: Number(user.balance),
  };
}

function isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function register(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
    select: {
      email: true,
      username: true,
    },
  });

  if (existing) {
    if (existing.email === email) throw new AppError('Email da duoc su dung', 409);
    throw new AppError('Username da duoc su dung', 409);
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        balance: true,
        role: true,
        createdAt: true,
      },
    });

    const tokens = generateTokens(user.id);
    return { user: toPublicUser(user), tokens };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const target = Array.isArray(error.meta?.target) ? error.meta.target : [];
      if (target.includes('email')) {
        throw new AppError('Email da duoc su dung', 409);
      }
      if (target.includes('username')) {
        throw new AppError('Username da duoc su dung', 409);
      }
      throw new AppError('Tai khoan da ton tai', 409);
    }

    throw error;
  }
}

export async function login(input: LoginInput) {
  const email = input.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) throw new AppError('Email hoac mat khau khong dung', 401);

  const isValid = await bcrypt.compare(input.password, user.password);
  if (!isValid) throw new AppError('Email hoac mat khau khong dung', 401);

  const { password: _pw, ...safeUser } = user;
  const tokens = generateTokens(user.id);

  return {
    user: { ...safeUser, balance: Number(safeUser.balance) },
    tokens,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    if (!user) throw new AppError('User not found', 401);
    const tokens = generateTokens(user.id);
    return tokens;
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }
}
