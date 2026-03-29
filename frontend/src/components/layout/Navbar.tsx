import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Bell, LogOut, Store, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { auctionService } from '@/services/auction.service';
import { formatTimeVN } from '@/utils/dateTime';
import logoSrc from '@/assets/auctionhub-logo.svg';

const USER_MENU = [
  { to: '/', label: 'Trang chủ' },
  { to: '/explore', label: 'Khám phá' },
  { to: '/news', label: 'Tin tức' },
  { to: '/about', label: 'Giới thiệu' },
];

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAdminUser = isAuthenticated && user?.role === 'ADMIN';
  const [now, setNow] = useState(() => Date.now());
  const [offsetMs, setOffsetMs] = useState(0);

  const { data: pendingReviewData } = useQuery({
    queryKey: ['navbar-admin-pending-review-count'],
    queryFn: () =>
      auctionService.getAdminMonitoring({
        page: 1,
        limit: 1,
        reviewStatus: 'PENDING_REVIEW',
      }),
    enabled: isAdminUser,
    refetchInterval: 20_000,
  });

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
    void fetch(`${backendUrl}/health`)
      .then((res) => res.json() as Promise<{ timestamp: string }>)
      .then((data) => {
        const serverTime = new Date(data.timestamp).getTime();
        if (Number.isFinite(serverTime)) {
          setOffsetMs(serverTime - Date.now());
        }
      })
      .catch(() => {
        setOffsetMs(0);
      });
  }, []);

  const serverClock = useMemo(() => {
    return formatTimeVN(now + offsetMs);
  }, [now, offsetMs]);

  const pendingReviewCount = pendingReviewData?.total ?? 0;
  const sellerPortalLink = isAuthenticated ? '/seller/new-product' : '/login';

  return (
    <header className="sticky top-0 z-50 border-b border-[#E2B5BE] bg-white/95 shadow-sm backdrop-blur">
      <div className={isAdminRoute ? 'w-full px-6' : 'mx-auto max-w-7xl px-4'}>
        <div className="flex h-16 items-center">
          <Link to="/" className="mr-6 flex items-center gap-2">
            <img src={logoSrc} alt="AuctionHub Luxury" className="h-9 w-9 rounded-lg" />
            <span className="text-xl font-black tracking-wide text-[#7A1F2B]">AuctionHub</span>
          </Link>

          {!isAdminRoute && (
            <nav className="hidden items-center gap-5 md:flex">
              {USER_MENU.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `text-sm font-semibold transition ${
                      isActive ? 'text-[#7A1F2B]' : 'text-slate-600 hover:text-[#7A1F2B]'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}

          <div
            className={`${isAdminRoute ? 'ml-auto' : 'ml-auto hidden md:block'} inline-flex items-center rounded-full border border-[#E4C1C8] bg-[#FFF4F5] px-5 py-2`}
          >
            <span className="font-mono text-sm font-bold text-[#7A1F2B]">{serverClock}</span>
          </div>

          <div className={`${isAdminRoute ? 'ml-3' : 'ml-4'} flex items-center gap-3`}>
            {!isAdminRoute && isAuthenticated && (
              <Link
                to={sellerPortalLink}
                className="inline-flex items-center gap-1 rounded-xl bg-[#7A1F2B] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#611521]"
              >
                <Store className="h-4 w-4" />
                Đăng sản phẩm
              </Link>
            )}

            {isAuthenticated ? (
              <>
                {user?.role === 'ADMIN' && !isAdminRoute && (
                  <Link
                    to="/admin"
                    className="hidden rounded-xl border border-[#C88B97] px-3 py-2 text-sm font-semibold text-[#7A1F2B] transition hover:bg-[#FFF4F5] lg:inline-flex"
                  >
                    Quản trị
                  </Link>
                )}

                {!isAdminRoute && (
                  <Link
                    to="/dashboard"
                    className="hidden rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 lg:inline-flex"
                  >
                    Bảng điều khiển
                  </Link>
                )}

                {isAdminUser && (
                  <Link
                    to="/admin/reviews"
                    className="relative inline-flex items-center justify-center rounded-full border border-slate-300 bg-white p-2 text-slate-600 transition hover:border-[#C88B97] hover:text-[#7A1F2B]"
                    aria-label="Thông báo duyệt sản phẩm"
                    title="Thông báo duyệt sản phẩm"
                  >
                    <Bell className="h-5 w-5" />
                    {pendingReviewCount > 0 && (
                      <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#7A1F2B] px-1 text-[11px] font-bold text-white">
                        {pendingReviewCount}
                      </span>
                    )}
                  </Link>
                )}

                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:border-[#C88B97] hover:text-[#7A1F2B]"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user?.username}</span>
                </Link>

                <button
                  onClick={logout}
                  className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-[#7A1F2B]"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-600 transition hover:text-[#7A1F2B]"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-[#7A1F2B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#611521]"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>

        {!isAdminRoute && (
          <nav className="-mt-1 flex gap-2 overflow-x-auto pb-3 pt-1 md:hidden">
            {USER_MENU.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[#7A1F2B] text-white'
                      : 'bg-[#FFF1F3] text-[#7A1F2B] hover:bg-[#FDE7EB]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
