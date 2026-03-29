import { useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertTriangle, Ban, Lock, PauseCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { auctionService } from '@/services/auction.service';
import { userService } from '@/services/user.service';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatTimeVN } from '@/utils/dateTime';

type SuspiciousAccount = {
  bidderId: string;
  bidderUsername: string;
  auctionId: string;
  auctionTitle: string;
  bidCountInTopLogs: number;
};

export default function AdminMonitoringPage() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: monitoring, isLoading } = useQuery({
    queryKey: ['admin-monitoring-page', search],
    queryFn: () =>
      auctionService.getAdminMonitoring({
        page: 1,
        limit: 30,
        search: search.trim() || undefined,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      }),
    refetchInterval: 5_000,
  });

  const activeAuctions = (monitoring?.data ?? []).filter((item) => item.status === 'ACTIVE');

  const bidsQueries = useQueries({
    queries: activeAuctions.map((auction) => ({
      queryKey: ['admin-monitoring-bids', auction.id],
      queryFn: () => auctionService.getBids(auction.id),
      refetchInterval: 5_000,
    })),
  });

  const suspiciousAccounts = useMemo<SuspiciousAccount[]>(() => {
    const list: SuspiciousAccount[] = [];

    activeAuctions.forEach((auction, index) => {
      const bids = (bidsQueries[index]?.data?.data ?? []) as Array<{
        bidderId: string;
        bidderUsername: string;
      }>;

      if (bids.length === 0) return;

      const topLogs = bids.slice(0, 10);
      const counts = new Map<string, { username: string; count: number }>();

      topLogs.forEach((bid) => {
        const prev = counts.get(bid.bidderId);
        counts.set(bid.bidderId, {
          username: bid.bidderUsername,
          count: (prev?.count ?? 0) + 1,
        });
      });

      counts.forEach((value, bidderId) => {
        if (value.count >= 4) {
          list.push({
            bidderId,
            bidderUsername: value.username,
            auctionId: auction.id,
            auctionTitle: auction.title,
            bidCountInTopLogs: value.count,
          });
        }
      });
    });

    return list;
  }, [activeAuctions, bidsQueries]);

  const cancelSessionMutation = useMutation({
    mutationFn: (auctionId: string) => auctionService.cancelAuctionSession(auctionId),
    onSuccess: () => {
      toast.success('Đã hủy phiên đấu giá');
      queryClient.invalidateQueries({ queryKey: ['admin-monitoring-page'] });
      queryClient.invalidateQueries({ queryKey: ['admin-session-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reports-monitoring'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Không thể hủy phiên');
    },
  });

  const suspendSessionMutation = useMutation({
    mutationFn: (auctionId: string) => auctionService.suspendAuctionSession(auctionId),
    onSuccess: () => {
      toast.success('Đã tạm dừng phiên đấu giá');
      queryClient.invalidateQueries({ queryKey: ['admin-monitoring-page'] });
      queryClient.invalidateQueries({ queryKey: ['admin-session-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reports-monitoring'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Không thể tạm dừng phiên');
    },
  });

  const lockUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      userService.updateAdminUserStatus(userId, { isActive: false, reason }),
    onSuccess: () => {
      toast.success('Đã khóa tài khoản nghi ngờ gian lận');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Không thể khóa tài khoản');
    },
  });

  const handleEmergencyCancel = (auctionId: string) => {
    const confirmed = window.confirm('Xác nhận hủy phiên đấu giá đang diễn ra?');
    if (!confirmed) return;
    cancelSessionMutation.mutate(auctionId);
  };

  const handleEmergencySuspend = (auctionId: string) => {
    const confirmed = window.confirm('Xác nhận tạm dừng phiên đấu giá đang diễn ra?');
    if (!confirmed) return;
    suspendSessionMutation.mutate(auctionId);
  };

  const handleLockUser = (userId: string, username: string) => {
    const confirmed = window.confirm(`Khóa tài khoản ${username} do nghi ngờ spam bid?`);
    if (!confirmed) return;
    lockUserMutation.mutate({
      userId,
      reason: 'Nghi ngờ spam bid hoặc thao túng giá (khóa khẩn cấp bởi Admin)',
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <LoadingSpinner size="lg" text="Đang tải dữ liệu giám sát..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-bold text-slate-900">Giám sát hệ thống realtime</h1>
        <p className="mt-1 text-sm text-slate-600">
          Theo dõi feed bid trực tiếp, phát hiện spam và xử lý vi phạm khẩn cấp ngay tại chỗ.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên phiên để lọc giám sát..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr,1fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#7A1F2B]" />
            <h2 className="font-semibold text-slate-900">Radar phiên active</h2>
          </div>

          {activeAuctions.length === 0 ? (
            <p className="text-sm text-slate-500">Hiện chưa có phiên đang hoạt động.</p>
          ) : (
            <div className="space-y-3">
              {activeAuctions.map((auction, index) => {
                const bidLogs = (bidsQueries[index]?.data?.data ?? []) as Array<{
                  id: string;
                  amount: number;
                  bidderUsername: string;
                  createdAt: string;
                }>;

                return (
                  <div key={auction.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{auction.title}</p>
                        <p className="text-xs text-slate-500">
                          Giá hiện tại: {auction.currentPrice.toLocaleString('vi-VN')} VNĐ | Tổng
                          bid: {auction.totalBids}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEmergencySuspend(auction.id)}
                          disabled={
                            suspendSessionMutation.isPending || cancelSessionMutation.isPending
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                        >
                          <PauseCircle className="h-3.5 w-3.5" />
                          Tạm dừng
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEmergencyCancel(auction.id)}
                          disabled={
                            cancelSessionMutation.isPending || suspendSessionMutation.isPending
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Hủy phiên
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Feed bid realtime
                      </p>
                      <div className="max-h-44 space-y-1 overflow-auto text-xs">
                        {bidLogs.length === 0 ? (
                          <p className="text-slate-400">Chưa có log bid.</p>
                        ) : (
                          bidLogs.slice(0, 10).map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between rounded bg-white px-2 py-1"
                            >
                              <span className="text-slate-700">{log.bidderUsername}</span>
                              <span className="font-semibold text-[#7A1F2B]">
                                {log.amount.toLocaleString('vi-VN')} VNĐ
                              </span>
                              <span className="text-slate-500">{formatTimeVN(log.createdAt)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <h2 className="font-semibold text-slate-900">Cảnh báo đỏ</h2>
          </div>

          {suspiciousAccounts.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa phát hiện hành vi spam bid rõ rệt.</p>
          ) : (
            <div className="space-y-2">
              {suspiciousAccounts.map((account) => (
                <div
                  key={`${account.auctionId}-${account.bidderId}`}
                  className="rounded-lg border border-rose-200 bg-rose-50 p-3"
                >
                  <p className="text-sm font-semibold text-slate-900">{account.bidderUsername}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Phiên: {account.auctionTitle} | {account.bidCountInTopLogs} lượt bid trong top
                    log
                  </p>
                  <button
                    type="button"
                    onClick={() => handleLockUser(account.bidderId, account.bidderUsername)}
                    disabled={lockUserMutation.isPending}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#7A1F2B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#611521] disabled:opacity-50"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Khóa tài khoản ngay
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
