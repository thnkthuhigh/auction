import { type Server, type Socket } from 'socket.io';
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
    if (!socket.data.isAuthenticated || !socket.data.userId) {
      socket.emit('error', { message: 'Vui long dang nhap de dat gia' });
      return;
    }

    if (
      typeof auctionId !== 'string' ||
      !auctionId.trim() ||
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      socket.emit('error', { message: 'Dữ liệu đặt giá không hợp lệ' });
      return;
    }

    try {
      await placeBid(socket.data.userId, auctionId, amount);
      // placeBid service already emits 'bid:new' to the room
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to place bid';
      socket.emit('error', { message });
    }
  });
}
