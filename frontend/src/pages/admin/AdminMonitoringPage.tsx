import { useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, Clock3, Gavel, Search } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { auctionService } from '@/services/auction.service';

const PAGE_SIZE = 12;

function formatCurrency(value: number): string {
  return `${value.toLocaleString('vi-VN')} VND`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN');
}

function getSessionStatusBadge(status: string): string {
  if (status === 'ACTIVE') return 'bg-emerald-100 text-emerald-700';
  if (status === 'PENDING') return 'bg-amber-100 text-amber-700';
  if (status === 'ENDED') return 'bg-slate-200 text-slate-700';
  return 'bg-rose-100 text-rose-700';
}

function getReviewStatusBadge(status: string): string {
  if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-700';
  if (status === 'PENDING_REVIEW') return 'bg-amber-100 text-amber-700';
  if (status === 'REJECTED') return 'bg-rose-100 text-rose-700';
  return 'bg-blue-100 text-blue-700';
}

export default function AdminMonitoringPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [reviewStatus, setReviewStatus] = useState<string>('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-monitoring', page, search, status, reviewStatus],
    queryFn: () =>
      auctionService.getAdminMonitoring({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        status: (status || undefined) as 'PENDING' | 'ACTIVE' | 'ENDED' | 'CANCELLED' | undefined,
        reviewStatus: (reviewStatus || undefined) as
          | 'PENDING_REVIEW'
          | 'APPROVED'
          | 'REJECTED'
          | 'CHANGES_REQUESTED'
          | undefined,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      }),
    placeholderData: (prev) => prev,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <LoadingSpinner size="lg" text="Dang tai dashboard giam sat..." />
      </div>
    );
  }

  const summary = data?.summary;
  const sessions = data?.data ?? [];

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-slate-900">Giam sat he thong</h1>
          <p className="text-sm text-slate-600">
            AS-60: theo doi hoat dong dau gia, canh bao bat thuong, va quan ly toan bo phien.
          </p>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <StatCard
            title="Tong phien"
            value={summary.totalAuctions}
            icon={<Gavel className="h-4 w-4 text-blue-600" />}
            color="border-blue-200 bg-blue-50"
          />
          <StatCard
            title="Dang dien ra"
            value={summary.activeAuctions}
            icon={<Activity className="h-4 w-4 text-emerald-600" />}
            color="border-emerald-200 bg-emerald-50"
          />
          <StatCard
            title="Cho duyet"
            value={summary.pendingReviewProducts}
            icon={<Clock3 className="h-4 w-4 text-amber-600" />}
            color="border-amber-200 bg-amber-50"
          />
          <StatCard
            title="Bid 24h"
            value={summary.bidsLast24h}
            icon={<Gavel className="h-4 w-4 text-indigo-600" />}
            color="border-indigo-200 bg-indigo-50"
          />
          <StatCard
            title="Canh bao"
            value={summary.staleActiveAuctions}
            icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
            color="border-rose-200 bg-rose-50"
          />
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,12rem,14rem] gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Tim theo ten phien, mo ta, seller..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tat ca status</option>
            <option value="PENDING">PENDING</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ENDED">ENDED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <select
            value={reviewStatus}
            onChange={(e) => {
              setPage(1);
              setReviewStatus(e.target.value);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tat ca review</option>
            <option value="PENDING_REVIEW">PENDING_REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CHANGES_REQUESTED">CHANGES_REQUESTED</option>
          </select>
        </div>

        {isFetching && <p className="text-xs text-slate-500">Dang lam moi du lieu...</p>}

        {sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
            <p className="text-sm font-medium text-slate-700">Khong co du lieu phu hop bo loc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Phien</th>
                  <th className="text-left px-3 py-2 font-semibold">Seller</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                  <th className="text-left px-3 py-2 font-semibold">Review</th>
                  <th className="text-right px-3 py-2 font-semibold">Gia hien tai</th>
                  <th className="text-right px-3 py-2 font-semibold">So bid</th>
                  <th className="text-left px-3 py-2 font-semibold">Bat dau</th>
                  <th className="text-left px-3 py-2 font-semibold">Ket thuc</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900 line-clamp-1">{item.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-1">{item.category?.name ?? '-'}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{item.seller?.username ?? item.sellerId}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getSessionStatusBadge(
                          item.status,
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getReviewStatusBadge(
                          item.reviewStatus,
                        )}`}
                      >
                        {item.reviewStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-slate-800">
                      {formatCurrency(item.currentPrice)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">{item.totalBids}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDate(item.startTime)}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDate(item.endTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 disabled:opacity-50 hover:bg-slate-50"
          >
            Truoc
          </button>
          <span className="text-sm text-slate-600">
            Trang {page}/{data.totalPages}
          </span>
          <button
            onClick={() => setPage((prev) => Math.min(data.totalPages, prev + 1))}
            disabled={page === data.totalPages}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 disabled:opacity-50 hover:bg-slate-50"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  color: string;
}) {
  return (
    <article className={`rounded-xl border p-3 ${color}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value.toLocaleString('vi-VN')}</p>
    </article>
  );
}
