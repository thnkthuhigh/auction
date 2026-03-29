import { Newspaper, ShieldCheck, Sparkles } from 'lucide-react';

const NEWS_ITEMS = [
  {
    title: 'Bí quyết đọc lịch sử bid để ra quyết định thông minh',
    summary:
      'Phân tích nhịp tăng giá, tần suất bid và thời điểm bùng nổ giúp Buyer tối ưu chiến lược.',
    time: 'Cập nhật 2 giờ trước',
  },
  {
    title: '5 tiêu chí xác thực sản phẩm hiếm trước khi lên sàn',
    summary:
      'Nhà cung cấp nên chuẩn bị nguồn gốc, ảnh cận chi tiết và mô tả tình trạng rõ ràng để tăng tỷ lệ duyệt.',
    time: 'Cập nhật hôm nay',
  },
  {
    title: 'Quy trình xử lý tranh chấp sau phiên đấu giá',
    summary:
      'Hệ thống lưu toàn bộ lịch sử bid theo timestamp server để đảm bảo đối soát minh bạch.',
    time: 'Cập nhật hôm qua',
  },
];

export default function NewsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-gradient-to-r from-[#5D1524] via-[#7A1F2B] to-[#AA374E] p-8 text-white shadow-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
          <Newspaper className="h-4 w-4" />
          Tin tức đấu giá
        </div>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">
          Bản tin thị trường và mẹo vận hành phiên
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-white/90 sm:text-base">
          Tổng hợp các cập nhật mới nhất về hoạt động đấu giá, kinh nghiệm đặt bid và hướng dẫn dành
          cho Nhà cung cấp lẫn Người mua.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {NEWS_ITEMS.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A1F2B]">
              {item.time}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-[#E8B5BE] bg-[#FFF3F5] p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-[#7A1F2B]" />
          <div>
            <p className="text-sm font-semibold text-[#7A1F2B]">Thông điệp minh bạch</p>
            <p className="mt-1 text-sm text-slate-700">
              Tất cả dữ liệu bid và kết quả phiên đều được ghi nhận theo thời gian server để bảo vệ
              quyền lợi của cả Buyer và Seller.
            </p>
          </div>
          <Sparkles className="ml-auto h-5 w-5 text-[#7A1F2B]" />
        </div>
      </section>
    </div>
  );
}
