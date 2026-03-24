import { useEffect, useRef } from 'react';
import { connectSocket, getSocket } from '@/services/socket.service';
import { useAuctionStore } from '@/store/auction.store';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import type { Bid } from '@auction/shared';

interface BidRealtimePayload {
  bid: Bid;
  currentPrice: number;
  totalBids: number;
}

interface LegacyBidEventSocket {
  on: (event: 'new_bid', listener: (payload: BidRealtimePayload) => void) => void;
  off: (event: 'new_bid', listener: (payload: BidRealtimePayload) => void) => void;
}

/**
 * Hook quản lý Socket.IO cho phòng đấu giá
 * TV5 phụ trách integration này
 */
export function useAuctionSocket(auctionId: string | undefined, initialLeaderBidderId?: string) {
  const { user } = useAuthStore();
  const { addLiveBid, updateAuctionPrice } = useAuctionStore();
  const joinedRef = useRef(false);
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
                ⚠️ Bạn đã bị vượt mức giá! Hãy đặt giá mới để tiếp tục dẫn đầu.
              </p>
              <button
                type="button"
                className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                onClick={() => {
                  toast.dismiss(t.id);
                  scrollToBidInput();
                }}
              >
                Đặt giá ngay
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

    const onConnect = () => {
      if (!joinedRef.current) {
        socket.emit('auction:join', { auctionId });
        joinedRef.current = true;
      }
    };

    if (socket.connected) {
      onConnect();
    } else {
      socket.on('connect', onConnect);
    }

    socket.on('bid:new', handleNewBidEvent);
    legacySocket.on('new_bid', handleNewBidEvent);

    socket.on('auction:started', ({ endsAt }) => {
      toast.success(
        `🏁 Đấu giá đã bắt đầu! Kết thúc lúc ${new Date(endsAt).toLocaleTimeString('vi-VN')}`,
      );
    });

    socket.on('auction:ended', ({ winner, finalPrice }) => {
      if (winner) {
        if (winner.id === user?.id) {
          toast.success(
            `🎉 Chúc mừng! Bạn đã thắng với giá ${finalPrice.toLocaleString('vi-VN')} VNĐ`,
          );
        } else {
          toast(
            `🏆 Đấu giá kết thúc! Người thắng: ${winner.username} – ${finalPrice.toLocaleString('vi-VN')} VNĐ`,
          );
        }
      } else {
        toast('⚠️ Đấu giá kết thúc mà không có lượt đặt giá nào.');
      }
    });

    socket.on('user:outbid', ({ newPrice, newBidder }) => {
      toast(`📢 Bạn bị vượt giá! ${newBidder} đặt ${newPrice.toLocaleString('vi-VN')} VNĐ`, {
        icon: '⬆️',
      });
    });

    socket.on('error', ({ message }) => {
      toast.error(message);
    });

    return () => {
      socket.emit('auction:leave', { auctionId });
      socket.off('connect', onConnect);
      socket.off('bid:new', handleNewBidEvent);
      legacySocket.off('new_bid', handleNewBidEvent);
      socket.off('auction:started');
      socket.off('auction:ended');
      socket.off('user:outbid');
      socket.off('error');
      joinedRef.current = false;
    };
  }, [auctionId, user?.id, addLiveBid, updateAuctionPrice]);

  const placeBid = (amount: number) => {
    if (!auctionId) return;
    const socket = getSocket();
    socket.emit('bid:place', { auctionId, amount });
  };

  return { placeBid };
}
