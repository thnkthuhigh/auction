import type { Bid } from './bid.types';
import type { Auction } from './auction.types';

// Client -> Server
export interface ClientToServerEvents {
  'auction:join': (payload: { auctionId: string }) => void;
  'auction:leave': (payload: { auctionId: string }) => void;
  'bid:place': (payload: { auctionId: string; amount: number }) => void;
}

// Server -> Client
export interface ServerToClientEvents {
  'bid:new': (payload: { bid: Bid; currentPrice: number; totalBids: number }) => void;
  'auction:snapshot': (payload: {
    auctionId: string;
    currentPrice: number;
    totalBids: number;
    bids: Bid[];
  }) => void;
  'auction:viewers': (payload: { auctionId: string; viewers: number }) => void;
  'auction:started': (payload: { auctionId: string; endsAt: string }) => void;
  'auction:ended': (payload: {
    auctionId: string;
    winner?: { id: string; username: string };
    finalPrice: number;
  }) => void;
  'auction:updated': (payload: { auction: Partial<Auction> }) => void;
  'user:outbid': (payload: { auctionId: string; newPrice: number; newBidder: string }) => void;
  error: (payload: { message: string }) => void;
}

// Inter-server events (Socket.IO adapter)
export interface InterServerEvents {
  ping: () => void;
}

// Socket data attached per socket
export interface SocketData {
  userId: string;
  username: string;
}
