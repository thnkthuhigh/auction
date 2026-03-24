import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  CalendarClock,
  PlusCircle,
  Users,
  Activity,
} from 'lucide-react';

const menuItems = [
  {
    label: 'Tong quan',
    path: '/admin',
    icon: LayoutDashboard,
    description: 'Trang chu admin',
  },
  {
    label: 'Duyet san pham',
    path: '/admin/reviews',
    icon: ClipboardCheck,
    description: 'AS-46',
  },
  {
    label: 'Tao phien dau gia',
    path: '/admin/sessions',
    icon: CalendarClock,
    description: 'AS-48',
  },
  {
    label: 'Quan ly user',
    path: '/admin/users',
    icon: Users,
    description: 'AS-61',
  },
  {
    label: 'Giam sat he thong',
    path: '/admin/monitoring',
    icon: Activity,
    description: 'AS-60',
  },
];

export default function AdminSidebar() {
  return (
    <aside className="h-full border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Admin Panel
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">Quan tri dau gia</h2>
      </div>

      <nav className="space-y-1 p-3">
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
                <Icon className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                </div>
              </div>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 pb-3">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Tien ich
        </p>
        <Link
          to="/admin/sessions"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <PlusCircle className="h-4 w-4" />
          Cau hinh phien
        </Link>
      </div>
    </aside>
  );
}