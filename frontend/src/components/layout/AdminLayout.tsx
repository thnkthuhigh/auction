import { Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  return (
    <div className="min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-[18rem,1fr]">
      <AdminSidebar />
      <section className="min-w-0 p-5 lg:p-6">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 mb-4">
          <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 inline-flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Khu vực quản trị viên
          </p>
        </div>
        <section className="min-w-0">
          <Outlet />
        </section>
      </section>
    </div>
  );
}
