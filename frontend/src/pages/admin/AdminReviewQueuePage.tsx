import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, FileEdit, Search, Tag, User, FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { auctionService } from '@/services/auction.service';
import type { AdminReviewQueueItem, ReviewAuctionAction } from '@/services/auction.service';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const PAGE_SIZE = 10;

type ReviewPayload = {
  auctionId: string;
  action: ReviewAuctionAction;
};

function formatCurrency(value: number): string {
  return `${value.toLocaleString('vi-VN')} ₫`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('vi-VN');
}

export default function AdminReviewQueuePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-review-queue', page],
    queryFn: () => auctionService.getAdminReviewQueue({ page, limit: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ auctionId, action }: ReviewPayload) =>
      auctionService.reviewAuction(auctionId, {
        action,
        note: notes[auctionId]?.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái duyệt sản phẩm');
      queryClient.invalidateQueries({ queryKey: ['admin-review-queue'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Không thể cập nhật trạng thái duyệt');
    },
  });

  const items = useMemo(() => {
    if (!data?.data) return [];
    const keyword = search.trim().toLowerCase();
    if (!keyword) return data.data;
    return data.data.filter((item) => {
      const title = item.title.toLowerCase();
      const seller = item.seller?.username?.toLowerCase() ?? '';
      return title.includes(keyword) || seller.includes(keyword);
    });
  }, [data?.data, search]);

  const handleReview = (item: AdminReviewQueueItem, action: ReviewAuctionAction): void => {
    const note = notes[item.id]?.trim() ?? '';
    if (action !== 'APPROVE' && !note) {
      toast.error('Vui lòng nhập ghi chú khi từ chối hoặc yêu cầu chỉnh sửa');
      return;
    }
    reviewMutation.mutate({ auctionId: item.id, action });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <LoadingSpinner size="lg" text="Đang tải danh sách chờ duyệt..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Duyệt sản phẩm</h1>
            <p className="text-sm text-slate-600 mt-1">UI xử lý sản phẩm chờ duyệt theo AS-46.</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên sản phẩm / seller..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {isFetching && <p className="text-xs text-slate-500 px-1">Đang làm mới dữ liệu...</p>}

      {items.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-700 font-medium">Không có sản phẩm chờ duyệt</p>
          <p className="text-sm text-slate-500 mt-1">Danh sách review queue hiện đang trống.</p>
        </section>
      ) : (
        <section className="space-y-3">
          {items.map((item) => (
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
                      <Tag className="h-10 w-10" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3 min-w-0">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{item.description}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 text-xs font-semibold h-fit">
                      {item.reviewStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 text-sm">
                    <InfoCell
                      icon={<User className="h-3.5 w-3.5 text-slate-500" />}
                      label="Seller"
                      value={item.seller?.username || item.sellerId}
                    />
                    <InfoCell
                      icon={<FolderOpen className="h-3.5 w-3.5 text-slate-500" />}
                      label="Danh mục"
                      value={item.category?.name || item.categoryId}
                    />
                    <InfoCell label="Giá khởi điểm" value={formatCurrency(item.startPrice)} />
                    <InfoCell label="Bước giá" value={formatCurrency(item.minBidStep)} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-500">
                    <p>Tạo lúc: {formatDate(item.createdAt)}</p>
                    <p>Kết thúc: {formatDate(item.endTime)}</p>
                  </div>

                  <textarea
                    value={notes[item.id] ?? ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    rows={2}
                    placeholder="Ghi chú review (khuyến nghị nhập khi từ chối hoặc yêu cầu chỉnh sửa)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      icon={<CheckCircle2 className="h-4 w-4" />}
                      text="Duyệt"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={reviewMutation.isPending}
                      onClick={() => handleReview(item, 'APPROVE')}
                    />
                    <ActionButton
                      icon={<XCircle className="h-4 w-4" />}
                      text="Từ chối"
                      className="bg-rose-600 hover:bg-rose-700"
                      disabled={reviewMutation.isPending}
                      onClick={() => handleReview(item, 'REJECT')}
                    />
                    <ActionButton
                      icon={<FileEdit className="h-4 w-4" />}
                      text="Yêu cầu chỉnh sửa"
                      className="bg-amber-600 hover:bg-amber-700"
                      disabled={reviewMutation.isPending}
                      onClick={() => handleReview(item, 'REQUEST_CHANGES')}
                    />
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
            Trước
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

function ActionButton({
  icon,
  text,
  className,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  text: string;
  className: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60 ${className}`}
    >
      {icon}
      {text}
    </button>
  );
}
