import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { userService, type MyBidItem } from '@/services/user.service';
import { LayoutDashboard, Gavel, Trophy, Wallet, Clock3 } from 'lucide-react';

/**
 * TV4 phụ trách trang này
 */
export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: myBidsResponse, isLoading: myBidsLoading } = useQuery({
    queryKey: ['my-bids-history'],
    queryFn: () => userService.getMyBids({ limit: 100 }),
  });

  const buyerStats = {
    createdAuctions: 0,
    totalBids: 25,
    wonAuctions: 3,
    balance: '75.000.000 đ',
  };

  const personalBidHistory: Array<{
    id: string;
    productName: string;
    yourLastBid: string;
    status: 'Đã Thắng' | 'Thua Đấu Giá' | 'Đang diễn ra';
    finalPrice: string;
  }> = useMemo(() => {
    const latestBidByAuction = new Map<string, MyBidItem>();

    for (const bid of myBidsResponse?.data ?? []) {
      if (!latestBidByAuction.has(bid.auctionId)) {
        latestBidByAuction.set(bid.auctionId, bid);
      }
    }

    return Array.from(latestBidByAuction.values()).map((bid) => {
      const status =
        bid.auction.status === 'ENDED'
          ? bid.auction.winnerId === user?.id
            ? 'Đã Thắng'
            : 'Thua Đấu Giá'
          : 'Đang diễn ra';

      return {
        id: bid.auction.id,
        productName: bid.auction.title,
        yourLastBid: formatCurrencyVnd(bid.amount),
        status,
        finalPrice: formatCurrencyVnd(bid.auction.currentPrice),
      };
    });
  }, [myBidsResponse?.data, user?.id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <LayoutDashboard className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<Gavel className="h-5 w-5 text-blue-600" />}
          label="Đấu giá đã tạo"
          value={buyerStats.createdAuctions}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<Gavel className="h-5 w-5 text-purple-600" />}
          label="Lượt đặt giá"
          value={buyerStats.totalBids}
          bg="bg-purple-50"
        />
        <StatCard
          icon={<Trophy className="h-5 w-5 text-yellow-600" />}
          label="Phiên đã thắng"
          value={buyerStats.wonAuctions}
          bg="bg-yellow-50"
        />
        <StatCard
          icon={<Wallet className="h-5 w-5 text-green-600" />}
          label="Số dư"
          value={buyerStats.balance}
          bg="bg-green-50"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Đấu giá gần đây</h2>
        </div>

        <div className="xl:col-span-1 space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">
              iPhone 15 Pro Max 256GB - VN/A
            </h3>
            <p className="mt-2 text-sm text-gray-500">Giá cuối cùng</p>
            <p className="text-xl font-bold text-gray-900">31.000.000 đ</p>
            <span className="mt-4 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              Đã kết thúc
            </span>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Lịch sử đấu giá cá nhân</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tên sản phẩm</th>
                    <th className="px-4 py-3 font-semibold">Giá đặt cuối của bạn</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái</th>
                    <th className="px-4 py-3 font-semibold">Giá cuối cùng</th>
                  </tr>
                </thead>
                <tbody>
                  {myBidsLoading && (
                    <tr className="border-t border-gray-100">
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                        Đang tải lịch sử đấu giá...
                      </td>
                    </tr>
                  )}

                  {!myBidsLoading && personalBidHistory.length === 0 && (
                    <tr className="border-t border-gray-100">
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                        Bạn chưa tham gia phiên đấu giá nào.
                      </td>
                    </tr>
                  )}

                  {!myBidsLoading &&
                    personalBidHistory.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-medium text-gray-900">{item.productName}</td>
                        <td className="px-4 py-3">{item.yourLastBid}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-3">{item.finalPrice}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-4 space-y-1`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: 'Đã Thắng' | 'Thua Đấu Giá' | 'Đang diễn ra' }) {
  const styleMap: Record<typeof status, string> = {
    'Đã Thắng': 'bg-green-100 text-green-700',
    'Thua Đấu Giá': 'bg-red-100 text-red-700',
    'Đang diễn ra': 'bg-orange-100 text-orange-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${styleMap[status]}`}
    >
      {status === 'Đang diễn ra' && <Clock3 className="h-3 w-3" />}
      {status}
    </span>
  );
}

function formatCurrencyVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}
