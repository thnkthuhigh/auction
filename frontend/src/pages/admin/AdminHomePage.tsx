import { Link } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';

export default function AdminHomePage() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-bold text-slate-900">Trang chủ admin</h1>
        <p className="text-sm text-slate-600 mt-1">
          AS-46 tập trung cho UI duyệt sản phẩm. Bạn có thể vào màn hình review queue để xử lý.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-blue-600" />
          <h2 className="font-semibold text-slate-900">Duyệt sản phẩm</h2>
        </div>
        <p className="text-sm text-slate-600 mt-2">
          Xử lý hành động duyệt, từ chối, yêu cầu chỉnh sửa.
        </p>
        <Link
          to="/admin/reviews"
          className="inline-flex items-center gap-2 mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Vào duyệt sản phẩm
        </Link>
      </section>
    </div>
  );
}
