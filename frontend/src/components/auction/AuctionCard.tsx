import { Link } from 'react-router-dom';
import { CalendarClock, Clock3, Gavel, Tag, TrendingUp, UserRound } from 'lucide-react';
import { format } from 'date-fns';
import type { Auction } from '@auction/shared';
import { useCountdown } from '@/hooks/useCountdown';

type AuctionCardData = Auction & {
  seller?: {
    username?: string;
    avatar?: string | null;
  };
  category?: {
    name?: string;
  };
};

interface Props {
  auction: Auction;
}

const statusColors = {
  PENDING: 'bg-amber-100 text-amber-800',
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  ENDED: 'bg-slate-200 text-slate-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

const statusLabels = {
  PENDING: 'Sắp diễn ra',
  ACTIVE: 'Đang đấu giá',
  ENDED: 'Đã kết thúc',
  CANCELLED: 'Đã huỷ',
};

/**
 * TV5 phụ trách component này
 */
export default function AuctionCard({ auction }: Props) {
  const item = auction as AuctionCardData;
  const countdown = useCountdown(auction.status === 'ACTIVE' ? auction.endTime : undefined);
  const sellerName = item.sellerUsername || item.seller?.username || 'Người bán';
  const categoryName = item.categoryName || item.category?.name || 'Chưa phân loại';
  const footerLabel =
    auction.status === 'ACTIVE'
      ? countdown.display
      : `${auction.status === 'PENDING' ? 'Mở lúc' : 'Kết thúc'} ${format(
          new Date(auction.status === 'PENDING' ? auction.startTime : auction.endTime),
          'HH:mm dd/MM',
        )}`;

  return (
    <Link to={`/auctions/${auction.id}`} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl">
        <div className="relative overflow-hidden bg-slate-100">
          <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
            <span className={`rounded-full px-2 py-1 ${statusColors[auction.status]}`}>
              {statusLabels[auction.status]}
            </span>
          </div>

          {auction.imageUrl ? (
            <img
              src={auction.imageUrl}
              alt={auction.title}
              className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_45%),linear-gradient(180deg,#f8fafc,#e2e8f0)] text-slate-400">
              <Tag className="h-14 w-14" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              {categoryName}
            </span>
            <span className="text-xs font-medium text-slate-400">#{auction.id.slice(0, 8)}</span>
          </div>

          <h3 className="mt-3 line-clamp-2 text-lg font-semibold leading-7 text-slate-900 transition group-hover:text-blue-600">
            {auction.title}
          </h3>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
            {auction.description || 'Sản phẩm đang chờ bạn xem chi tiết và tham gia đặt giá.'}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Giá hiện tại</p>
              <div className="mt-1 flex items-center gap-1 text-blue-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-base font-bold">
                  {auction.currentPrice.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Bước giá</p>
              <div className="mt-1 flex items-center gap-1 text-slate-700">
                <Gavel className="h-4 w-4" />
                <span className="text-base font-semibold">
                  {auction.minBidStep.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2">
                <UserRound className="h-4 w-4 text-slate-400" />
                <span className="line-clamp-1">{sellerName}</span>
              </span>
              <span className="font-medium text-slate-700">{auction.totalBids} lượt giá</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span
                className={`inline-flex items-center gap-2 ${
                  auction.status === 'ACTIVE' && countdown.isUrgent ? 'text-rose-600' : ''
                }`}
              >
                {auction.status === 'ACTIVE' ? (
                  <Clock3 className="h-4 w-4" />
                ) : (
                  <CalendarClock className="h-4 w-4" />
                )}
                <span className="font-medium">{footerLabel}</span>
              </span>
              <span className="font-semibold text-slate-900 transition group-hover:text-blue-600">
                Xem chi tiết
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
