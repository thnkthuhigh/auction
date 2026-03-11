import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from '../config/redis';
import Redis from 'ioredis';
import { socketAuthMiddleware } from './socket.auth';
import { registerAuctionHandlers } from './handlers/auction.handler';
import { registerBidHandlers } from './handlers/bid.handler';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@auction/shared';

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function initSocket(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Redis adapter for horizontal scaling
  const pubClient = redis;
  const subClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  io.adapter(createAdapter(pubClient, subClient));

  // Auth middleware
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (user: ${socket.data.username})`);

    // Join personal room for user-specific events
    socket.join(`user:${socket.data.userId}`);

    registerAuctionHandlers(io, socket);
    registerBidHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} – ${reason}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
