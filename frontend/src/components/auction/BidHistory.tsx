import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';
import type { Bid } from '@auction/shared';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

interface Props {
  bids: Bid[];
  currentUserId?: string;
  winnerBidId?: string;
}

/**
 * TV5 phụ trách component này
 */
export default function BidHistory({ bids, currentUserId, winnerBidId }: Props) {
  const PAGE_SIZE = 5;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [maxHeight, setMaxHeight] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  const auctionKey = bids[0]?.auctionId;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [auctionKey]);

  const visibleBids = useMemo(() => bids.slice(0, visibleCount), [bids, visibleCount]);
  const canLoadMore = visibleCount < bids.length;

  useLayoutEffect(() => {
    if (!listRef.current) return;
    setMaxHeight(listRef.current.scrollHeight);
  }, [visibleBids]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, bids.length));
  };

  if (bids.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <TrendingUp className="h-8 w-8 mx-auto mb-2" />
        <p className="text-sm">Chưa có lượt đặt giá nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="space-y-2 overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: `${maxHeight}px` }}
        ref={listRef}
      >
        {visibleBids.map((bid, index) => (
          <div
            key={bid.id}
            className={`flex items-center justify-between p-3 rounded-lg ${
              index === 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
            } ${bid.bidderId === currentUserId ? 'ring-1 ring-inset ring-blue-400' : ''}`}
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
                <span className="relative inline-flex cursor-help group">
                  {formatDistanceToNow(new Date(bid.createdAt), {
                    addSuffix: true,
                    locale: vi,
                  })}
                  <span className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    {format(new Date(bid.createdAt), 'dd/MM/yyyy - HH:mm:ss')}
                  </span>
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {canLoadMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          className="mx-auto block text-sm text-blue-600 hover:underline"
        >
          Xem thêm
        </button>
      )}
    </div>
  );
}
