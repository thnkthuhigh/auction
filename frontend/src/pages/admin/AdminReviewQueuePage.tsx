import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileEdit, Search, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ReviewAuctionAction } from '@/services/auction.service';
import { auctionService } from '@/services/auction.service';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatDateTimeVN } from '@/utils/dateTime';

const PAGE_SIZE = 20;

function formatCurrency(value: number): string {
  return `${value.toLocaleString('vi-VN')} VNĐ`;
}

function formatDate(value: string): string {
  return formatDateTimeVN(value);
}

function getReviewBadge(reviewStatus: string) {
  if (reviewStatus === 'PENDING_REVIEW') return 'bg-amber-100 text-amber-800';
  if (reviewStatus === 'CHANGES_REQUESTED') return 'bg-orange-100 text-orange-700';
  if (reviewStatus === 'APPROVED') return 'bg-emerald-100 text-emerald-700';
  if (reviewStatus === 'REJECTED') return 'bg-[#FFF1F3] text-[#7A1F2B]';
  return 'bg-slate-200 text-slate-700';
}

function getReviewLabel(reviewStatus: string) {
  if (reviewStatus === 'PENDING_REVIEW') return 'Chờ duyệt';
  if (reviewStatus === 'CHANGES_REQUESTED') return 'Yêu cầu chỉnh sửa';
  if (reviewStatus === 'APPROVED') return 'Đã duyệt';
  if (reviewStatus === 'REJECTED') return 'Từ chối';
  return reviewStatus;
}

export default function AdminReviewQueuePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [reviewFilter, setReviewFilter] = useState<string>('');
  const [selectedAuctionId, setSelectedAuctionId] = useState<string>('');
  const [reviewNote, setReviewNote] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-review-management', page, search, reviewFilter],
    queryFn: () =>
      auctionService.getAdminMonitoring({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        reviewStatus: (reviewFilter || undefined) as
          | 'PENDING_REVIEW'
          | 'APPROVED'
          | 'REJECTED'
          | 'CHANGES_REQUESTED'
          | undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    placeholderData: (prev) => prev,
  });

  const items = useMemo(() => data?.data ?? [], [data?.data]);
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedAuctionId) ?? items[0],
    [items, selectedAuctionId],
  );
  const canReviewSelectedItem = useMemo(() => {
    if (!selectedItem) return false;
    const pendingReview = selectedItem.reviewStatus === 'PENDING_REVIEW';
    const canBeReviewedStatus =
      selectedItem.status === 'REVIEW' || selectedItem.status === 'PENDING';
    return pendingReview && canBeReviewedStatus;
  }, [selectedItem]);

  const reviewMutation = useMutation({
    mutationFn: ({
      auctionId,
      action,
      note,
    }: {
      auctionId: string;
      action: ReviewAuctionAction;
      note?: string;
    }) =>
      auctionService.reviewAuction(auctionId, {
        action,
        note,
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái duyệt sản phẩm');
      setReviewNote('');
      queryClient.invalidateQueries({ queryKey: ['admin-review-management'] });
      queryClient.invalidateQueries({ queryKey: ['navbar-admin-pending-review-count'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Không thể cập nhật trạng thái duyệt');
    },
  });

  const handleAction = (action: ReviewAuctionAction) => {
    if (!selectedItem) return;

    const note = reviewNote.trim();
    if (action !== 'APPROVE' && !note) {
      toast.error('Vui lòng nhập lý do khi từ chối hoặc yêu cầu chỉnh sửa');
      return;
    }

    reviewMutation.mutate({
      auctionId: selectedItem.id,
      action,
      note: note || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <LoadingSpinner size="lg" text="Đang tải danh sách sản phẩm..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-bold text-slate-900">Quản lý sản phẩm</h1>
        <p className="mt-1 text-sm text-slate-600">
          Luồng duyệt bài cho Nhà cung cấp: Duyệt, Yêu cầu chỉnh sửa hoặc Từ chối.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr,14rem]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Tìm theo tên sản phẩm hoặc người bán..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
            />
          </div>
          <select
            value={reviewFilter}
            onChange={(e) => {
              setPage(1);
              setReviewFilter(e.target.value);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
          >
            <option value="">Tất cả trạng thái duyệt</option>
            <option value="PENDING_REVIEW">Chờ duyệt</option>
            <option value="CHANGES_REQUESTED">Yêu cầu chỉnh sửa</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Từ chối</option>
          </select>
        </div>
        {isFetching && <p className="mt-2 text-xs text-slate-500">Đang làm mới dữ liệu...</p>}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr,24rem]">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Sản phẩm</th>
                  <th className="px-3 py-2 text-left font-semibold">Người bán</th>
                  <th className="px-3 py-2 text-left font-semibold">Trạng thái duyệt</th>
                  <th className="px-3 py-2 text-left font-semibold">Ngày gửi</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                      Không có sản phẩm phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedAuctionId(item.id)}
                      className={`cursor-pointer border-t border-slate-100 ${
                        selectedItem?.id === item.id ? 'bg-[#FFF8F9]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.category?.name ?? '-'}</p>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {item.seller?.username ?? item.sellerId}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${getReviewBadge(item.reviewStatus)}`}
                        >
                          {getReviewLabel(item.reviewStatus)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{formatDate(item.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          {!selectedItem ? (
            <p className="text-sm text-slate-500">Chọn một sản phẩm để xem chi tiết duyệt.</p>
          ) : (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Chi tiết duyệt</h2>
              {selectedItem.imageUrl ? (
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.title}
                  className="h-44 w-full rounded-lg border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-44 w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-400">
                  Không có ảnh sản phẩm
                </div>
              )}

              <div className="space-y-2 text-sm text-slate-700">
                <p>
                  <b>Tên sản phẩm:</b> {selectedItem.title}
                </p>
                <p>
                  <b>Người bán:</b> {selectedItem.seller?.username ?? selectedItem.sellerId}
                </p>
                <p>
                  <b>Danh mục:</b> {selectedItem.category?.name ?? '-'}
                </p>
                <p>
                  <b>Giá khởi điểm:</b> {formatCurrency(selectedItem.startPrice)}
                </p>
                <p>
                  <b>Bước giá:</b> {formatCurrency(selectedItem.minBidStep)}
                </p>
                <p className="text-slate-600">{selectedItem.description}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Action Panel
                </p>
                <Link
                  to={`/seller/products/${selectedItem.id}/edit`}
                  className="mt-2 inline-flex rounded-lg border border-[#E7B8C1] bg-white px-3 py-1.5 text-xs font-semibold text-[#7A1F2B] hover:bg-[#FFF1F3]"
                >
                  Chỉnh sửa thông tin sản phẩm
                </Link>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={3}
                  placeholder="Nhập lý do khi yêu cầu chỉnh sửa hoặc từ chối..."
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
                />
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    disabled={reviewMutation.isPending || !canReviewSelectedItem}
                    onClick={() => handleAction('APPROVE')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Duyệt
                  </button>
                  <button
                    type="button"
                    disabled={reviewMutation.isPending || !canReviewSelectedItem}
                    onClick={() => handleAction('REQUEST_CHANGES')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                  >
                    <FileEdit className="h-4 w-4" />
                    Yêu cầu chỉnh sửa
                  </button>
                  <button
                    type="button"
                    disabled={reviewMutation.isPending || !canReviewSelectedItem}
                    onClick={() => handleAction('REJECT')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#7A1F2B] px-3 py-2 text-sm font-semibold text-white hover:bg-[#611521] disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Từ chối
                  </button>
                </div>
              </div>
            </div>
          )}
        </article>
      </section>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 hover:bg-slate-50"
          >
            Trước
          </button>
          <span className="text-sm text-slate-600">
            Trang {page}/{data.totalPages}
          </span>
          <button
            onClick={() => setPage((prev) => Math.min(data.totalPages, prev + 1))}
            disabled={page === data.totalPages}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 hover:bg-slate-50"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
