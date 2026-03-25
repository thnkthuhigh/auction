import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@auction/shared';
import { createAdapter } from '@socket.io/redis-adapter';
import { type Server as HttpServer } from 'http';
import Redis from 'ioredis';
import { Server as SocketIOServer } from 'socket.io';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { registerAuctionHandlers } from './handlers/auction.handler';
import { registerBidHandlers } from './handlers/bid.handler';
import { socketAuthMiddleware } from './socket.auth';

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function initSocket(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  const pubClient = redis;
  const subClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  io.adapter(createAdapter(pubClient, subClient));

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    logger.info('Socket connected', {
      socketId: socket.id,
      userId: socket.data.userId,
      username: socket.data.username,
    });

    socket.join(`user:${socket.data.userId}`);

    registerAuctionHandlers(io, socket);
    registerBidHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', {
        socketId: socket.id,
        reason,
      });
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
