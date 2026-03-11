import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import api from '@/services/api.service';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { User, Mail, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { UserProfile } from '@auction/shared';

/**
 * TV4 phụ trách trang này
 */
export default function ProfilePage() {
  const { user } = useAuthStore();

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center mt-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
            {profile?.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.username}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-blue-600" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{profile?.username}</h1>
            <p className="text-gray-500 flex items-center gap-1 text-sm">
              <Mail className="h-3.5 w-3.5" /> {profile?.email}
            </p>
            <p className="text-gray-400 flex items-center gap-1 text-xs">
              <Calendar className="h-3.5 w-3.5" />
              Tham gia {profile && format(new Date(profile.createdAt), 'MM/yyyy', { locale: vi })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{profile?.totalAuctions ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Đấu giá đã tạo</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{profile?.totalBids ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Lượt đặt giá</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{profile?.wonAuctions ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Phiên thắng</p>
        </div>
      </div>
    </div>
  );
}
