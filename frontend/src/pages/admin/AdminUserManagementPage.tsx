import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Search, ShieldCheck, ShieldX, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { userService } from '@/services/user.service';

const PAGE_SIZE = 12;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN');
}

function getRoleBadge(role: 'USER' | 'ADMIN'): string {
  return role === 'ADMIN' ? 'bg-violet-100 text-violet-700' : 'bg-slate-200 text-slate-700';
}

function getStatusBadge(isActive: boolean): string {
  return isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';
}

export default function AdminUserManagementPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN' | ''>('');
  const [isActive, setIsActive] = useState<'all' | 'active' | 'locked'>('all');
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
      toast.success(variables.payload.isActive ? 'Da mo khoa tai khoan' : 'Da khoa tai khoan');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Khong the cap nhat trang thai tai khoan');
    },
  });

  const handleToggleStatus = (userId: string, currentlyActive: boolean) => {
    if (currentlyActive) {
      const reason = window.prompt('Nhap ly do khoa tai khoan:', 'Vi pham chinh sach');
      if (reason === null) return;
      statusMutation.mutate({
        userId,
        payload: { isActive: false, reason: reason.trim() || 'Khoa boi admin' },
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
        <LoadingSpinner size="lg" text="Dang tai danh sach user..." />
      </div>
    );
  }

  const users = data?.data ?? [];

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-bold text-slate-900">Quan ly user</h1>
        <p className="mt-1 text-sm text-slate-600">
          AS-61: xem danh sach user va khoa/mo tai khoan khi can.
        </p>
      </section>

      {data?.summary && (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <StatCard
            label="Tong user"
            value={data.summary.totalUsers}
            icon={<UserCog className="h-4 w-4 text-blue-600" />}
            color="border-blue-200 bg-blue-50"
          />
          <StatCard
            label="Dang hoat dong"
            value={data.summary.activeUsers}
            icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
            color="border-emerald-200 bg-emerald-50"
          />
          <StatCard
            label="Dang bi khoa"
            value={data.summary.lockedUsers}
            icon={<ShieldX className="h-4 w-4 text-rose-600" />}
            color="border-rose-200 bg-rose-50"
          />
          <StatCard
            label="Admin"
            value={data.summary.adminUsers}
            icon={<ShieldCheck className="h-4 w-4 text-violet-600" />}
            color="border-violet-200 bg-violet-50"
          />
          <StatCard
            label="Member"
            value={data.summary.memberUsers}
            icon={<UserCog className="h-4 w-4 text-slate-600" />}
            color="border-slate-200 bg-slate-100"
          />
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,10rem,10rem] gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Tim theo username hoac email..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value as 'USER' | 'ADMIN' | '');
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tat ca role</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>

          <select
            value={isActive}
            onChange={(e) => {
              setPage(1);
              setIsActive(e.target.value as 'all' | 'active' | 'locked');
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tat ca trang thai</option>
            <option value="active">Dang hoat dong</option>
            <option value="locked">Dang bi khoa</option>
          </select>
        </div>

        {isFetching && <p className="text-xs text-slate-500">Dang lam moi du lieu...</p>}

        {users.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
            <p className="text-sm font-medium text-slate-700">Khong co user phu hop bo loc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Tai khoan</th>
                  <th className="text-left px-3 py-2 font-semibold">Role</th>
                  <th className="text-left px-3 py-2 font-semibold">Trang thai</th>
                  <th className="text-right px-3 py-2 font-semibold">Auctions</th>
                  <th className="text-right px-3 py-2 font-semibold">Bids</th>
                  <th className="text-right px-3 py-2 font-semibold">Balance</th>
                  <th className="text-left px-3 py-2 font-semibold">Ngay tao</th>
                  <th className="text-left px-3 py-2 font-semibold">Hanh dong</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{item.username}</p>
                      <p className="text-xs text-slate-500">{item.email}</p>
                      {!item.isActive && item.lockReason && (
                        <p className="text-xs text-rose-600 mt-1 line-clamp-1">
                          Ly do: {item.lockReason}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getRoleBadge(
                          item.role,
                        )}`}
                      >
                        {item.role}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(
                          item.isActive,
                        )}`}
                      >
                        {item.isActive ? 'ACTIVE' : 'LOCKED'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">{item.totalAuctions}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{item.totalBids}</td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {item.balance.toLocaleString('vi-VN')} VND
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
                        {item.isActive ? 'Khoa tai khoan' : 'Mo khoa'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 disabled:opacity-50 hover:bg-slate-50"
          >
            Truoc
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
