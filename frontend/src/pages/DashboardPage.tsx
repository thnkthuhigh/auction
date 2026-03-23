import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { Link } from 'react-router-dom';
import { auctionService } from '@/services/auction.service';
import AuctionCard from '@/components/auction/AuctionCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { LayoutDashboard, PlusCircle, Gavel, Trophy } from 'lucide-react';
import api from '@/services/api.service';
import type { UserProfile } from '@auction/shared';

/**
 * TV4 phụ trách trang này
 */
export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data.data;
    },
  });

  const { data: myAuctions, isLoading: auctionsLoading } = useQuery({
    queryKey: ['my-auctions'],
    queryFn: () => auctionService.getMyAuctions(),
  });

  if (profileLoading) {
    return (
      <div className="flex justify-center mt-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <Link
          to="/auctions/create"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <PlusCircle className="h-4 w-4" />
          Tạo đấu giá
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<Gavel className="h-5 w-5 text-blue-600" />}
          label="Đấu giá đã tạo"
          value={profile?.totalAuctions ?? 0}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<Gavel className="h-5 w-5 text-purple-600" />}
          label="Lượt đặt giá"
          value={profile?.totalBids ?? 0}
          bg="bg-purple-50"
        />
        <StatCard
          icon={<Trophy className="h-5 w-5 text-yellow-600" />}
          label="Phiên đã thắng"
          value={profile?.wonAuctions ?? 0}
          bg="bg-yellow-50"
        />
        <StatCard
          icon={<span className="text-green-600 font-bold text-sm">₫</span>}
          label="Số dư"
          value={`${(profile?.balance ?? 0).toLocaleString('vi-VN')} ₫`}
          bg="bg-green-50"
        />
      </div>

      {/* My Auctions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Đấu giá gần đây</h2>
        {auctionsLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myAuctions?.data.slice(0, 6).map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        )}
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
  icon: React.ReactNode;
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
