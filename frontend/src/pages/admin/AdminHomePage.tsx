import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, Gavel, TimerReset, Wallet } from 'lucide-react';
import { auctionService } from '@/services/auction.service';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatDateTimeVN } from '@/utils/dateTime';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Scheduled',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  ENDED: 'Ended',
  CANCELLED: 'Canceled',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-400',
  ACTIVE: 'bg-emerald-500',
  SUSPENDED: 'bg-orange-500',
  ENDED: 'bg-slate-500',
  CANCELLED: 'bg-rose-500',
};

export default function AdminHomePage() {
  const { data: monitoring, isLoading } = useQuery({
    queryKey: ['admin-dashboard-summary'],
    queryFn: () =>
      auctionService.getAdminMonitoring({
        page: 1,
        limit: 60,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      }),
    refetchInterval: 12_000,
  });

  const auctions = useMemo(() => monitoring?.data ?? [], [monitoring?.data]);
  const summary = monitoring?.summary;
  const totalItems = auctions.length || 1;

  const statusStats = useMemo(() => {
    const counters = {
      PENDING: 0,
      ACTIVE: 0,
      SUSPENDED: 0,
      ENDED: 0,
      CANCELLED: 0,
    };

    auctions.forEach((item) => {
      if (item.status in counters) {
        counters[item.status as keyof typeof counters] += 1;
      }
    });

    return Object.entries(counters).map(([status, count]) => ({
      status,
      count,
      ratio: Math.round((count / totalItems) * 100),
    }));
  }, [auctions, totalItems]);

  const pendingReviewItems = useMemo(
    () => auctions.filter((item) => item.reviewStatus === 'PENDING_REVIEW').slice(0, 8),
    [auctions],
  );
  const circulatingValue = useMemo(
    () =>
      auctions
        .filter((item) => item.status === 'ACTIVE')
        .reduce((sum, item) => sum + item.currentPrice, 0),
    [auctions],
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <LoadingSpinner size="lg" text="Đang tải dữ liệu tổng quan..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-bold text-slate-900">Tổng quan vận hành</h1>
        <p className="mt-1 text-sm text-slate-600">
          Theo dõi nhanh tình hình hệ thống. Phần giám sát realtime đã được tách riêng ở menu Giám
          sát.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Số dư luân chuyển"
          value={`${circulatingValue.toLocaleString('vi-VN')} VNĐ`}
          icon={<Wallet className="h-4 w-4 text-[#7A1F2B]" />}
          color="border-[#E7B8C1] bg-[#FFF1F3]"
        />
        <KpiCard
          title="Phiên đang mở"
          value={summary?.activeAuctions ?? 0}
          icon={<Gavel className="h-4 w-4 text-emerald-600" />}
          color="border-emerald-200 bg-emerald-50"
        />
        <KpiCard
          title="Sản phẩm cần duyệt"
          value={summary?.pendingReviewProducts ?? 0}
          icon={<ClipboardCheck className="h-4 w-4 text-amber-600" />}
          color="border-amber-200 bg-amber-50"
        />
        <KpiCard
          title="Bid trong 24h"
          value={summary?.bidsLast24h ?? 0}
          icon={<TimerReset className="h-4 w-4 text-[#8F2A3E]" />}
          color="border-[#EDC7CF] bg-[#FFF6F7]"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr,1fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Phân bổ trạng thái phiên</h2>
          <div className="mt-4 space-y-3">
            {statusStats.map((item) => (
              <div key={item.status}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">
                    {STATUS_LABELS[item.status] ?? item.status}
                  </span>
                  <span className="text-slate-500">
                    {item.count} phiên ({item.ratio}%)
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className={`h-2.5 rounded-full ${STATUS_COLORS[item.status] ?? 'bg-slate-400'}`}
                    style={{ width: `${item.ratio}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Hàng chờ duyệt gần nhất</h2>
          {pendingReviewItems.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Hiện chưa có sản phẩm chờ duyệt.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {pendingReviewItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Người bán: {item.seller?.username ?? item.sellerId} | Gửi lúc:{' '}
                    {formatDateTimeVN(item.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: ReactNode;
  color: string;
}) {
  return (
    <article className={`rounded-xl border p-3 ${color}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">
        {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
      </p>
    </article>
  );
}
