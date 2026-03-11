import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '@/services/socket.service';
import { useAuctionStore } from '@/store/auction.store';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import type { Bid } from '@auction/shared';

/**
 * Hook quản lý Socket.IO cho phòng đấu giá
 * TV5 phụ trách integration này
 */
export function useAuctionSocket(auctionId: string | undefined) {
  const { user } = useAuthStore();
  const { addLiveBid, updateAuctionPrice } = useAuctionStore();
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!auctionId) return;

    const socket = connectSocket();

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

    socket.on('bid:new', ({ bid, currentPrice, totalBids }) => {
      addLiveBid(bid as Bid);
      updateAuctionPrice(currentPrice, totalBids);
    });

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
      socket.off('bid:new');
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
