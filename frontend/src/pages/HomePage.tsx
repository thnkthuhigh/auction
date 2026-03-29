import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarClock, Clock3, Crown, Gem, Sparkles } from 'lucide-react';
import { auctionService } from '@/services/auction.service';
import { useCountdown } from '@/hooks/useCountdown';
import type { Auction } from '@auction/shared';

type HomeAuction = Auction & {
  seller?: { username?: string };
  category?: { name?: string };
};

export default function HomePage() {
  const { data: activeData, isLoading: activeLoading } = useQuery({
    queryKey: ['home-active-auctions'],
    queryFn: () =>
      auctionService.getAuctions({
        status: 'ACTIVE',
        limit: 4,
        sortBy: 'endTime',
        sortOrder: 'asc',
      }),
  });

  const { data: scheduledData, isLoading: scheduledLoading } = useQuery({
    queryKey: ['home-scheduled-auctions'],
    queryFn: () =>
      auctionService.getAuctions({
        status: 'PENDING',
        limit: 4,
      }),
  });

  const activeAuctions = (activeData?.data ?? []) as HomeAuction[];
  const scheduledAuctions = (scheduledData?.data ?? []) as HomeAuction[];
  const heroAuction = activeAuctions[0] ?? scheduledAuctions[0];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#360A14] via-[#7A1F2B] to-[#B44057] p-8 text-white shadow-2xl sm:p-10">
        {heroAuction?.imageUrl && (
          <img
            src={heroAuction.imageUrl}
            alt={heroAuction.title}
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(40,7,14,0.88)_25%,rgba(40,7,14,0.6)_55%,rgba(40,7,14,0.3)_100%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr),24rem] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em]">
              <Crown className="h-4 w-4" />
              Phiên Tâm Điểm
            </div>
            <h1 className="max-w-3xl text-3xl font-black leading-tight drop-shadow-md sm:text-5xl">
              Đấu giá xa xỉ chuẩn thời gian server, minh bạch từng mức trả giá.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-white/90 sm:text-base">
              Khám phá các phiên đồ cổ, phỉ thúy, túi limited và vật phẩm sưu tầm đẳng cấp với giao
              diện đỏ đô - trắng sang trọng.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to={heroAuction ? `/auctions/${heroAuction.id}` : '/explore'}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#7A1F2B] transition hover:bg-[#FCEDEF]"
              >
                <Gem className="h-4 w-4" />
                Khám phá phiên tâm điểm
              </Link>
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/35 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <Sparkles className="h-4 w-4" />
                Xem toàn bộ phiên
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
            {heroAuction?.imageUrl ? (
              <img
                src={heroAuction.imageUrl}
                alt={heroAuction.title}
                className="h-64 w-full rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-64 w-full items-center justify-center rounded-2xl bg-white/20">
                <Gem className="h-14 w-14 text-white/80" />
              </div>
            )}
            <div className="mt-4 space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-white/75">Sản phẩm nổi bật</p>
              <p className="line-clamp-2 text-lg font-semibold">
                {heroAuction?.title ?? 'Đang cập nhật phiên nổi bật'}
              </p>
              <p className="text-sm text-white/85">
                Giá hiện tại:{' '}
                <span className="font-bold">
                  {(heroAuction?.currentPrice ?? 0).toLocaleString('vi-VN')} VNĐ
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7A1F2B]">
              Active Session
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Phiên đang diễn ra</h2>
          </div>
          <Link to="/explore?status=ACTIVE" className="text-sm font-semibold text-[#7A1F2B]">
            Xem thêm
          </Link>
        </div>
        {activeLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Đang tải dữ liệu phiên đang diễn ra...
          </div>
        ) : activeAuctions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Hiện chưa có phiên nào đang mở.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {activeAuctions.map((auction) => (
              <HomeAuctionCard key={auction.id} auction={auction} type="active" />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7A1F2B]">
              Scheduled Session
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Sắp lên sàn</h2>
          </div>
          <Link to="/explore?status=PENDING" className="text-sm font-semibold text-[#7A1F2B]">
            Xem thêm
          </Link>
        </div>
        {scheduledLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Đang tải dữ liệu phiên sắp mở...
          </div>
        ) : scheduledAuctions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Chưa có phiên nào được lên lịch.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {scheduledAuctions.map((auction) => (
              <HomeAuctionCard key={auction.id} auction={auction} type="scheduled" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function HomeAuctionCard({
  auction,
  type,
}: {
  auction: HomeAuction;
  type: 'active' | 'scheduled';
}) {
  const countdown = useCountdown(type === 'active' ? auction.endTime : undefined);
  const timeLabel =
    type === 'active'
      ? countdown.display
      : new Date(auction.startTime).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

  return (
    <Link to={`/auctions/${auction.id}`} className="group block">
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
        {auction.imageUrl ? (
          <img src={auction.imageUrl} alt={auction.title} className="h-44 w-full object-cover" />
        ) : (
          <div className="flex h-44 w-full items-center justify-center bg-[#FAE8EB] text-[#7A1F2B]">
            <Gem className="h-10 w-10" />
          </div>
        )}
        <div className="space-y-3 p-4">
          <p className="line-clamp-2 text-base font-semibold text-slate-900">{auction.title}</p>
          <p className="text-sm font-bold text-[#7A1F2B]">
            {auction.currentPrice.toLocaleString('vi-VN')} VNĐ
          </p>
          <div
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
              type === 'active' ? 'bg-[#FFF0F2] text-[#7A1F2B]' : 'bg-slate-50 text-slate-700'
            }`}
          >
            {type === 'active' ? (
              <Clock3 className="h-4 w-4" />
            ) : (
              <CalendarClock className="h-4 w-4" />
            )}
            <span>
              {type === 'active' ? `Đếm ngược: ${timeLabel}` : `Mở phiên lúc: ${timeLabel}`}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
