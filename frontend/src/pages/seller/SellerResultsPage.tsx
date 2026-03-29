import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, Tag, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { auctionService } from '@/services/auction.service';

export default function SellerResultsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['seller-results-auctions'],
    queryFn: () => auctionService.getMyAuctions({ limit: 300 }),
  });

  const soldItems = (data?.data ?? []).filter((item) => item.status === 'ENDED');

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#E8C2C9] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1F3] text-[#7A1F2B]">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Lịch sử bán</h1>
            <p className="mt-1 text-sm text-slate-600">
              Xem lại các phiên đã chốt, giá cuối cùng và người chiến thắng của từng sản phẩm.
            </p>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Đang tải lịch sử bán...
        </section>
      ) : soldItems.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">Chưa có sản phẩm nào kết thúc phiên đấu giá.</p>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {soldItems.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-slate-400">
                  <Tag className="h-10 w-10" />
                </div>
              )}

              <div className="space-y-3 p-4">
                <h2 className="line-clamp-2 text-base font-semibold text-slate-900">
                  {item.title}
                </h2>

                <div className="space-y-1 text-sm text-slate-600">
                  <p>
                    Giá chốt:{' '}
                    <b className="text-[#7A1F2B]">
                      {item.currentPrice.toLocaleString('vi-VN')} VNĐ
                    </b>
                  </p>
                  <p>
                    Người thắng: <b>{item.winnerUsername ?? 'Không có người thắng'}</b>
                  </p>
                  <p className="inline-flex items-center gap-1">
                    <CalendarClock className="h-4 w-4 text-slate-400" />
                    Kết phiên: {format(new Date(item.endTime), 'HH:mm dd/MM/yyyy', { locale: vi })}
                  </p>
                </div>

                <Link
                  to={`/auctions/${item.id}`}
                  className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Xem chi tiết phiên
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
