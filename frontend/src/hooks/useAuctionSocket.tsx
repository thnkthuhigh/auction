import { useEffect, useRef } from 'react';
import { connectSocket } from '@/services/socket.service';
import { useAuctionStore } from '@/store/auction.store';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import type { Bid } from '@auction/shared';

interface BidRealtimePayload {
  bid: Bid;
  currentPrice: number;
  totalBids: number;
}

interface AuctionSnapshotPayload {
  auctionId: string;
  currentPrice: number;
  totalBids: number;
  bids: Bid[];
  status: 'PENDING' | 'REVIEW' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  endsAt: string;
  serverTime: string;
}

interface AuctionViewersPayload {
  auctionId: string;
  viewers: number;
}

interface LegacyBidEventSocket {
  on: (event: 'new_bid', listener: (payload: BidRealtimePayload) => void) => void;
  off: (event: 'new_bid', listener: (payload: BidRealtimePayload) => void) => void;
}

/**
 * Manage realtime sync for auction room:
 * - new bid updates
 * - initial snapshot when joining room
 * - auto rejoin after reconnect
 */
export function useAuctionSocket(auctionId: string | undefined, initialLeaderBidderId?: string) {
  const { user } = useAuthStore();
  const {
    addLiveBid,
    setLiveBids,
    updateAuctionPrice,
    setViewersCount,
    setServerTimeOffsetMs,
    updateAuctionRealtimeStatus,
  } = useAuctionStore();
  const previousLeaderBidderIdRef = useRef<string | undefined>(initialLeaderBidderId);

  useEffect(() => {
    previousLeaderBidderIdRef.current = initialLeaderBidderId;
  }, [initialLeaderBidderId]);

  useEffect(() => {
    if (!auctionId) return;

    const socket = connectSocket();
    const legacySocket = socket as unknown as LegacyBidEventSocket;

    const scrollToBidInput = () => {
      const bidInput = document.getElementById('bid-amount-input') as HTMLInputElement | null;
      if (!bidInput) return;
      bidInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => bidInput.focus(), 250);
    };

    const handleNewBidEvent = ({ bid, currentPrice, totalBids }: BidRealtimePayload) => {
      const bidderIsNotCurrentUser = bid.bidderId !== user?.id;
      const currentUserWasLeading = previousLeaderBidderIdRef.current === user?.id;

      if (bidderIsNotCurrentUser && currentUserWasLeading) {
        toast.custom(
          (t) => (
            <div className="max-w-sm rounded-xl border border-orange-200 bg-white p-3 shadow-lg">
              <p className="text-sm font-medium text-gray-900">
                Ban da bi vuot muc gia. Hay dat gia moi de tiep tuc dan dau.
              </p>
              <button
                type="button"
                className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                onClick={() => {
                  toast.dismiss(t.id);
                  scrollToBidInput();
                }}
              >
                Dat gia ngay
              </button>
            </div>
          ),
          { duration: 5000 },
        );
      }

      addLiveBid(bid);
      updateAuctionPrice(currentPrice, totalBids);
      previousLeaderBidderIdRef.current = bid.bidderId;
    };

    const handleSnapshot = ({
      auctionId: payloadAuctionId,
      currentPrice,
      totalBids,
      bids,
      status,
      endsAt,
      serverTime,
    }: AuctionSnapshotPayload) => {
      if (payloadAuctionId !== auctionId) return;

      setLiveBids(bids);
      updateAuctionPrice(currentPrice, totalBids);
      updateAuctionRealtimeStatus({ status, endTime: endsAt });
      previousLeaderBidderIdRef.current = bids[0]?.bidderId;

      const offsetMs = new Date(serverTime).getTime() - Date.now();
      if (Number.isFinite(offsetMs)) {
        setServerTimeOffsetMs(offsetMs);
      }
    };

    const handleViewers = ({ auctionId: payloadAuctionId, viewers }: AuctionViewersPayload) => {
      if (payloadAuctionId !== auctionId) return;
      setViewersCount(viewers);
    };

    const onConnect = () => {
      socket.emit('auction:join', { auctionId });
    };

    const onConnectError = (error: Error) => {
      toast.error(error.message || 'Khong ket noi duoc realtime');
    };

    if (socket.connected) {
      onConnect();
    }

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('auction:snapshot', handleSnapshot);
    socket.on('auction:viewers', handleViewers);
    socket.on('bid:new', handleNewBidEvent);
    legacySocket.on('new_bid', handleNewBidEvent);

    socket.on('auction:started', ({ endsAt }) => {
      updateAuctionRealtimeStatus({ status: 'ACTIVE', endTime: endsAt });
      toast.success(
        `Dau gia da bat dau. Ket thuc luc ${new Date(endsAt).toLocaleTimeString('vi-VN')}`,
      );
    });

    socket.on('auction:ended', ({ winner, finalPrice }) => {
      updateAuctionRealtimeStatus({
        status: 'ENDED',
        winnerId: winner?.id ?? null,
        winnerUsername: winner?.username,
        currentPrice: finalPrice,
      });

      if (winner) {
        if (winner.id === user?.id) {
          toast.success(
            `Chuc mung! Ban da thang voi gia ${finalPrice.toLocaleString('vi-VN')} VND`,
          );
        } else {
          toast(
            `Dau gia ket thuc. Nguoi thang: ${winner.username} - ${finalPrice.toLocaleString('vi-VN')} VND`,
          );
        }
      } else {
        toast('Dau gia ket thuc va khong co luot dat gia nao.');
      }
    });

    socket.on('user:outbid', ({ newPrice, newBidder }) => {
      toast(`Ban bi vuot gia! ${newBidder} dat ${newPrice.toLocaleString('vi-VN')} VND`);
    });

    socket.on('error', ({ message }) => {
      toast.error(message);
    });

    return () => {
      socket.emit('auction:leave', { auctionId });
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('auction:snapshot', handleSnapshot);
      socket.off('auction:viewers', handleViewers);
      socket.off('bid:new', handleNewBidEvent);
      legacySocket.off('new_bid', handleNewBidEvent);
      socket.off('auction:started');
      socket.off('auction:ended');
      socket.off('user:outbid');
      socket.off('error');
      setViewersCount(0);
    };
  }, [
    auctionId,
    user?.id,
    addLiveBid,
    setLiveBids,
    updateAuctionPrice,
    setViewersCount,
    setServerTimeOffsetMs,
    updateAuctionRealtimeStatus,
  ]);

  const placeBid = (amount: number) => {
    if (!auctionId) return;
    const socket = connectSocket();
    socket.emit('bid:place', { auctionId, amount });
  };

  return { placeBid };
}
