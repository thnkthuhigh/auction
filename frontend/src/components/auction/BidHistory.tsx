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

function maskBidderName(name: string, isCurrentUser: boolean) {
  if (isCurrentUser) return `${name} (Bạn)`;
  const trimmed = name.trim();
  if (trimmed.length <= 2) return `${trimmed[0] ?? '*'}*`;
  return `${trimmed[0]}***${trimmed[trimmed.length - 1]}`;
}

export default function BidHistory({ bids, currentUserId, winnerBidId }: Props) {
  const PAGE_SIZE = 7;
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
      <div className="py-8 text-center text-gray-400">
        <TrendingUp className="mx-auto mb-2 h-8 w-8" />
        <p className="text-sm">Chưa có lượt đặt giá nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={listRef}
        className="space-y-2 overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {visibleBids.map((bid, index) => {
          const isCurrentUser = bid.bidderId === currentUserId;

          return (
            <div
              key={bid.id}
              className={`rounded-xl border p-3 ${
                index === 0 ? 'border-[#E7B8C1] bg-[#FFF1F3]' : 'border-slate-200 bg-slate-50'
              } ${isCurrentUser ? 'ring-1 ring-inset ring-[#CB5C72]' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {index === 0 && (
                    <span className="rounded bg-[#7A1F2B] px-1.5 py-0.5 text-xs font-medium text-white">
                      Cao nhất
                    </span>
                  )}
                  {winnerBidId === bid.id && (
                    <span className="rounded bg-amber-500 px-1.5 py-0.5 text-xs font-medium text-white">
                      Người thắng
                    </span>
                  )}
                  <span
                    className={`text-sm font-medium ${isCurrentUser ? 'text-[#7A1F2B]' : 'text-gray-800'}`}
                  >
                    {maskBidderName(bid.bidderUsername, isCurrentUser)}
                  </span>
                </div>

                <p className="text-sm font-bold text-[#7A1F2B]">
                  {bid.amount.toLocaleString('vi-VN')} ₫
                </p>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500">
                <span>{format(new Date(bid.createdAt), 'HH:mm:ss - dd/MM/yyyy')}</span>
                <span>
                  {formatDistanceToNow(new Date(bid.createdAt), {
                    addSuffix: true,
                    locale: vi,
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {canLoadMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          className="mx-auto block text-sm text-[#7A1F2B] hover:underline"
        >
          Xem thêm
        </button>
      )}
    </div>
  );
}
