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
    logger.info(
      'Socket connected',
      {
        socketId: socket.id,
        userId: socket.data.userId,
        username: socket.data.username,
        isAuthenticated: socket.data.isAuthenticated,
      },
      'socket',
    );

    if (socket.data.isAuthenticated && socket.data.userId) {
      socket.join(`user:${socket.data.userId}`);
    }

    registerAuctionHandlers(io, socket);
    registerBidHandlers(io, socket);

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (!room.startsWith('auction:')) {
          continue;
        }

        const auctionId = room.slice('auction:'.length);
        const roomSize = io.sockets.adapter.rooms.get(room)?.size ?? 1;
        const viewers = Math.max(0, roomSize - 1);
        io.to(room).emit('auction:viewers', { auctionId, viewers });
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(
        'Socket disconnected',
        {
          socketId: socket.id,
          reason,
        },
        'socket',
      );
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
