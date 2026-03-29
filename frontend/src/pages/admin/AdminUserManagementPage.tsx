import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Search, ShieldCheck, ShieldX, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { userService } from '@/services/user.service';
import { formatDateTimeVN } from '@/utils/dateTime';

const PAGE_SIZE = 12;

function formatDate(value: string): string {
  return formatDateTimeVN(value);
}

function getRoleBadge(role: 'USER' | 'ADMIN'): string {
  return role === 'ADMIN' ? 'bg-[#F8E7EA] text-[#7A1F2B]' : 'bg-slate-200 text-slate-700';
}

function getStatusBadge(isActive: boolean): string {
  return isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';
}

export default function AdminUserManagementPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN' | ''>('');
  const [isActive, setIsActive] = useState<'all' | 'active' | 'locked'>('all');
  const [segment, setSegment] = useState<'all' | 'supplier' | 'buyer'>('all');
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-users', page, search, role, isActive],
    queryFn: () =>
      userService.getAdminUsers({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        role: role || undefined,
        isActive: isActive === 'all' ? undefined : isActive === 'active',
      }),
    placeholderData: (prev) => prev,
  });

  const statusMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: { isActive: boolean; reason?: string };
    }) => userService.updateAdminUserStatus(userId, payload),
    onSuccess: (_, variables) => {
      toast.success(variables.payload.isActive ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Không thể cập nhật trạng thái tài khoản');
    },
  });

  const users = useMemo(() => data?.data ?? [], [data?.data]);

  const filteredUsers = useMemo(() => {
    if (segment === 'all') return users;
    if (segment === 'supplier') return users.filter((item) => item.totalAuctions > 0);
    return users.filter((item) => item.totalAuctions === 0);
  }, [segment, users]);

  const handleToggleStatus = (userId: string, currentlyActive: boolean) => {
    if (currentlyActive) {
      const reason = window.prompt('Nhập lý do khóa tài khoản:', 'Vi phạm chính sách');
      if (reason === null) return;
      statusMutation.mutate({
        userId,
        payload: { isActive: false, reason: reason.trim() || 'Khóa bởi admin' },
      });
      return;
    }

    statusMutation.mutate({
      userId,
      payload: { isActive: true },
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <LoadingSpinner size="lg" text="Đang tải danh sách người dùng..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-bold text-slate-900">Quản lý người dùng</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tách danh sách Nhà cung cấp và Người mua, kiểm tra hồ sơ và khóa/mở khóa tài khoản.
        </p>
      </section>

      {data?.summary && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Tổng user"
            value={data.summary.totalUsers}
            icon={<UserCog className="h-4 w-4 text-[#7A1F2B]" />}
            color="border-[#E7B8C1] bg-[#FFF1F3]"
          />
          <StatCard
            label="Đang hoạt động"
            value={data.summary.activeUsers}
            icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
            color="border-emerald-200 bg-emerald-50"
          />
          <StatCard
            label="Đang bị khóa"
            value={data.summary.lockedUsers}
            icon={<ShieldX className="h-4 w-4 text-rose-600" />}
            color="border-rose-200 bg-rose-50"
          />
          <StatCard
            label="Admin"
            value={data.summary.adminUsers}
            icon={<ShieldCheck className="h-4 w-4 text-[#8F2A3E]" />}
            color="border-[#EDC7CF] bg-[#FFF6F7]"
          />
          <StatCard
            label="Member"
            value={data.summary.memberUsers}
            icon={<UserCog className="h-4 w-4 text-slate-600" />}
            color="border-slate-200 bg-slate-100"
          />
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr,10rem,10rem,12rem]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Tìm theo username hoặc email..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
            />
          </div>

          <select
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value as 'USER' | 'ADMIN' | '');
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
          >
            <option value="">Tất cả role</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>

          <select
            value={isActive}
            onChange={(e) => {
              setPage(1);
              setIsActive(e.target.value as 'all' | 'active' | 'locked');
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Đang bị khóa</option>
          </select>

          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value as 'all' | 'supplier' | 'buyer')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
          >
            <option value="all">Tất cả nhóm</option>
            <option value="supplier">Nhà cung cấp</option>
            <option value="buyer">Người mua</option>
          </select>
        </div>

        {isFetching && <p className="mt-2 text-xs text-slate-500">Đang làm mới dữ liệu...</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Tài khoản</th>
                <th className="px-3 py-2 text-left font-semibold">Role</th>
                <th className="px-3 py-2 text-left font-semibold">Nhóm</th>
                <th className="px-3 py-2 text-left font-semibold">Trạng thái</th>
                <th className="px-3 py-2 text-right font-semibold">Auctions</th>
                <th className="px-3 py-2 text-right font-semibold">Bids</th>
                <th className="px-3 py-2 text-right font-semibold">Balance</th>
                <th className="px-3 py-2 text-left font-semibold">Ngày tạo</th>
                <th className="px-3 py-2 text-left font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                    Không có người dùng phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{item.username}</p>
                      <p className="text-xs text-slate-500">{item.email}</p>
                      {!item.isActive && item.lockReason && (
                        <p className="mt-1 line-clamp-1 text-xs text-rose-600">
                          Lý do: {item.lockReason}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getRoleBadge(item.role)}`}
                      >
                        {item.role}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {item.totalAuctions > 0 ? 'Nhà cung cấp' : 'Người mua'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(item.isActive)}`}
                      >
                        {item.isActive ? 'ACTIVE' : 'LOCKED'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">{item.totalAuctions}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{item.totalBids}</td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {item.balance.toLocaleString('vi-VN')} VNĐ
                    </td>
                    <td className="px-3 py-2 text-slate-700">{formatDate(item.createdAt)}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item.id, item.isActive)}
                        disabled={item.role === 'ADMIN' || statusMutation.isPending}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 ${
                          item.isActive
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        <Lock className="h-3.5 w-3.5" />
                        {item.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  color: string;
}) {
  return (
    <article className={`rounded-xl border p-3 ${color}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value.toLocaleString('vi-VN')}</p>
    </article>
  );
}
