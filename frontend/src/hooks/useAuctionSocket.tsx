import { useEffect, useRef } from 'react';
import { connectSocket } from '@/services/socket.service';
import { useAuctionStore } from '@/store/auction.store';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import type { Auction, Bid } from '@auction/shared';
import { shallow } from 'zustand/shallow';

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
  status: Auction['status'];
  endsAt: string;
  serverTime: string;
}

interface AuctionUpdatedPayload {
  auction: Partial<Auction> & {
    id?: string;
  };
}

interface AuctionViewersPayload {
  auctionId: string;
  viewers: number;
}

interface LegacyBidEventSocket {
  on: (event: 'new_bid', listener: (payload: BidRealtimePayload) => void) => void;
  off: (event: 'new_bid', listener: (payload: BidRealtimePayload) => void) => void;
}

const NETWORK_TOAST_ID = 'auction-network-status';

export function useAuctionSocket(auctionId: string | undefined, initialLeaderBidderId?: string) {
  const { user } = useAuthStore();
  const {
    applyRealtimeBid,
    applySnapshot,
    setViewersCount,
    setServerTimeOffsetMs,
    updateAuctionRealtimeStatus,
  } = useAuctionStore(
    (state) => ({
      applyRealtimeBid: state.applyRealtimeBid,
      applySnapshot: state.applySnapshot,
      setViewersCount: state.setViewersCount,
      setServerTimeOffsetMs: state.setServerTimeOffsetMs,
      updateAuctionRealtimeStatus: state.updateAuctionRealtimeStatus,
    }),
    shallow,
  );
  const previousLeaderBidderIdRef = useRef<string | undefined>(initialLeaderBidderId);

  useEffect(() => {
    previousLeaderBidderIdRef.current = initialLeaderBidderId;
  }, [auctionId, initialLeaderBidderId]);

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
      applyRealtimeBid({ bid, currentPrice, totalBids });
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

      applySnapshot({
        bids,
        currentPrice,
        totalBids,
        status,
        endsAt,
      });
      const topBid = bids.reduce<Bid | null>(
        (leader, current) => (!leader || current.amount > leader.amount ? current : leader),
        null,
      );
      previousLeaderBidderIdRef.current = topBid?.bidderId;

      const offsetMs = new Date(serverTime).getTime() - Date.now();
      if (Number.isFinite(offsetMs)) {
        setServerTimeOffsetMs(offsetMs);
      }
    };

    const handleAuctionUpdated = ({ auction }: AuctionUpdatedPayload) => {
      if (!auction.id || auction.id !== auctionId || !auction.status) return;

      updateAuctionRealtimeStatus({
        status: auction.status,
        endTime: auction.endTime,
        currentPrice: typeof auction.currentPrice === 'number' ? auction.currentPrice : undefined,
      });

      if (auction.status === 'SUSPENDED') {
        toast.error('Phiên đã bị tạm dừng bởi quản trị viên.');
      } else if (auction.status === 'CANCELLED') {
        toast.error('Phiên đã bị hủy bởi quản trị viên.');
      }
    };

    const handleViewers = ({ auctionId: payloadAuctionId, viewers }: AuctionViewersPayload) => {
      if (payloadAuctionId !== auctionId) return;
      setViewersCount(viewers);
    };

    const onConnect = () => {
      toast.dismiss(NETWORK_TOAST_ID);
      socket.emit('auction:join', { auctionId });
    };

    const onDisconnect = () => {
      toast.error('Đang mất kết nối, hệ thống đang thử tải lại...', {
        id: NETWORK_TOAST_ID,
        duration: 4000,
      });
    };

    const onConnectError = (error: Error) => {
      toast.error(error.message || 'Không kết nối được realtime', {
        id: NETWORK_TOAST_ID,
      });
    };

    if (socket.connected) {
      onConnect();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('auction:snapshot', handleSnapshot);
    socket.on('auction:updated', handleAuctionUpdated);
    socket.on('auction:viewers', handleViewers);
    socket.on('bid:new', handleNewBidEvent);
    legacySocket.on('new_bid', handleNewBidEvent);

    socket.on('auction:started', ({ endsAt }) => {
      updateAuctionRealtimeStatus({ status: 'ACTIVE', endTime: endsAt });
      toast.success(
        `Đấu giá đã bắt đầu. Kết thúc lúc ${new Date(endsAt).toLocaleTimeString('vi-VN')}`,
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
            `Chúc mừng! Bạn đã thắng với giá ${finalPrice.toLocaleString('vi-VN')} VNĐ`,
          );
        } else {
          toast(
            `Đấu giá kết thúc. Người thắng: ${winner.username} - ${finalPrice.toLocaleString(
              'vi-VN',
            )} VNĐ`,
          );
        }
      } else {
        toast('Đấu giá kết thúc và không có lượt đặt giá nào.');
      }
    });

    socket.on('user:outbid', ({ newPrice, newBidder }) => {
      toast.custom(
        (t) => (
          <div className="max-w-sm rounded-xl border border-[#E7B8C1] bg-white p-3 shadow-lg">
            <p className="text-sm font-medium text-gray-900">
              {newBidder} đặt {newPrice.toLocaleString('vi-VN')} VNĐ — Bạn đã bị vượt giá!
            </p>
            <button
              type="button"
              className="mt-2 text-sm font-semibold text-[#7A1F2B] hover:text-[#611521]"
              onClick={() => {
                toast.dismiss(t.id);
                scrollToBidInput();
              }}
            >
              Đặt giá ngay
            </button>
          </div>
        ),
        { id: 'user-outbid', duration: 5000 },
      );
    });

    socket.on('error', ({ message }) => {
      toast.error(message);
    });

    return () => {
      socket.emit('auction:leave', { auctionId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('auction:snapshot', handleSnapshot);
      socket.off('auction:updated', handleAuctionUpdated);
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
    applyRealtimeBid,
    applySnapshot,
    setViewersCount,
    setServerTimeOffsetMs,
    updateAuctionRealtimeStatus,
  ]);

  const placeBid = (amount: number, clientRequestId?: string) => {
    if (!auctionId) return;
    const socket = connectSocket();
    socket.emit('bid:place', { auctionId, amount, clientRequestId });
  };

  return { placeBid };
}
