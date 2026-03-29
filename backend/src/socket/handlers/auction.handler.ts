import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@auction/shared';
import { type Server, type Socket } from 'socket.io';
import { getBidRealtimeSnapshot } from '../../modules/bids/bid.service';
import { logger } from '../../utils/logger';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

function resolvePositiveInt(rawValue: string | undefined, fallback: number): number {
  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const VIEWER_BROADCAST_DEBOUNCE_MS = resolvePositiveInt(
  process.env.VIEWER_BROADCAST_DEBOUNCE_MS,
  250,
);
const JOIN_SNAPSHOT_BIDS_LIMIT = resolvePositiveInt(process.env.JOIN_SNAPSHOT_BIDS_LIMIT, 5);
const roomBroadcastTimers = new Map<string, NodeJS.Timeout>();

export function scheduleViewerBroadcast(io: IO, auctionId: string) {
  if (!auctionId.trim()) return;
  const room = `auction:${auctionId}`;

  if (roomBroadcastTimers.has(room)) return;

  const timer = setTimeout(() => {
    roomBroadcastTimers.delete(room);
    const roomSize = io.sockets.adapter.rooms.get(room)?.size ?? 0;
    io.to(room).emit('auction:viewers', { auctionId, viewers: roomSize });
  }, VIEWER_BROADCAST_DEBOUNCE_MS);

  roomBroadcastTimers.set(room, timer);
}

export function registerAuctionHandlers(io: IO, socket: AppSocket) {
  socket.on('auction:join', async ({ auctionId }) => {
    if (!auctionId?.trim()) {
      socket.emit('error', { message: 'Invalid auction id' });
      return;
    }

    const room = `auction:${auctionId}`;
    void socket.join(room);
    scheduleViewerBroadcast(io, auctionId);

    try {
      const snapshot = await getBidRealtimeSnapshot(auctionId, JOIN_SNAPSHOT_BIDS_LIMIT);
      socket.emit('auction:snapshot', snapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot load realtime snapshot';
      socket.emit('error', { message });
    }

    logger.debug(
      'Auction room joined',
      {
        auctionId,
        room,
        userId: socket.data.userId,
        username: socket.data.username,
      },
      'socket',
    );
  });

  socket.on('auction:leave', ({ auctionId }) => {
    if (!auctionId?.trim()) return;

    const room = `auction:${auctionId}`;
    void socket.leave(room);
    scheduleViewerBroadcast(io, auctionId);

    logger.debug(
      'Auction room left',
      {
        auctionId,
        room,
        userId: socket.data.userId,
        username: socket.data.username,
      },
      'socket',
    );
  });
}
