import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CalendarClock, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CreateAuctionSessionPayload } from '@/services/auction.service';
import { auctionService } from '@/services/auction.service';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatDateTimeVN } from '@/utils/dateTime';

type SessionForm = {
  auctionId: string;
  startTime: string;
  endTime: string;
  startPrice: string;
  minBidStep: string;
};

type SessionFilter = 'ALL' | 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ENDED' | 'CANCELLED';

function statusClass(status: string) {
  if (status === 'PENDING') return 'bg-amber-100 text-amber-700';
  if (status === 'ACTIVE') return 'bg-emerald-100 text-emerald-700';
  if (status === 'SUSPENDED') return 'bg-orange-100 text-orange-700';
  if (status === 'ENDED') return 'bg-slate-200 text-slate-700';
  if (status === 'CANCELLED') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-600';
}

function statusLabel(status: string) {
  if (status === 'PENDING') return 'Scheduled';
  if (status === 'ACTIVE') return 'Active';
  if (status === 'SUSPENDED') return 'Suspended';
  if (status === 'ENDED') return 'Ended';
  if (status === 'CANCELLED') return 'Canceled';
  return status;
}

export default function AdminSessionConfigPage() {
  const [form, setForm] = useState<SessionForm>({
    auctionId: '',
    startTime: '',
    endTime: '',
    startPrice: '',
    minBidStep: '',
  });
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SessionFilter>('ALL');
  const queryClient = useQueryClient();

  const { data: approvedProductsData, isLoading: loadingApproved } = useQuery({
    queryKey: ['admin-approved-products-for-session'],
    queryFn: () =>
      auctionService.getAdminMonitoring({
        page: 1,
        limit: 100,
        status: 'PENDING',
        reviewStatus: 'APPROVED',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  });

  const { data: sessionListData, isLoading: loadingSessions } = useQuery({
    queryKey: ['admin-session-list'],
    queryFn: () =>
      auctionService.getAdminMonitoring({
        page: 1,
        limit: 200,
        sortBy: 'startTime',
        sortOrder: 'asc',
      }),
    refetchInterval: 10_000,
  });

  const approvedProducts = approvedProductsData?.data ?? [];
  const sessions = (sessionListData?.data ?? []).filter((item) =>
    ['PENDING', 'ACTIVE', 'SUSPENDED', 'ENDED', 'CANCELLED'].includes(item.status),
  );

  const filteredSessions = useMemo(() => {
    if (statusFilter === 'ALL') return sessions;
    return sessions.filter((item) => item.status === statusFilter);
  }, [sessions, statusFilter]);

  const createSessionMutation = useMutation({
    mutationFn: (payload: { auctionId: string; data: CreateAuctionSessionPayload }) =>
      auctionService.createAuctionSession(payload.auctionId, payload.data),
    onSuccess: () => {
      toast.success('Tạo phiên đấu giá thành công');
      setForm({
        auctionId: '',
        startTime: '',
        endTime: '',
        startPrice: '',
        minBidStep: '',
      });
      setShowCreatePanel(false);
      queryClient.invalidateQueries({ queryKey: ['admin-approved-products-for-session'] });
      queryClient.invalidateQueries({ queryKey: ['admin-session-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin-monitoring-page'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reports-monitoring'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Không thể tạo phiên đấu giá');
    },
  });

  const cancelSessionMutation = useMutation({
    mutationFn: (auctionId: string) => auctionService.cancelAuctionSession(auctionId),
    onSuccess: () => {
      toast.success('Đã hủy phiên đấu giá');
      queryClient.invalidateQueries({ queryKey: ['admin-session-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin-monitoring-page'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reports-monitoring'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Không thể hủy phiên');
    },
  });

  const selectedProduct = approvedProducts.find((item) => item.id === form.auctionId);

  const handleCreateSession = () => {
    if (!form.auctionId) {
      toast.error('Vui lòng chọn sản phẩm đã duyệt');
      return;
    }
    if (!form.startTime || !form.endTime) {
      toast.error('Vui lòng nhập thời gian bắt đầu và kết thúc');
      return;
    }

    const startPrice = Number(form.startPrice || selectedProduct?.startPrice || 0);
    const minBidStep = Number(form.minBidStep || selectedProduct?.minBidStep || 0);

    if (!Number.isFinite(startPrice) || startPrice < 1000) {
      toast.error('Giá khởi điểm phải từ 1.000 VNĐ');
      return;
    }
    if (!Number.isFinite(minBidStep) || minBidStep < 1000) {
      toast.error('Bước giá phải từ 1.000 VNĐ');
      return;
    }

    createSessionMutation.mutate({
      auctionId: form.auctionId,
      data: {
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        startPrice,
        minBidStep,
      },
    });
  };

  const handleEmergencyCancel = (auctionId: string) => {
    const confirmed = window.confirm('Xác nhận hủy phiên đấu giá này?');
    if (!confirmed) return;
    cancelSessionMutation.mutate(auctionId);
  };

  if (loadingApproved || loadingSessions) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <LoadingSpinner size="lg" text="Đang tải dữ liệu quản lý phiên..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Quản lý Phiên đấu giá</h1>
            <p className="mt-1 text-sm text-slate-600">
              Quản lý toàn vòng đời phiên: Scheduled, Active, Ended, Canceled.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreatePanel((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#7A1F2B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#611521]"
          >
            <PlusCircle className="h-4 w-4" />+ Tạo phiên mới
          </button>
        </div>
      </section>

      {showCreatePanel && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-900">Thiết lập phiên mới</h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Sản phẩm đã duyệt</span>
              <select
                value={form.auctionId}
                onChange={(e) => {
                  const auctionId = e.target.value;
                  const product = approvedProducts.find((item) => item.id === auctionId);
                  setForm((prev) => ({
                    ...prev,
                    auctionId,
                    startPrice: product ? String(product.startPrice) : '',
                    minBidStep: product ? String(product.minBidStep) : '',
                  }));
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
              >
                <option value="">-- Chọn sản phẩm --</option>
                {approvedProducts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} - {item.seller?.username ?? item.sellerId}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Giá khởi điểm (VNĐ)</span>
              <input
                type="number"
                min={1000}
                step={1000}
                value={form.startPrice}
                onChange={(e) => setForm((prev) => ({ ...prev, startPrice: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Thời gian bắt đầu</span>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Thời gian kết thúc</span>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Bước giá (VNĐ)</span>
              <input
                type="number"
                min={1000}
                step={1000}
                value={form.minBidStep}
                onChange={(e) => setForm((prev) => ({ ...prev, minBidStep: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleCreateSession}
            disabled={createSessionMutation.isPending}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#7A1F2B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#611521] disabled:opacity-60"
          >
            <CalendarClock className="h-4 w-4" />
            {createSessionMutation.isPending ? 'Đang tạo phiên...' : 'Lưu và tạo phiên'}
          </button>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED', 'ENDED', 'CANCELLED'] as SessionFilter[]).map(
            (filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === filter
                    ? 'bg-[#7A1F2B] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter === 'ALL' ? 'Tất cả' : statusLabel(filter)}
              </button>
            ),
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Phiên</th>
                <th className="px-3 py-2 text-left font-semibold">Trạng thái</th>
                <th className="px-3 py-2 text-right font-semibold">Giá hiện tại</th>
                <th className="px-3 py-2 text-left font-semibold">Người thắng</th>
                <th className="px-3 py-2 text-left font-semibold">Bắt đầu</th>
                <th className="px-3 py-2 text-left font-semibold">Kết thúc</th>
                <th className="px-3 py-2 text-right font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    Không có phiên phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.category?.name ?? '-'}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(item.status)}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {item.currentPrice.toLocaleString('vi-VN')} VNĐ
                    </td>
                    <td className="px-3 py-2 text-slate-700">{item.winnerUsername ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDateTimeVN(item.startTime)}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDateTimeVN(item.endTime)}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        to={`/seller/products/${item.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E7B8C1] bg-[#FFF1F3] px-3 py-1.5 text-xs font-semibold text-[#7A1F2B] hover:bg-[#FFE6EB]"
                      >
                        Sửa
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleEmergencyCancel(item.id)}
                        disabled={
                          !['PENDING', 'SUSPENDED'].includes(item.status) ||
                          cancelSessionMutation.isPending
                        }
                        className="ml-2 inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Hủy phiên
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
