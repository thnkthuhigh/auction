import { type Server, type Socket } from 'socket.io';
import { getBidRealtimeSnapshot } from '../../modules/bids/bid.service';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@auction/shared';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerAuctionHandlers(io: IO, socket: AppSocket) {
  socket.on('auction:join', async ({ auctionId }) => {
    if (!auctionId?.trim()) {
      socket.emit('error', { message: 'Invalid auction id' });
      return;
    }

    const room = `auction:${auctionId}`;
    socket.join(room);

    const roomSize = io.sockets.adapter.rooms.get(room)?.size ?? 0;
    io.to(room).emit('auction:viewers', { auctionId, viewers: roomSize });

    try {
      const snapshot = await getBidRealtimeSnapshot(auctionId);
      socket.emit('auction:snapshot', snapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot load realtime snapshot';
      socket.emit('error', { message });
    }

    console.log(`User ${socket.data.username} joined ${room} (${roomSize} viewers)`);
  });

  socket.on('auction:leave', ({ auctionId }) => {
    if (!auctionId?.trim()) return;

    const room = `auction:${auctionId}`;
    socket.leave(room);
    const roomSize = io.sockets.adapter.rooms.get(room)?.size ?? 0;
    io.to(room).emit('auction:viewers', { auctionId, viewers: roomSize });

    console.log(`User ${socket.data.username} left ${room}`);
  });
}
