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

export function registerAuctionHandlers(io: IO, socket: AppSocket) {
  socket.on('auction:join', async ({ auctionId }) => {
    if (!auctionId?.trim()) {
      socket.emit('error', { message: 'Invalid auction id' });
      return;
    }

    const room = `auction:${auctionId}`;
    void socket.join(room);

    const roomSize = io.sockets.adapter.rooms.get(room)?.size ?? 0;
    io.to(room).emit('auction:viewers', { auctionId, viewers: roomSize });

    try {
      const snapshot = await getBidRealtimeSnapshot(auctionId);
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
        viewers: roomSize,
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
    const roomSize = io.sockets.adapter.rooms.get(room)?.size ?? 0;
    io.to(room).emit('auction:viewers', { auctionId, viewers: roomSize });

    logger.debug(
      'Auction room left',
      {
        auctionId,
        room,
        viewers: roomSize,
        userId: socket.data.userId,
        username: socket.data.username,
      },
      'socket',
    );
  });
}
