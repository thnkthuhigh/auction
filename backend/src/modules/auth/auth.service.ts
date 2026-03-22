import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import type { RegisterInput, LoginInput } from './auth.schema';

const SALT_ROUNDS = 12;
const DUMMY_PASSWORD_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO5I7iV6czS4QhIwTZYBFvTo95z0yn7G6';

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

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.email }, { username: input.username }],
    },
  });

  if (existing) {
    if (existing.email === input.email) throw new AppError('Email đã được sử dụng', 409);
    throw new AppError('Username đã được sử dụng', 409);
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
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
  return { user: { ...user, balance: Number(user.balance) }, tokens };
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
    throw new AppError('Email hoặc mật khẩu không đúng', 401);
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
