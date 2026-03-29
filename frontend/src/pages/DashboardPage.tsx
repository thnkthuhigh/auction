import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Gavel, Trophy, UserRound, Wallet } from 'lucide-react';
import { userService, type MyBidItem } from '@/services/user.service';
import { useAuthStore } from '@/store/auth.store';

const EMPTY_BIDS: MyBidItem[] = [];

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: myBidsResponse, isLoading: bidsLoading } = useQuery({
    queryKey: ['dashboard-my-bids'],
    queryFn: () => userService.getMyBids({ limit: 100 }),
  });

  const myBids = myBidsResponse?.data ?? EMPTY_BIDS;

  const buyerBidSnapshots = useMemo(() => {
    const latestByAuction = new Map<string, MyBidItem>();
    for (const bid of myBids) {
      if (!latestByAuction.has(bid.auctionId)) {
        latestByAuction.set(bid.auctionId, bid);
      }
    }
    return Array.from(latestByAuction.values());
  }, [myBids]);

  const buyerStats = useMemo(() => {
    const wins = buyerBidSnapshots.filter(
      (item) => item.auction.status === 'ENDED' && item.auction.winnerId === user?.id,
    ).length;
    const active = buyerBidSnapshots.filter((item) => item.auction.status === 'ACTIVE').length;

    return {
      totalBidAuctions: buyerBidSnapshots.length,
      active,
      wins,
      balance: Number(user?.balance ?? 0),
    };
  }, [buyerBidSnapshots, user?.balance, user?.id]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-gradient-to-r from-[#5D1524] via-[#7A1F2B] to-[#A9344B] p-7 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
          Buyer Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-black">Trung tâm quản lý cá nhân</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/90">
          Theo dõi toàn bộ phiên bạn đã tham gia, lịch sử bid và kết quả thắng/thua. Đây là khu vực
          dành riêng cho Người mua.
        </p>
        <div className="mt-4">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 rounded-xl border border-white/50 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            <UserRound className="h-4 w-4" />
            Cập nhật thông tin cá nhân
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Phiên đã tham gia"
          value={buyerStats.totalBidAuctions}
          icon={<Gavel className="h-5 w-5" />}
        />
        <StatCard
          label="Phiên đang theo dõi"
          value={buyerStats.active}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <StatCard
          label="Phiên thắng"
          value={buyerStats.wins}
          icon={<Trophy className="h-5 w-5" />}
        />
        <StatCard
          label="Số dư"
          value={`${buyerStats.balance.toLocaleString('vi-VN')} VNĐ`}
          icon={<Wallet className="h-5 w-5" />}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Phiên đang tham gia</h2>
        <p className="mt-1 text-sm text-slate-500">
          Hiển thị trạng thái bạn đang dẫn đầu hay đã bị vượt giá.
        </p>
        <div className="mt-4 space-y-3">
          {bidsLoading ? (
            <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
          ) : buyerBidSnapshots.filter((item) => item.auction.status === 'ACTIVE').length === 0 ? (
            <p className="text-sm text-slate-500">Bạn chưa tham gia phiên nào đang diễn ra.</p>
          ) : (
            buyerBidSnapshots
              .filter((item) => item.auction.status === 'ACTIVE')
              .map((item) => {
                const isLeading = item.amount >= item.auction.currentPrice;
                return (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{item.auction.title}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isLeading
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {isLeading ? 'Đang dẫn đầu' : 'Đã bị vượt giá'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Giá gần nhất của bạn: <b>{item.amount.toLocaleString('vi-VN')} VNĐ</b>
                    </p>
                    <p className="text-sm text-slate-600">
                      Giá hiện tại: <b>{item.auction.currentPrice.toLocaleString('vi-VN')} VNĐ</b>
                    </p>
                  </div>
                );
              })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Lịch sử bid và kết quả đấu giá</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Sản phẩm</th>
                <th className="px-3 py-2 text-right">Giá cuối bạn đặt</th>
                <th className="px-3 py-2 text-right">Giá chốt</th>
                <th className="px-3 py-2 text-left">Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {buyerBidSnapshots
                .filter((item) => item.auction.status === 'ENDED')
                .map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{item.auction.title}</td>
                    <td className="px-3 py-2 text-right">
                      {item.amount.toLocaleString('vi-VN')} VNĐ
                    </td>
                    <td className="px-3 py-2 text-right">
                      {item.auction.currentPrice.toLocaleString('vi-VN')} VNĐ
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.auction.winnerId === user?.id
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {item.auction.winnerId === user?.id ? 'Thắng' : 'Thua'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
        <div className="text-[#7A1F2B]">{icon}</div>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </article>
  );
}
