import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Search, Save, User, FolderOpen, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { CreateAuctionSessionPayload } from '@/services/auction.service';
import { auctionService } from '@/services/auction.service';

const PAGE_SIZE = 12;

type SessionStatus = 'PENDING' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
type ReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

type SessionCandidate = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  startPrice: number;
  minBidStep: number;
  status: SessionStatus;
  reviewStatus?: ReviewStatus;
  startTime: string;
  endTime: string;
  seller?: {
    username?: string;
  };
  category?: {
    name?: string;
  };
  totalBids?: number;
};

type SessionForm = {
  startTime: string;
  endTime: string;
  startPrice: string;
  minBidStep: string;
};

function toLocalInputValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatCurrency(value: number): string {
  return `${value.toLocaleString('vi-VN')} ₫`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN');
}

function getStatusBadgeClass(status: SessionStatus): string {
  if (status === 'PENDING') return 'bg-amber-100 text-amber-800';
  if (status === 'ACTIVE') return 'bg-emerald-100 text-emerald-800';
  if (status === 'ENDED') return 'bg-slate-200 text-slate-700';
  return 'bg-rose-100 text-rose-800';
}

export default function AdminSessionConfigPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [forms, setForms] = useState<Record<string, SessionForm>>({});
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-session-candidates', page],
    queryFn: () =>
      auctionService.getAuctions({
        page,
        limit: PAGE_SIZE,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    placeholderData: (prev) => prev,
  });

  const candidates = useMemo(() => {
    const rawItems = (data?.data ?? []) as unknown as SessionCandidate[];
    const approved = rawItems.filter((item) => item.reviewStatus === 'APPROVED');
    const keyword = search.trim().toLowerCase();
    if (!keyword) return approved;
    return approved.filter((item) => {
      const title = item.title.toLowerCase();
      const seller = item.seller?.username?.toLowerCase() ?? '';
      return title.includes(keyword) || seller.includes(keyword);
    });
  }, [data?.data, search]);

  useEffect(() => {
    setForms((prev) => {
      const next = { ...prev };
      for (const item of candidates) {
        if (!next[item.id]) {
          next[item.id] = {
            startTime: toLocalInputValue(item.startTime),
            endTime: toLocalInputValue(item.endTime),
            startPrice: String(item.startPrice),
            minBidStep: String(item.minBidStep),
          };
        }
      }
      return next;
    });
  }, [candidates]);

  const configMutation = useMutation({
    mutationFn: (params: { auctionId: string; payload: CreateAuctionSessionPayload }) =>
      auctionService.updateAuctionSessionConfig(params.auctionId, params.payload),
    onSuccess: () => {
      toast.success('Da cap nhat cau hinh phien thanh cong');
      queryClient.invalidateQueries({ queryKey: ['admin-session-candidates'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message;
      toast.error(message || 'Khong the cap nhat cau hinh phien');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (auctionId: string) => auctionService.cancelAuctionSession(auctionId),
    onSuccess: () => {
      toast.success('Da huy phien dau gia');
      queryClient.invalidateQueries({ queryKey: ['admin-session-candidates'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message;
      toast.error(message || 'Khong the huy phien dau gia');
    },
  });

  const handleFieldChange = (auctionId: string, key: keyof SessionForm, value: string): void => {
    setForms((prev) => ({
      ...prev,
      [auctionId]: {
        ...prev[auctionId],
        [key]: value,
      },
    }));
  };

  const handleSaveConfig = (item: SessionCandidate): void => {
    if (item.status !== 'PENDING') {
      toast.error('Chi cho phep cau hinh phien dang o trang thai PENDING');
      return;
    }

    const form = forms[item.id];
    if (!form) {
      toast.error('Thieu du lieu cau hinh phien');
      return;
    }

    const startPrice = Number(form.startPrice);
    const minBidStep = Number(form.minBidStep);

    if (!form.startTime || !form.endTime) {
      toast.error('Vui long chon day du thoi gian bat dau/ket thuc');
      return;
    }

    if (!Number.isFinite(startPrice) || startPrice < 1000) {
      toast.error('Gia khoi diem phai tu 1,000 tro len');
      return;
    }

    if (!Number.isFinite(minBidStep) || minBidStep < 1000) {
      toast.error('Buoc gia phai tu 1,000 tro len');
      return;
    }

    const payload: CreateAuctionSessionPayload = {
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
      startPrice,
      minBidStep,
    };

    configMutation.mutate({ auctionId: item.id, payload });
  };

  const handleCancelSession = (item: SessionCandidate): void => {
    if (item.status === 'ENDED' || item.status === 'CANCELLED') {
      toast.error('Phien nay da dong, khong the huy');
      return;
    }

    const confirmed = window.confirm('Ban co chac chan muon huy phien dau gia nay?');
    if (!confirmed) return;
    cancelMutation.mutate(item.id);
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <LoadingSpinner size="lg" text="Dang tai danh sach san pham da duyet..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Thiet lap cau hinh phien</h1>
            <p className="text-sm text-slate-600 mt-1">
              AS-50: cap nhat cau hinh phien va huy phien neu can.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tim theo ten san pham / seller..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {isFetching && <p className="text-xs text-slate-500 px-1">Dang lam moi du lieu...</p>}

      {candidates.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-700 font-medium">Khong co san pham APPROVED de cau hinh phien</p>
          <p className="text-sm text-slate-500 mt-1">
            Hay duyet san pham o man AS-46/AS-47 truoc khi cau hinh phien.
          </p>
        </section>
      ) : (
        <section className="space-y-3">
          {candidates.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col xl:flex-row gap-4">
                <div className="w-full xl:w-48 shrink-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-40 xl:h-32 object-cover rounded-lg border border-slate-200"
                    />
                  ) : (
                    <div className="w-full h-40 xl:h-32 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                      <CalendarClock className="h-10 w-10" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3 min-w-0">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{item.description}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold h-fit ${getStatusBadgeClass(
                        item.status,
                      )}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 text-sm">
                    <InfoCell
                      icon={<User className="h-3.5 w-3.5 text-slate-500" />}
                      label="Seller"
                      value={item.seller?.username || '-'}
                    />
                    <InfoCell
                      icon={<FolderOpen className="h-3.5 w-3.5 text-slate-500" />}
                      label="Danh muc"
                      value={item.category?.name || '-'}
                    />
                    <InfoCell label="Gia hien tai" value={formatCurrency(item.startPrice)} />
                    <InfoCell label="Buoc gia hien tai" value={formatCurrency(item.minBidStep)} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-500">
                    <p>Lich hien tai bat dau: {formatDate(item.startTime)}</p>
                    <p>Lich hien tai ket thuc: {formatDate(item.endTime)}</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Bat dau</span>
                      <input
                        type="datetime-local"
                        value={forms[item.id]?.startTime ?? ''}
                        onChange={(e) => handleFieldChange(item.id, 'startTime', e.target.value)}
                        disabled={item.status !== 'PENDING'}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Ket thuc</span>
                      <input
                        type="datetime-local"
                        value={forms[item.id]?.endTime ?? ''}
                        onChange={(e) => handleFieldChange(item.id, 'endTime', e.target.value)}
                        disabled={item.status !== 'PENDING'}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Gia khoi diem</span>
                      <input
                        type="number"
                        min={1000}
                        step={1000}
                        value={forms[item.id]?.startPrice ?? ''}
                        onChange={(e) => handleFieldChange(item.id, 'startPrice', e.target.value)}
                        disabled={item.status !== 'PENDING'}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Buoc gia</span>
                      <input
                        type="number"
                        min={1000}
                        step={1000}
                        value={forms[item.id]?.minBidStep ?? ''}
                        onChange={(e) => handleFieldChange(item.id, 'minBidStep', e.target.value)}
                        disabled={item.status !== 'PENDING'}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveConfig(item)}
                      disabled={item.status !== 'PENDING' || configMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      Luu cau hinh
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelSession(item)}
                      disabled={
                        item.status === 'ENDED' ||
                        item.status === 'CANCELLED' ||
                        cancelMutation.isPending
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      <Ban className="h-4 w-4" />
                      Huy phien
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
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

function InfoCell({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <p className="text-xs text-slate-500 inline-flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-sm font-medium text-slate-900 mt-1 break-words">{value}</p>
    </div>
  );
}
