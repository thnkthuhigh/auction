import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, ClipboardList, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { Auction } from '@auction/shared';
import { auctionService } from '@/services/auction.service';

type SellerFilter =
  | 'ALL'
  | 'WAITING'
  | 'CHANGES'
  | 'APPROVED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'ENDED'
  | 'CANCELLED';

const FILTERS: { value: SellerFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'WAITING', label: 'Chờ duyệt' },
  { value: 'CHANGES', label: 'Yêu cầu chỉnh sửa' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'ACTIVE', label: 'Đang đấu giá' },
  { value: 'SUSPENDED', label: 'Tạm dừng' },
  { value: 'ENDED', label: 'Đã kết thúc' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

function getSellerStatusTag(status: string, reviewStatus?: string) {
  if (status === 'REVIEW') {
    return { label: 'Chờ duyệt', className: 'bg-[#FFF1F3] text-[#7A1F2B]' };
  }
  if (status === 'PENDING' && reviewStatus === 'CHANGES_REQUESTED') {
    return { label: 'Yêu cầu chỉnh sửa', className: 'bg-amber-100 text-amber-700' };
  }
  if (status === 'PENDING' && reviewStatus === 'APPROVED') {
    return { label: 'Đã duyệt - chờ mở phiên', className: 'bg-emerald-100 text-emerald-700' };
  }
  if (status === 'ACTIVE') {
    return { label: 'Đang đấu giá', className: 'bg-rose-100 text-rose-700' };
  }
  if (status === 'SUSPENDED') {
    return { label: 'Tạm dừng', className: 'bg-orange-100 text-orange-700' };
  }
  if (status === 'ENDED') {
    return { label: 'Đã kết thúc', className: 'bg-slate-200 text-slate-700' };
  }
  if (status === 'CANCELLED') {
    return { label: 'Đã hủy', className: 'bg-rose-100 text-rose-700' };
  }
  return { label: status, className: 'bg-slate-100 text-slate-600' };
}

function canEditAuction(status: string, reviewStatus?: string): boolean {
  return status === 'REVIEW' || (status === 'PENDING' && reviewStatus === 'CHANGES_REQUESTED');
}

function matchesFilter(item: Auction, filter: SellerFilter) {
  if (filter === 'ALL') return true;
  if (filter === 'WAITING') return item.status === 'REVIEW';
  if (filter === 'CHANGES')
    return item.status === 'PENDING' && item.reviewStatus === 'CHANGES_REQUESTED';
  if (filter === 'APPROVED') return item.status === 'PENDING' && item.reviewStatus === 'APPROVED';
  return item.status === filter;
}

export default function SellerProductsPage() {
  const [activeFilter, setActiveFilter] = useState<SellerFilter>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['seller-products-management'],
    queryFn: () => auctionService.getMyAuctions({ limit: 300 }),
  });

  const products = useMemo(() => data?.data ?? [], [data?.data]);

  const filteredProducts = useMemo(
    () => products.filter((item) => matchesFilter(item, activeFilter)),
    [activeFilter, products],
  );

  const summary = useMemo(() => {
    return {
      waitingReview: products.filter((item) => item.status === 'REVIEW').length,
      needChanges: products.filter(
        (item) => item.status === 'PENDING' && item.reviewStatus === 'CHANGES_REQUESTED',
      ).length,
      approved: products.filter(
        (item) => item.status === 'PENDING' && item.reviewStatus === 'APPROVED',
      ).length,
    };
  }, [products]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#E8C2C9] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1F3] text-[#7A1F2B]">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Quản lý trạng thái sản phẩm</h1>
            <p className="mt-1 text-sm text-slate-600">
              Theo dõi hồ sơ bạn đã gửi, xem trạng thái duyệt và chỉnh sửa nhanh ngay trên từng thẻ.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Chờ duyệt" value={summary.waitingReview} tone="brand" />
          <SummaryCard label="Yêu cầu chỉnh sửa" value={summary.needChanges} tone="amber" />
          <SummaryCard label="Đã duyệt" value={summary.approved} tone="green" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                activeFilter === filter.value
                  ? 'bg-[#7A1F2B] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Đang tải danh sách sản phẩm...
        </section>
      ) : filteredProducts.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">Không có sản phẩm phù hợp với bộ lọc hiện tại.</p>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((item) => {
            const tag = getSellerStatusTag(item.status, item.reviewStatus);
            const canEdit = canEditAuction(item.status, item.reviewStatus);
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
                    <p>
                      Giá hiện tại:{' '}
                      <b className="text-[#7A1F2B]">
                        {item.currentPrice.toLocaleString('vi-VN')} VNĐ
                      </b>
                    </p>
                    <p>
                      Lượt trả giá: <b>{item.totalBids}</b>
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <CalendarClock className="h-4 w-4 text-slate-400" />
                      {format(new Date(item.startTime), 'HH:mm dd/MM/yyyy', { locale: vi })}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {canEdit ? (
                      <Link
                        to={`/seller/products/${item.id}/edit`}
                        className="inline-flex items-center rounded-lg bg-[#7A1F2B] px-3 py-2 text-sm font-semibold text-white hover:bg-[#611521]"
                      >
                        Chỉnh sửa
                      </Link>
                    ) : isActive ? (
                      <Link
                        to={`/auctions/${item.id}/live`}
                        className="inline-flex items-center rounded-lg bg-[#7A1F2B] px-3 py-2 text-sm font-semibold text-white hover:bg-[#611521]"
                      >
                        Vào phòng đấu giá
                      </Link>
                    ) : null}

                    <Link
                      to={`/auctions/${item.id}`}
                      className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Xem chi tiết
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
  tone: 'brand' | 'amber' | 'green';
}) {
  const toneClass = {
    brand: 'border-[#E7B8C1] bg-[#FFF1F3] text-[#7A1F2B]',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
