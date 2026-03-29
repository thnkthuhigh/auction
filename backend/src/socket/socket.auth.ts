import { type Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@auction/shared';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

export async function socketAuthMiddleware(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  next: (err?: Error) => void,
) {
  const token =
    socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

  if (!token) {
    socket.data.isAuthenticated = false;
    socket.data.username = 'guest';
    return next();
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      userId: string;
    };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, isActive: true },
    });

    if (!user) return next(new Error('User not found'));
    if (!user.isActive) return next(new Error('Account is locked'));

    socket.data.isAuthenticated = true;
    socket.data.userId = user.id;
    socket.data.username = user.username;
    next();
  } catch {
    socket.data.isAuthenticated = false;
    socket.data.username = 'guest';
    next();
  }
}
