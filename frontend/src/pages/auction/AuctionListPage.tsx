import { startTransition, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, RotateCcw, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { auctionService } from '@/services/auction.service';
import AuctionCard from '@/components/auction/AuctionCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { AuctionStatus } from '@auction/shared';

const STATUS_FILTERS: { label: string; value: AuctionStatus | '' }[] = [
  { label: 'Tất cả', value: '' },
  { label: 'Đang diễn ra', value: 'ACTIVE' },
  { label: 'Sắp diễn ra', value: 'PENDING' },
  { label: 'Đã kết thúc', value: 'ENDED' },
  { label: 'Đã huỷ', value: 'CANCELLED' },
];

const SORT_OPTIONS = [
  { label: 'Mới nhất', sortBy: 'createdAt' as const, sortOrder: 'desc' as const },
  { label: 'Sắp kết thúc', sortBy: 'endTime' as const, sortOrder: 'asc' as const },
  { label: 'Giá cao nhất', sortBy: 'currentPrice' as const, sortOrder: 'desc' as const },
  { label: 'Giá thấp nhất', sortBy: 'currentPrice' as const, sortOrder: 'asc' as const },
];

const DEFAULT_SORT_VALUE = 'createdAt-desc';
const VALID_SORT_VALUES = new Set(
  SORT_OPTIONS.map((option) => `${option.sortBy}-${option.sortOrder}`),
);

function parsePositivePage(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function parseStatus(value: string | null): AuctionStatus | '' {
  return STATUS_FILTERS.some((filter) => filter.value === value) ? (value as AuctionStatus | '') : '';
}

function parseSortValue(value: string | null) {
  return value && VALID_SORT_VALUES.has(value) ? value : DEFAULT_SORT_VALUE;
}

export default function AuctionListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [status, setStatus] = useState<AuctionStatus | ''>(() => parseStatus(searchParams.get('status')));
  const [categoryId, setCategoryId] = useState(() => searchParams.get('categoryId') ?? '');
  const [sortValue, setSortValue] = useState(() => parseSortValue(searchParams.get('sort')));
  const [page, setPage] = useState(() => parsePositivePage(searchParams.get('page')));
  const debouncedSearch = useDebouncedValue(search, 500);
  const normalizedSearch = debouncedSearch.trim();
  const [sortBy, sortOrder] = sortValue.split('-') as [
    'createdAt' | 'endTime' | 'currentPrice',
    'asc' | 'desc',
  ];
  const currentQueryString = searchParams.toString();

  useEffect(() => {
    const nextParams = new URLSearchParams();
    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      nextParams.set('search', trimmedSearch);
    }

    if (status) {
      nextParams.set('status', status);
    }

    if (categoryId) {
      nextParams.set('categoryId', categoryId);
    }

    if (sortValue !== DEFAULT_SORT_VALUE) {
      nextParams.set('sort', sortValue);
    }

    if (page > 1) {
      nextParams.set('page', String(page));
    }

    const nextQueryString = nextParams.toString();
    if (nextQueryString !== currentQueryString) {
      startTransition(() => {
        setSearchParams(nextParams, { replace: true });
      });
    }
  }, [categoryId, currentQueryString, page, search, setSearchParams, sortValue, status]);

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['auctions', { search: normalizedSearch, status, categoryId, sortBy, sortOrder, page }],
    queryFn: () =>
      auctionService.getAuctions({
        search: normalizedSearch || undefined,
        status: status || undefined,
        categoryId: categoryId || undefined,
        sortBy,
        sortOrder,
        page,
      }),
    placeholderData: (previousData) => previousData,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: auctionService.getCategories,
    staleTime: 1000 * 60 * 5,
  });

  const currentCategory = categories.find((category) => category.id === categoryId);
  const activeStatusLabel =
    STATUS_FILTERS.find((filter) => filter.value === status)?.label ?? 'Tất cả';
  const currentSortLabel =
    SORT_OPTIONS.find((option) => `${option.sortBy}-${option.sortOrder}` === sortValue)?.label ??
    'Mới nhất';
  const hasActiveFilters = Boolean(search || status || categoryId || sortValue !== DEFAULT_SORT_VALUE);
  const auctions = data?.data ?? [];
  const totalPages = data?.totalPages ?? 0;
  const pageStart = data?.total ? (page - 1) * (data.limit ?? 0) + 1 : 0;
  const pageEnd = data?.total ? Math.min(page * (data.limit ?? 0), data.total) : 0;

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setCategoryId('');
    setSortValue(DEFAULT_SORT_VALUE);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#ecfeff_100%)] p-6 sm:p-8">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.14),_transparent_55%)] lg:block" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr),20rem] lg:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
              <Sparkles className="h-3.5 w-3.5" />
              Auction Listing & Product Discovery
            </div>
            <div className="space-y-2">
              <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Khám phá sản phẩm đang mở phiên đấu giá trên toàn hệ thống.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Lọc nhanh theo trạng thái, danh mục và mức giá để tìm đúng phiên phù hợp. Màn
                hình này tập trung vào trải nghiệm xem danh sách rõ ràng, dễ quét và dễ khám phá.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <SummaryCard label="Tổng phiên" value={data?.total ?? 0} tone="blue" />
            <SummaryCard label="Danh mục" value={categories.length} tone="cyan" />
            <SummaryCard
              label="Bộ lọc hiện tại"
              value={normalizedSearch || currentCategory?.name || activeStatusLabel}
              tone="slate"
              isText
            />
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, mô tả, người bán hoặc danh mục..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/60 py-3 pl-10 pr-16 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                >
                  Xoá
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[28rem] lg:grid-cols-2">
              <select
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={sortValue}
                onChange={(event) => {
                  setSortValue(event.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {SORT_OPTIONS.map((option) => (
                  <option
                    key={`${option.sortBy}-${option.sortOrder}`}
                    value={`${option.sortBy}-${option.sortOrder}`}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                <Filter className="h-3.5 w-3.5" />
                Trạng thái
              </div>
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setStatus(filter.value);
                    setPage(1);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    status === filter.value
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                <SlidersHorizontal className="h-4 w-4 text-slate-400" />
                <span>{currentSortLabel}</span>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 font-medium text-rose-600 transition hover:bg-rose-100"
                >
                  <RotateCcw className="h-4 w-4" />
                  Xoá bộ lọc
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {data?.total ?? 0} sản phẩm phù hợp
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {data?.total
              ? `Hiển thị ${pageStart}-${pageEnd} trên tổng ${data.total} phiên đấu giá${
                  normalizedSearch ? ` cho từ khoá "${normalizedSearch}"` : ''
                }`
              : 'Điều chỉnh bộ lọc để khám phá thêm sản phẩm phù hợp.'}
          </p>
        </div>
        {isFetching && !isLoading && (
          <p className="text-sm text-slate-500">Đang cập nhật danh sách...</p>
        )}
      </section>

      {isLoading ? (
        <div className="rounded-[24px] border border-slate-200 bg-white py-20">
          <LoadingSpinner size="lg" text="Đang tải danh sách sản phẩm..." />
        </div>
      ) : isError ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-6 py-10 text-center">
          <p className="text-lg font-semibold text-rose-700">Không thể tải danh sách sản phẩm</p>
          <p className="mt-2 text-sm text-rose-600">
            {error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.'}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Thử lại
          </button>
        </div>
      ) : auctions.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Search className="h-6 w-6 text-slate-400" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-slate-900">Không tìm thấy phiên phù hợp</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Thử đổi từ khoá tìm kiếm, chuyển trạng thái hoặc chọn lại danh mục để mở rộng kết quả.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:px-5">
              <p className="text-sm text-slate-500">
                Trang <span className="font-semibold text-slate-900">{page}</span> / {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={page === 1}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={page === totalPages}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  isText = false,
}: {
  label: string;
  value: number | string;
  tone: 'blue' | 'cyan' | 'slate';
  isText?: boolean;
}) {
  const toneClasses = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    slate: 'border-slate-200 bg-white text-slate-700',
  };

  return (
    <div className={`rounded-2xl border px-4 py-4 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">{label}</p>
      <p className={`mt-2 font-bold text-slate-900 ${isText ? 'text-base' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}
