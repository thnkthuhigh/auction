import { useEffect, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarClock,
  Clock3,
  Gavel,
  Send,
  ShieldCheck,
  Tag,
  UserRound,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { auctionService } from '@/services/auction.service';
import { useAuctionSocket } from '@/hooks/useAuctionSocket';
import { useAuctionStore } from '@/store/auction.store';
import { useAuthStore } from '@/store/auth.store';
import AuctionTimer from '@/components/auction/AuctionTimer';
import BidForm from '@/components/auction/BidForm';
import BidHistory from '@/components/auction/BidHistory';
import WinnerCard from '@/components/auction/WinnerCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { Auction, AuctionStatus, Bid } from '@auction/shared';

type AuctionDetailData = Auction & {
  seller?: {
    id?: string;
    username?: string;
    avatar?: string | null;
  };
  winner?: {
    id?: string;
    username?: string;
  };
  category?: {
    id?: string;
    name?: string;
    slug?: string;
  };
};

const STATUS_META: Record<
  AuctionStatus,
  { label: string; badgeClass: string; panelClass: string; summary: string }
> = {
  PENDING: {
    label: 'Ban nhap',
    badgeClass: 'bg-amber-100 text-amber-800',
    panelClass: 'border-amber-200 bg-amber-50',
    summary: 'Phien dang o trang thai nhap va chua mo dau gia.',
  },
  REVIEW: {
    label: 'Cho duyet',
    badgeClass: 'bg-blue-100 text-blue-800',
    panelClass: 'border-blue-200 bg-blue-50',
    summary: 'San pham dang cho admin kiem duyet truoc khi hien thi cong khai.',
  },
  ACTIVE: {
    label: 'Dang dau gia',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    panelClass: 'border-emerald-200 bg-emerald-50',
    summary: 'Nguoi mua co the theo doi va dat gia theo thoi gian thuc.',
  },
  ENDED: {
    label: 'Da ket thuc',
    badgeClass: 'bg-slate-200 text-slate-700',
    panelClass: 'border-slate-200 bg-slate-50',
    summary: 'Phien da dong, ket qua va lich su gia van duoc giu lai.',
  },
  CANCELLED: {
    label: 'Da huy',
    badgeClass: 'bg-rose-100 text-rose-700',
    panelClass: 'border-rose-200 bg-rose-50',
    summary: 'Phien nay khong con mo va khong chap nhan them gia dat.',
  },
};

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const {
    liveBids,
    setActiveAuction,
    activeAuction,
    resetAuction,
    viewersCount,
    serverTimeOffsetMs,
  } = useAuctionStore();
  useAuctionSocket(id);
  const queryClient = useQueryClient();

  const {
    data: auction,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['auction', id],
    queryFn: () => auctionService.getAuctionById(id!),
    enabled: Boolean(id),
  });

  const { data: bidsData, isLoading: bidsLoading } = useQuery({
    queryKey: ['bids', id],
    queryFn: () => auctionService.getBids(id!),
    enabled: Boolean(id),
  });

  const submitMutation = useMutation({
    mutationFn: () => auctionService.submitForReview(id!),
    onSuccess: () => {
      toast.success('Gui duyet thanh cong! Admin se kiem tra san pham cua ban.');
      queryClient.invalidateQueries({ queryKey: ['auction', id] });
    },
    onError: (mutationError: { response?: { data?: { message?: string } } }) => {
      toast.error(mutationError.response?.data?.message || 'Gui duyet that bai');
    },
  });

  const placeBidMutation = useMutation({
    mutationFn: (amount: number) => auctionService.placeBid(id!, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auction', id] });
      queryClient.invalidateQueries({ queryKey: ['bids', id] });
    },
  });

  useEffect(() => {
    if (auction) {
      setActiveAuction(auction);
    }

    return () => resetAuction();
  }, [auction, setActiveAuction, resetAuction]);

  if (isLoading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white py-24">
        <LoadingSpinner size="lg" text="Dang tai chi tiet san pham..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-12 text-center">
        <p className="text-lg font-semibold text-rose-700">Khong the tai chi tiet dau gia</p>
        <p className="mt-2 text-sm text-rose-600">
          {error instanceof Error ? error.message : 'Da xay ra loi khong xac dinh.'}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
        >
          Thu lai
        </button>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-16 text-center">
        <p className="text-lg font-semibold text-slate-900">Khong tim thay dau gia</p>
        <p className="mt-2 text-sm text-slate-500">
          Phien ban dang mo co the da bi xoa hoac duong dan khong con hop le.
        </p>
        <Link
          to="/auctions"
          className="mt-5 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Quay lai danh sach
        </Link>
      </div>
    );
  }

  const sourceAuction = auction as AuctionDetailData;
  const displayAuction = (activeAuction ?? auction) as AuctionDetailData;
  const allBids: Bid[] = liveBids.length > 0 ? liveBids : ((bidsData?.data ?? []) as Bid[]);
  const now = Date.now();
  const endTime = new Date(displayAuction.endTime).getTime();
  const isCompleted = displayAuction.status === 'ENDED' || now > endTime;
  const isSeller = Boolean(user?.id && sourceAuction.sellerId === user.id);
  const isBuyerView = isAuthenticated && !isSeller;

  const winnerBid =
    allBids.length > 0
      ? allBids.reduce((maxBid: Bid, currentBid: Bid) =>
          currentBid.amount > maxBid.amount ? currentBid : maxBid,
        )
      : null;
  const leaderName = winnerBid?.bidderUsername;

  const sellerName =
    displayAuction.sellerUsername ||
    sourceAuction.sellerUsername ||
    sourceAuction.seller?.username ||
    'Nguoi ban';
  const categoryName =
    displayAuction.categoryName ||
    sourceAuction.categoryName ||
    sourceAuction.category?.name ||
    'Chua phan loai';
  const winnerName =
    winnerBid?.bidderUsername ||
    displayAuction.winnerUsername ||
    sourceAuction.winnerUsername ||
    sourceAuction.winner?.username;
  const finalAmount = winnerBid?.amount ?? displayAuction.currentPrice;
  const winnerUserId = winnerBid?.bidderId ?? displayAuction.winnerId;
  const isCurrentUserWinner = Boolean(user?.id && winnerUserId && user.id === winnerUserId);
  const winnerTimestamp = format(
    new Date(winnerBid?.createdAt ?? displayAuction.endTime),
    'HH:mm dd/MM/yyyy',
    { locale: vi },
  );
  const statusMeta = STATUS_META[displayAuction.status];

  const handlePlaceBid = async (amount: number) => {
    await placeBidMutation.mutateAsync(amount);
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(135deg,#f8fbff_0%,#ffffff_46%,#eff6ff_100%)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4">
          <Link
            to="/auctions"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lai danh sach dau gia
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}
            >
              {statusMeta.label}
            </span>
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600">
              {categoryName}
            </span>
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-500">
              #{sourceAuction.id.slice(0, 8)}
            </span>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),18rem]">
            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {sourceAuction.title}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                {sourceAuction.description}
              </p>
            </div>

            <div className={`rounded-[24px] border p-5 ${statusMeta.panelClass}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Trang thai hien tai
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{statusMeta.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{statusMeta.summary}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HeroMetric
              label="Gia hien tai"
              value={`${displayAuction.currentPrice.toLocaleString('vi-VN')} đ`}
            />
            <HeroMetric label="Tong luot bid" value={String(displayAuction.totalBids)} />
            <HeroMetric label="Nguoi dang xem" value={String(viewersCount)} />
            <HeroMetric
              label="Gia khoi diem"
              value={`${sourceAuction.startPrice.toLocaleString('vi-VN')} đ`}
            />
            <HeroMetric
              label="Buoc gia"
              value={`${displayAuction.minBidStep.toLocaleString('vi-VN')} đ`}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),23rem]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            {sourceAuction.imageUrl ? (
              <img
                src={sourceAuction.imageUrl}
                alt={sourceAuction.title}
                className="aspect-[16/9] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,#f8fafc,#e2e8f0)] text-slate-400">
                <Tag className="h-16 w-16" />
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Product profile
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Thong tin chi tiet</h2>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                Tao luc {format(new Date(sourceAuction.createdAt), 'dd/MM/yyyy', { locale: vi })}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoCard
                icon={<UserRound className="h-4 w-4 text-slate-500" />}
                label="Nguoi ban"
                value={sellerName}
              />
              <InfoCard
                icon={<Tag className="h-4 w-4 text-slate-500" />}
                label="Danh muc"
                value={categoryName}
              />
              <InfoCard
                icon={<CalendarClock className="h-4 w-4 text-slate-500" />}
                label="Bat dau"
                value={format(new Date(sourceAuction.startTime), 'HH:mm dd/MM/yyyy', {
                  locale: vi,
                })}
              />
              <InfoCard
                icon={<Clock3 className="h-4 w-4 text-slate-500" />}
                label="Ket thuc"
                value={format(new Date(sourceAuction.endTime), 'HH:mm dd/MM/yyyy', {
                  locale: vi,
                })}
              />
            </div>

            <div className="mt-5 rounded-[24px] bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Mo ta san pham</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{sourceAuction.description}</p>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Bid activity
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Lich su dat gia ({allBids.length})
                </h2>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                {bidsLoading ? 'Dang tai lich su...' : `${displayAuction.totalBids} luot gia`}
              </div>
            </div>

            <div className="mt-5">
              <BidHistory bids={allBids} currentUserId={user?.id} winnerBidId={winnerBid?.id} />
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <AuctionTimer
            startTime={sourceAuction.startTime}
            endTime={sourceAuction.endTime}
            status={displayAuction.status}
            serverTimeOffsetMs={serverTimeOffsetMs}
          />

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Live ranking
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">Nguoi dang Top 1</h3>
            {leaderName ? (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-medium text-emerald-800">{leaderName}</p>
                <p className="mt-1 text-sm text-emerald-700">
                  {winnerBid?.amount.toLocaleString('vi-VN')} đ
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Chua co luot dat gia nao trong phien nay.
              </div>
            )}
          </section>

          {isCompleted && winnerName ? (
            <WinnerCard
              winnerName={winnerName}
              finalAmount={finalAmount}
              timestamp={winnerTimestamp}
              isCurrentUserWinner={isCurrentUserWinner}
            />
          ) : isCompleted ? (
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Auction result
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">Phien da ket thuc</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Khong co nguoi chien thang duoc ghi nhan cho phien nay. Ban van co the xem lai lich
                su dat gia o ben duoi.
              </p>
            </section>
          ) : isBuyerView ? (
            <BidForm
              auction={displayAuction}
              onPlaceBid={handlePlaceBid}
              isLoading={placeBidMutation.isPending}
            />
          ) : !isAuthenticated ? (
            <section className="rounded-[24px] border border-blue-200 bg-blue-50 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Tham gia dau gia
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">
                Dang nhap de dat gia theo thoi gian thuc
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Tai khoan dang nhap se nhan cap nhat gia moi va co the tham gia tra gia ngay tren
                phien nay.
              </p>
              <Link
                to="/login"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Dang nhap ngay
              </Link>
            </section>
          ) : (
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Seller action
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">Phien dau gia cua ban</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Theo doi trang thai hien tai va gui duyet khi san pham da san sang de mo cong khai.
              </p>

              {sourceAuction.status === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  <Send className="h-4 w-4" />
                  {submitMutation.isPending ? 'Dang gui...' : 'Gui duyet san pham'}
                </button>
              )}

              {sourceAuction.status === 'REVIEW' && (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  Ho so dang cho admin kiem tra. Ban tam thoi chua can thuc hien thao tac them.
                </div>
              )}

              {sourceAuction.status !== 'PENDING' && sourceAuction.status !== 'REVIEW' && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Phien da sang giai doan cong khai. Ban co the theo doi gia va lich su dat gia ben
                  duoi.
                </div>
              )}
            </section>
          )}

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Auction notes
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Luu y khi theo doi</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>Gia hien tai se cap nhat theo realtime neu phien dang ACTIVE.</li>
                  <li>Lich su bid duoc sap xep tu muc cao nhat xuong thap hon.</li>
                  <li>Chi nguoi khac seller moi co the dat gia tren phien dang mo.</li>
                </ul>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/85 px-4 py-4 shadow-sm backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 text-sm font-medium leading-6 text-slate-900">{value}</p>
    </div>
  );
}
