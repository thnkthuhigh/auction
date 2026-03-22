import { Link, NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardCheck, PlusCircle } from 'lucide-react';

const menuItems = [
  {
    label: 'Tổng quan',
    path: '/admin',
    icon: LayoutDashboard,
    description: 'Trang chủ admin',
  },
  {
    label: 'Duyệt sản phẩm',
    path: '/admin/reviews',
    icon: ClipboardCheck,
    description: 'AS-46',
  },
];

export default function AdminSidebar() {
  return (
    <aside className="h-full border-r border-slate-200 bg-white">
      <div className="px-4 py-4 border-b border-slate-100">
        <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Admin Panel</p>
        <h2 className="text-lg font-bold text-slate-900 mt-1">Quản trị đấu giá</h2>
      </div>

      <nav className="p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-3 transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              <div className="flex items-start gap-3">
                <Icon className="h-4 w-4 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                </div>
              </div>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 pb-3">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 px-3 mb-2">
          Tiện ích
        </p>
        <Link
          to="/auctions/create"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Tạo đấu giá
        </Link>
      </div>
    </aside>
  );
}
