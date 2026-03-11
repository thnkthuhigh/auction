import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter } from 'lucide-react';
import { auctionService } from '@/services/auction.service';
import AuctionCard from '@/components/auction/AuctionCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { AuctionStatus } from '@auction/shared';

const STATUS_FILTERS: { label: string; value: AuctionStatus | '' }[] = [
  { label: 'Tất cả', value: '' },
  { label: 'Đang diễn ra', value: 'ACTIVE' },
  { label: 'Sắp diễn ra', value: 'PENDING' },
  { label: 'Đã kết thúc', value: 'ENDED' },
];

/**
 * TV5 phụ trách trang này
 */
export default function AuctionListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AuctionStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['auctions', { search, status, page }],
    queryFn: () =>
      auctionService.getAuctions({
        search: search || undefined,
        status: status || undefined,
        page,
      }),
    placeholderData: (prev) => prev,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: auctionService.getCategories,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Danh sách đấu giá</h1>
          <p className="text-gray-500 text-sm mt-1">{data?.total ?? 0} phiên đấu giá</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm đấu giá..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Category filter */}
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            onChange={() => setPage(1)}
          >
            <option value="">Tất cả danh mục</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-gray-400 self-center" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                status === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" text="Đang tải..." />
        </div>
      ) : data?.data.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">Không tìm thấy đấu giá nào</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data?.data.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 text-sm"
              >
                Trước
              </button>
              <span className="text-sm text-gray-600">
                Trang {page} / {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 text-sm"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
