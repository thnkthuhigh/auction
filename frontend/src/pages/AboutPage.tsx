import { Gem, Gavel, Shield, Timer } from 'lucide-react';

const VALUES = [
  {
    icon: Gem,
    title: 'Định vị phân khúc cao cấp',
    description: 'Tập trung sản phẩm giá trị cao: Đồ cổ, Túi limited, Vật phẩm sưu tầm hiếm.',
  },
  {
    icon: Timer,
    title: 'Chuẩn theo thời gian server',
    description: 'Toàn bộ phiên được chốt theo đồng hồ hệ thống để đảm bảo công bằng tuyệt đối.',
  },
  {
    icon: Gavel,
    title: 'Đấu giá thời gian thực',
    description: 'Giá hiện tại và lịch sử bid được đồng bộ tức thời cho mọi người tham gia.',
  },
  {
    icon: Shield,
    title: 'Minh bạch và kiểm soát',
    description: 'Admin giám sát, kiểm duyệt sản phẩm và xử lý bất thường trong suốt phiên.',
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#E5BAC2] bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7A1F2B]">
          Giới thiệu
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
          AuctionHub Luxury Marketplace
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
          AuctionHub là nền tảng đấu giá trực tuyến dành cho các tài sản có giá trị cao. Chúng tôi
          xây dựng trải nghiệm sang trọng nhưng minh bạch, giúp Người mua và Nhà cung cấp gặp nhau
          trên một hệ thống được chuẩn hoá nghiệp vụ rõ ràng.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {VALUES.map((value) => {
          const Icon = value.icon;
          return (
            <article
              key={value.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF1F3] text-[#7A1F2B]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-lg font-semibold text-slate-900">{value.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{value.description}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
