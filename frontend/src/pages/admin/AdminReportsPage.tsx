import { useMemo, type ReactNode } from 'react';
import { useQueries } from '@tanstack/react-query';
import { BarChart3, FileWarning, Trophy, Users, Wallet } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { auctionService } from '@/services/auction.service';
import { userService } from '@/services/user.service';
import { formatDateTimeVN } from '@/utils/dateTime';

type StatusKey = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ENDED' | 'CANCELLED';

const STATUS_ORDER: StatusKey[] = ['PENDING', 'ACTIVE', 'SUSPENDED', 'ENDED', 'CANCELLED'];

const STATUS_LABELS: Record<StatusKey, string> = {
  PENDING: 'Scheduled',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  ENDED: 'Ended',
  CANCELLED: 'Canceled',
};

const STATUS_COLORS: Record<StatusKey, string> = {
  PENDING: 'bg-amber-500',
  ACTIVE: 'bg-emerald-500',
  SUSPENDED: 'bg-orange-500',
  ENDED: 'bg-slate-500',
  CANCELLED: 'bg-rose-500',
};

export default function AdminReportsPage() {
  const [monitoringQuery, usersQuery, logsQuery] = useQueries({
    queries: [
      {
        queryKey: ['admin-reports-monitoring'],
        queryFn: () =>
          auctionService.getAdminMonitoring({
            page: 1,
            limit: 200,
            sortBy: 'endTime',
            sortOrder: 'desc',
          }),
        refetchInterval: 30_000,
      },
      {
        queryKey: ['admin-reports-users'],
        queryFn: () => userService.getAdminUsers({ page: 1, limit: 1 }),
        refetchInterval: 30_000,
      },
      {
        queryKey: ['admin-reports-system-logs'],
        queryFn: () => auctionService.getAdminSystemLogs({ page: 1, limit: 200 }),
        refetchInterval: 30_000,
      },
    ],
  });

  const auctions = useMemo(() => monitoringQuery.data?.data ?? [], [monitoringQuery.data?.data]);
  const summary = monitoringQuery.data?.summary;
  const userSummary = usersQuery.data?.summary;
  const logs = useMemo(() => logsQuery.data?.data ?? [], [logsQuery.data?.data]);

  const endedAuctions = useMemo(
    () => auctions.filter((item) => item.status === 'ENDED'),
    [auctions],
  );
  const endedRevenue = useMemo(
    () => endedAuctions.reduce((sum, item) => sum + item.currentPrice, 0),
    [endedAuctions],
  );
  const averageClosedPrice =
    endedAuctions.length > 0 ? Math.round(endedRevenue / endedAuctions.length) : 0;

  const statusStats = useMemo(() => {
    const counters: Record<StatusKey, number> = {
      PENDING: 0,
      ACTIVE: 0,
      SUSPENDED: 0,
      ENDED: 0,
      CANCELLED: 0,
    };

    auctions.forEach((item) => {
      if (item.status in counters) {
        counters[item.status as StatusKey] += 1;
      }
    });

    const total = auctions.length || 1;
    return STATUS_ORDER.map((key) => ({
      key,
      count: counters[key],
      ratio: Math.round((counters[key] / total) * 100),
    }));
  }, [auctions]);

  const categoryStats = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();

    endedAuctions.forEach((item) => {
      const name = item.category?.name ?? 'Khác';
      const prev = map.get(name) ?? { count: 0, value: 0 };
      map.set(name, {
        count: prev.count + 1,
        value: prev.value + item.currentPrice,
      });
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [endedAuctions]);

  const logLevelStats = useMemo(() => {
    const counters: Record<'DEBUG' | 'INFO' | 'WARN' | 'ERROR', number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
    };

    logs.forEach((log) => {
      if (log.level in counters) {
        counters[log.level] += 1;
      }
    });

    return counters;
  }, [logs]);

  const isLoading = monitoringQuery.isLoading || usersQuery.isLoading || logsQuery.isLoading;
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <LoadingSpinner size="lg" text="Đang tổng hợp báo cáo..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-bold text-slate-900">Báo cáo vận hành</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tổng hợp số liệu quan trọng cho quản trị: doanh thu phiên, hành vi tham gia và chất lượng
          hệ thống.
        </p>
        <p className="mt-2 text-xs text-slate-500">Cập nhật lúc: {formatDateTimeVN(new Date())}</p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportCard
          label="Doanh thu phiên đã kết thúc"
          value={`${endedRevenue.toLocaleString('vi-VN')} VNĐ`}
          icon={<Wallet className="h-4 w-4 text-[#7A1F2B]" />}
          color="border-[#E7B8C1] bg-[#FFF1F3]"
        />
        <ReportCard
          label="Giá chốt trung bình"
          value={`${averageClosedPrice.toLocaleString('vi-VN')} VNĐ`}
          icon={<Trophy className="h-4 w-4 text-amber-600" />}
          color="border-amber-200 bg-amber-50"
        />
        <ReportCard
          label="Bid trong 24h"
          value={(summary?.bidsLast24h ?? 0).toLocaleString('vi-VN')}
          icon={<BarChart3 className="h-4 w-4 text-emerald-600" />}
          color="border-emerald-200 bg-emerald-50"
        />
        <ReportCard
          label="User đang hoạt động"
          value={`${userSummary?.activeUsers?.toLocaleString('vi-VN') ?? '0'} / ${
            userSummary?.totalUsers?.toLocaleString('vi-VN') ?? '0'
          }`}
          icon={<Users className="h-4 w-4 text-[#7A1F2B]" />}
          color="border-[#E7B8C1] bg-[#FFF1F3]"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr,1fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Phân bố trạng thái phiên</h2>
          <div className="mt-4 space-y-3">
            {statusStats.map((item) => (
              <div key={item.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{STATUS_LABELS[item.key]}</span>
                  <span className="text-slate-500">
                    {item.count} phiên ({item.ratio}%)
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className={`h-2.5 rounded-full ${STATUS_COLORS[item.key]}`}
                    style={{ width: `${item.ratio}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileWarning className="h-4 w-4 text-rose-600" />
            <h2 className="font-semibold text-slate-900">Sức khỏe log hệ thống</h2>
          </div>
          <div className="space-y-2 text-sm">
            <LogRow label="ERROR" value={logLevelStats.ERROR} tone="text-rose-700" />
            <LogRow label="WARN" value={logLevelStats.WARN} tone="text-amber-700" />
            <LogRow label="INFO" value={logLevelStats.INFO} tone="text-emerald-700" />
            <LogRow label="DEBUG" value={logLevelStats.DEBUG} tone="text-slate-700" />
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">Top danh mục theo giá trị chốt</h2>
        {categoryStats.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Chưa có dữ liệu phiên kết thúc để lập báo cáo danh mục.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Danh mục</th>
                  <th className="px-3 py-2 text-right font-semibold">Số phiên ended</th>
                  <th className="px-3 py-2 text-right font-semibold">Giá trị chốt</th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.map((item) => (
                  <tr key={item.name} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{item.name}</td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {item.count.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">
                      {item.value.toLocaleString('vi-VN')} VNĐ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ReportCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  color: string;
}) {
  return (
    <article className={`rounded-xl border p-3 ${color}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </article>
  );
}

function LogRow({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="font-semibold text-slate-700">{label}</span>
      <span className={`font-bold ${tone}`}>{value.toLocaleString('vi-VN')}</span>
    </div>
  );
}
