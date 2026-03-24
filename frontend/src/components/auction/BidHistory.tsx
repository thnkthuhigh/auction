import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';
import type { Bid } from '@auction/shared';

interface Props {
  bids: Bid[];
  currentUserId?: string;
  winnerBidId?: string;
}

/**
 * TV5 phụ trách component này
 */
export default function BidHistory({ bids, currentUserId, winnerBidId }: Props) {
  if (bids.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <TrendingUp className="h-8 w-8 mx-auto mb-2" />
        <p className="text-sm">Chưa có lượt đặt giá nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {bids.map((bid, index) => (
        <div
          key={bid.id}
          className={`flex items-center justify-between p-3 rounded-lg ${
            index === 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
          } ${bid.bidderId === currentUserId ? 'ring-1 ring-blue-400' : ''}`}
        >
          <div className="flex items-center gap-2">
            {index === 0 && (
              <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">
                Cao nhất
              </span>
            )}
            {winnerBidId === bid.id && (
              <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded font-medium">
                Người thắng cuộc
              </span>
            )}
            <span
              className={`text-sm font-medium ${bid.bidderId === currentUserId ? 'text-blue-700' : 'text-gray-800'}`}
            >
              {bid.bidderUsername}
              {bid.bidderId === currentUserId && ' (Bạn)'}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-blue-600">
              {bid.amount.toLocaleString('vi-VN')} ₫
            </p>
            <p className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(bid.createdAt), {
                addSuffix: true,
                locale: vi,
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
