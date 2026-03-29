import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[18rem,1fr]">
      <AdminSidebar />
      <section className="min-w-0 bg-slate-50 p-5 lg:p-6">
        <section className="min-w-0">
          <Outlet />
        </section>
      </section>
    </div>
  );
}
