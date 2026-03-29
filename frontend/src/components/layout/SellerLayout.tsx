import { NavLink, Outlet } from 'react-router-dom';
import { Activity, ClipboardList, FilePlus2, History } from 'lucide-react';

const SELLER_TABS = [
  {
    to: '/seller/new-product',
    label: 'Đăng sản phẩm mới',
    icon: FilePlus2,
  },
  {
    to: '/seller/products',
    label: 'Quản lý trạng thái',
    icon: ClipboardList,
  },
  {
    to: '/seller/tracking',
    label: 'Theo dõi phiên',
    icon: Activity,
  },
  {
    to: '/seller/results',
    label: 'Lịch sử bán',
    icon: History,
  },
];

export default function SellerLayout() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <section className="rounded-2xl border border-[#E8C2C9] bg-white p-2 shadow-sm">
        <nav className="flex min-w-max items-center gap-1 overflow-x-auto">
          {SELLER_TABS.map((tab) => {
            const Icon = tab.icon;

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-[#FFF1F3] text-[#7A1F2B]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-[#7A1F2B]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    <span
                      className={`absolute inset-x-3 bottom-1 h-0.5 rounded-full transition ${
                        isActive ? 'bg-[#7A1F2B]' : 'bg-transparent'
                      }`}
                    />
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </section>

      <Outlet />
    </div>
  );
}
