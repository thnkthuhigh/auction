import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import type { RegisterInput, LoginInput } from './auth.schema';

const SALT_ROUNDS = 12;
const DUMMY_PASSWORD_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO5I7iV6czS4QhIwTZYBFvTo95z0yn7G6';

function requireEnv(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const value = process.env[name];
  if (!value) {
    throw new AppError(`${name} is not configured`, 500);
  }
  return value;
}

function generateTokens(userId: string) {
  const accessExpiresIn =
    (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn'] | undefined) ?? '15m';
  const refreshExpiresIn =
    (process.env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'] | undefined) ?? '7d';

  const accessToken = jwt.sign({ userId }, requireEnv('JWT_SECRET'), {
    expiresIn: accessExpiresIn,
  });
  const refreshToken = jwt.sign({ userId }, requireEnv('JWT_REFRESH_SECRET'), {
    expiresIn: refreshExpiresIn,
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
  const normalizedEmail = input.email.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: 'insensitive',
      },
    },
  });

  const passwordHash = user?.password ?? DUMMY_PASSWORD_HASH;
  const isValidPassword = await bcrypt.compare(input.password, passwordHash);

  if (!user || !isValidPassword) {
    throw new AppError('Email hoac mat khau khong dung', 401);
  }

  const { password: _pw, ...safeUser } = user;
  const tokens = generateTokens(user.id);

  return {
    user: { ...safeUser, balance: Number(safeUser.balance) },
    tokens,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  try {
    const decoded = jwt.verify(refreshToken, requireEnv('JWT_REFRESH_SECRET')) as {
      userId: string;
    };
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
