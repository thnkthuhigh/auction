import { Server, Socket } from 'socket.io';
import { placeBid } from '../../modules/bids/bid.service';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@auction/shared';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerBidHandlers(_io: IO, socket: AppSocket) {
  socket.on('bid:place', async ({ auctionId, amount }) => {
    try {
      await placeBid(socket.data.userId, auctionId, amount);
      // placeBid service already emits 'bid:new' to the room
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to place bid';
      socket.emit('error', { message });
    }
  });
}
