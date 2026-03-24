import { Link } from 'react-router-dom';
import { Clock, Tag, TrendingUp, Users } from 'lucide-react';
import { useCountdown } from '@/hooks/useCountdown';
import type { Auction } from '@auction/shared';

interface Props {
  auction: Auction;
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  ENDED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusLabels = {
  PENDING: 'Chờ duyệt',
  ACTIVE: 'Đang đấu giá',
  ENDED: 'Đã kết thúc',
  CANCELLED: 'Đã huỷ',
};

/**
 * TV5 phụ trách component này
 */
export default function AuctionCard({ auction }: Props) {
  const countdown = useCountdown(auction.status === 'ACTIVE' ? auction.endTime : undefined);

  return (
    <Link to={`/auctions/${auction.id}`} className="group block">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all duration-200">
        {/* Image */}
        <div className="aspect-video bg-gray-100 overflow-hidden">
          {auction.imageUrl ? (
            <img
              src={auction.imageUrl}
              alt={auction.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Tag className="h-12 w-12" />
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* Status & Category */}
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[auction.status]}`}
            >
              {statusLabels[auction.status]}
            </span>
            <span className="text-xs text-gray-500">{auction.categoryName}</span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {auction.title}
          </h3>

          {/* Price */}
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-lg font-bold text-blue-600">
              {auction.currentPrice.toLocaleString('vi-VN')} ₫
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {auction.totalBids} lượt
            </span>

            {auction.status === 'ACTIVE' && !countdown.isExpired && (
              <span
                className={`flex items-center gap-1 font-mono font-medium ${countdown.isUrgent ? 'text-red-600' : 'text-gray-600'}`}
              >
                <Clock className="h-3.5 w-3.5" />
                {countdown.display}
              </span>
            )}
            {auction.status === 'PENDING' && <span className="text-yellow-600">Chưa bắt đầu</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
