import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auctionService } from '@/services/auction.service';
import { useAuctionSocket } from '@/hooks/useAuctionSocket';
import { useAuctionStore } from '@/store/auction.store';
import { useAuthStore } from '@/store/auth.store';
import AuctionTimer from '@/components/auction/AuctionTimer';
import BidForm from '@/components/auction/BidForm';
import BidHistory from '@/components/auction/BidHistory';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Tag, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useEffect } from 'react';

/**
 * TV5 phụ trách trang này
 */
export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const { liveBids, setActiveAuction, activeAuction, resetAuction } = useAuctionStore();
  const { placeBid } = useAuctionSocket(id);

  const { data: auction, isLoading } = useQuery({
    queryKey: ['auction', id],
    queryFn: () => auctionService.getAuctionById(id!),
    enabled: !!id,
  });

  const { data: bidsData } = useQuery({
    queryKey: ['bids', id],
    queryFn: () => auctionService.getBids(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (auction) setActiveAuction(auction);
    return () => resetAuction();
  }, [auction, setActiveAuction, resetAuction]);

  if (isLoading) {
    return (
      <div className="flex justify-center mt-20">
        <LoadingSpinner size="lg" text="Đang tải..." />
      </div>
    );
  }

  if (!auction) {
    return <div className="text-center mt-20 text-gray-500">Không tìm thấy đấu giá</div>;
  }

  const displayAuction = activeAuction ?? auction;
  const allBids = liveBids.length > 0 ? liveBids : (bidsData?.data ?? []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {auction.imageUrl ? (
              <img
                src={auction.imageUrl}
                alt={auction.title}
                className="w-full aspect-video object-cover"
              />
            ) : (
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                <Tag className="h-16 w-16 text-gray-300" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold text-gray-900">{auction.title}</h1>
              <span className="shrink-0 text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                {auction.categoryName}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Người bán: <strong className="text-gray-700 ml-1">{auction.sellerUsername}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Bắt đầu:{' '}
                {format(new Date(auction.startTime), 'HH:mm dd/MM/yyyy', {
                  locale: vi,
                })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-red-400" />
                Kết thúc:{' '}
                {format(new Date(auction.endTime), 'HH:mm dd/MM/yyyy', {
                  locale: vi,
                })}
              </span>
            </div>

            <p className="text-gray-700 leading-relaxed">{auction.description}</p>
          </div>

          {/* Bid History */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Lịch sử đặt giá ({allBids.length})</h2>
            <BidHistory bids={allBids} currentUserId={user?.id} />
          </div>
        </div>

        {/* Right: Bidding panel */}
        <div className="space-y-4">
          <AuctionTimer endTime={auction.endTime} status={displayAuction.status} />

          {isAuthenticated && auction.sellerId !== user?.id ? (
            <BidForm auction={displayAuction} onPlaceBid={placeBid} />
          ) : !isAuthenticated ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center text-sm text-yellow-700">
              Vui lòng{' '}
              <a href="/login" className="font-semibold underline">
                đăng nhập
              </a>{' '}
              để đặt giá
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-sm text-gray-500">
              Đây là đấu giá của bạn
            </div>
          )}

          {/* Winner */}
          {auction.status === 'ENDED' && auction.winnerUsername && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-green-700 font-semibold">
                🏆 Người thắng: {auction.winnerUsername}
              </p>
              <p className="text-green-600 font-bold text-lg">
                {displayAuction.currentPrice.toLocaleString('vi-VN')} ₫
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
