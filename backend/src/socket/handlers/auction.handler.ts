import { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@auction/shared';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerAuctionHandlers(io: IO, socket: AppSocket) {
  socket.on('auction:join', ({ auctionId }) => {
    socket.join(`auction:${auctionId}`);
    const roomSize = io.sockets.adapter.rooms.get(`auction:${auctionId}`)?.size ?? 0;
    console.log(
      `👥 User ${socket.data.username} joined auction:${auctionId} (${roomSize} viewers)`,
    );
  });

  socket.on('auction:leave', ({ auctionId }) => {
    socket.leave(`auction:${auctionId}`);
    console.log(`👋 User ${socket.data.username} left auction:${auctionId}`);
  });
}
