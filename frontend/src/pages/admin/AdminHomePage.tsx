import { Link } from 'react-router-dom';
import { ClipboardCheck, CalendarClock, Users } from 'lucide-react';

export default function AdminHomePage() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-bold text-slate-900">Trang chu admin</h1>
        <p className="text-sm text-slate-600 mt-1">
          Dieu huong nhanh cho cac chuc nang quan ly san pham va phien dau gia.
        </p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-blue-600" />
            <h2 className="font-semibold text-slate-900">Duyet san pham</h2>
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Xu ly hanh dong duyet, tu choi, yeu cau chinh sua.
          </p>
          <Link
            to="/admin/reviews"
            className="inline-flex items-center gap-2 mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Vao duyet san pham
          </Link>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-blue-600" />
            <h2 className="font-semibold text-slate-900">Tao phien dau gia</h2>
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Thiet lap thoi gian, gia khoi diem va buoc gia cho san pham da duyet.
          </p>
          <Link
            to="/admin/sessions"
            className="inline-flex items-center gap-2 mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Vao tao phien
          </Link>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <h2 className="font-semibold text-slate-900">Quan ly user</h2>
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Theo doi danh sach user va khoa/mo tai khoan khi phat sinh vi pham.
          </p>
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-2 mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Vao quan ly user
          </Link>
        </article>
      </section>
    </div>
  );
}
