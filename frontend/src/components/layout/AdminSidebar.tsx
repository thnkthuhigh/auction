import { NavLink } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  CalendarClock,
  ClipboardCheck,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';

const primaryMenu = [
  { label: 'Tổng quan', path: '/admin', icon: LayoutDashboard },
  { label: 'Giám sát', path: '/admin/monitoring', icon: Activity },
  { label: 'Báo cáo', path: '/admin/reports', icon: BarChart3 },
  { label: 'Quản lý Sản phẩm', path: '/admin/reviews', icon: ClipboardCheck },
  { label: 'Quản lý Phiên đấu giá', path: '/admin/sessions', icon: CalendarClock },
  { label: 'Quản lý Người dùng', path: '/admin/users', icon: Users },
  { label: 'Cài đặt & Log hệ thống', path: '/admin/history', icon: Settings },
];

export default function AdminSidebar() {
  return (
    <aside className="top-16 self-start border-r border-slate-200 bg-[#FCFCFB] lg:sticky lg:h-[calc(100vh-4rem)] lg:overflow-y-auto">
      <nav className="space-y-2 p-3">
        {primaryMenu.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-[#7A1F2B] text-white'
                    : 'text-slate-700 hover:bg-[#FFF1F3] hover:text-[#7A1F2B]'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
