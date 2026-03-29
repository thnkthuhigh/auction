import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, CalendarClock, Clock3, Gavel, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { auctionService } from '@/services/auction.service';

function getTrackingTag(status: string, reviewStatus?: string) {
  if (status === 'ACTIVE') {
    return { label: 'Đang đấu giá', className: 'bg-rose-100 text-rose-700' };
  }
  if (status === 'SUSPENDED') {
    return { label: 'Tạm dừng', className: 'bg-orange-100 text-orange-700' };
  }
  if (status === 'PENDING' && reviewStatus === 'APPROVED') {
    return { label: 'Đã duyệt - chờ mở phiên', className: 'bg-emerald-100 text-emerald-700' };
  }
  if (status === 'REVIEW') {
    return { label: 'Chờ duyệt', className: 'bg-[#FFF1F3] text-[#7A1F2B]' };
  }
  return { label: status, className: 'bg-slate-100 text-slate-600' };
}

export default function SellerTrackingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['seller-tracking-auctions'],
    queryFn: () => auctionService.getMyAuctions({ limit: 300 }),
  });

  const allAuctions = useMemo(() => data?.data ?? [], [data?.data]);

  const trackingAuctions = useMemo(
    () =>
      allAuctions.filter(
        (item) =>
          item.status === 'ACTIVE' ||
          item.status === 'SUSPENDED' ||
          (item.status === 'PENDING' && item.reviewStatus === 'APPROVED') ||
          item.status === 'REVIEW',
      ),
    [allAuctions],
  );

  const activeCount = trackingAuctions.filter((item) => item.status === 'ACTIVE').length;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#E8C2C9] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1F3] text-[#7A1F2B]">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Theo dõi phiên đấu giá</h1>
            <p className="mt-1 text-sm text-slate-600">
              Theo dõi lịch mở phiên và diễn biến giá theo thời gian thực cho sản phẩm của bạn.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Đang theo dõi" value={trackingAuctions.length} tone="neutral" />
          <SummaryCard label="Đang đấu giá" value={activeCount} tone="brand" />
          <SummaryCard
            label="Sắp lên sàn"
            value={trackingAuctions.length - activeCount}
            tone="green"
          />
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Đang tải dữ liệu theo dõi phiên...
        </section>
      ) : trackingAuctions.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">Chưa có phiên nào ở trạng thái cần theo dõi.</p>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trackingAuctions.map((item) => {
            const tag = getTrackingTag(item.status, item.reviewStatus);
            const isActive = item.status === 'ACTIVE';

            return (
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
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="line-clamp-2 text-base font-semibold text-slate-900">
                      {item.title}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tag.className}`}
                    >
                      {tag.label}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-slate-600">
                    <p className="inline-flex items-center gap-1">
                      <Gavel className="h-4 w-4 text-slate-400" />
                      Giá hiện tại:{' '}
                      <b className="text-[#7A1F2B]">
                        {item.currentPrice.toLocaleString('vi-VN')} VNĐ
                      </b>
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <CalendarClock className="h-4 w-4 text-slate-400" />
                      Mở phiên:{' '}
                      {format(new Date(item.startTime), 'HH:mm dd/MM/yyyy', { locale: vi })}
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <Clock3 className="h-4 w-4 text-slate-400" />
                      Kết phiên:{' '}
                      {format(new Date(item.endTime), 'HH:mm dd/MM/yyyy', { locale: vi })}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      to={isActive ? `/auctions/${item.id}/live` : `/auctions/${item.id}`}
                      className="inline-flex items-center rounded-lg bg-[#7A1F2B] px-3 py-2 text-sm font-semibold text-white hover:bg-[#611521]"
                    >
                      {isActive ? 'Vào phòng đấu giá' : 'Theo dõi chi tiết'}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'brand' | 'green' | 'neutral';
}) {
  const toneClass = {
    brand: 'border-[#E7B8C1] bg-[#FFF1F3] text-[#7A1F2B]',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    neutral: 'border-slate-200 bg-white text-slate-700',
  };

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
