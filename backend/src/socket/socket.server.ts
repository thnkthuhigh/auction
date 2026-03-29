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
import { registerAuctionHandlers, scheduleViewerBroadcast } from './handlers/auction.handler';
import { registerBidHandlers } from './handlers/bid.handler';
import { socketAuthMiddleware } from './socket.auth';

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

function resolvePositiveInt(rawValue: string | undefined, fallback: number): number {
  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveBoolean(rawValue: string | undefined, fallback: boolean): boolean {
  if (!rawValue) return fallback;
  return rawValue.trim().toLowerCase() === 'true';
}

function resolveSocketTransports(): Array<'websocket' | 'polling'> {
  const raw = process.env.SOCKET_TRANSPORTS || 'websocket';
  const items = raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is 'websocket' | 'polling' => item === 'websocket' || item === 'polling');

  return items.length > 0 ? items : ['websocket'];
}

function shouldEnableRedisAdapter(): boolean {
  const configuredWorkers = resolvePositiveInt(process.env.CLUSTER_WORKERS, 1);
  if (configuredWorkers > 1) {
    return true;
  }

  const raw = process.env.SOCKET_REDIS_ADAPTER_ENABLED;
  if (!raw) return false;
  return raw.trim().toLowerCase() === 'true';
}

export function initSocket(httpServer: HttpServer) {
  const transports = resolveSocketTransports();
  const perMessageDeflate = resolveBoolean(process.env.SOCKET_PER_MESSAGE_DEFLATE, false);

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    transports,
    perMessageDeflate,
    httpCompression: perMessageDeflate,
  });

  if (shouldEnableRedisAdapter()) {
    const pubClient = redis;
    const subClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter enabled', {
      transports,
      perMessageDeflate,
    });
  } else {
    logger.info('Socket.IO Redis adapter disabled (single-node mode)', {
      transports,
      perMessageDeflate,
    });
  }

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    logger.debug(
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
      void socket.join(`user:${socket.data.userId}`);
    }

    registerAuctionHandlers(io, socket);
    registerBidHandlers(io, socket);

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (!room.startsWith('auction:')) {
          continue;
        }

        const auctionId = room.slice('auction:'.length);
        scheduleViewerBroadcast(io, auctionId);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.debug(
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
