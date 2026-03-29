import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarClock,
  Clock3,
  Gauge,
  Send,
  Tag,
  UserRound,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { shallow } from 'zustand/shallow';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { auctionService } from '@/services/auction.service';
import { useAuctionSocket } from '@/hooks/useAuctionSocket';
import { useCountdown } from '@/hooks/useCountdown';
import { useAuctionStore } from '@/store/auction.store';
import { useAuthStore } from '@/store/auth.store';
import AuctionTimer from '@/components/auction/AuctionTimer';
import BidForm from '@/components/auction/BidForm';
import BidHistory from '@/components/auction/BidHistory';
import WinnerCard from '@/components/auction/WinnerCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { Auction, Bid } from '@auction/shared';

type AuctionDetailData = Auction & {
  seller?: { username?: string };
  winner?: { username?: string };
  category?: { name?: string };
};

const LIVE_AUDIO_KEY = 'auction-live-muted';
function formatVnd(value: number) {
  return `${value.toLocaleString('vi-VN')} ₫`;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message;
  }
  return error instanceof Error ? error.message : 'Có lỗi xảy ra';
}

function maskBidderName(name: string, isCurrentUser: boolean) {
  if (isCurrentUser) return `${name} (Bạn)`;
  return name.length <= 2 ? `${name[0] ?? '*'}*` : `${name[0]}***${name[name.length - 1]}`;
}

export default function AuctionDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isLiveRoom = location.pathname.endsWith('/live');
  const { user, isAuthenticated } = useAuthStore(
    (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    shallow,
  );
  const {
    liveBids,
    setActiveAuction,
    activeAuction,
    resetAuction,
    viewersCount,
    serverTimeOffsetMs,
    addLiveBid,
    updateAuctionPrice,
  } = useAuctionStore(
    (state) => ({
      liveBids: state.liveBids,
      setActiveAuction: state.setActiveAuction,
      activeAuction: state.activeAuction,
      resetAuction: state.resetAuction,
      viewersCount: state.viewersCount,
      serverTimeOffsetMs: state.serverTimeOffsetMs,
      addLiveBid: state.addLiveBid,
      updateAuctionPrice: state.updateAuctionPrice,
    }),
    shallow,
  );
  useAuctionSocket(id);
  const queryClient = useQueryClient();
  const [outbidFlash, setOutbidFlash] = useState(false);
  const [leaderSweep, setLeaderSweep] = useState(false);
  const [pricePop, setPricePop] = useState(false);
  const [latestBidId, setLatestBidId] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastLeaderRef = useRef<string | null>(null);
  const lastBidIdRef = useRef<string | null>(null);
  const lastTickSecondRef = useRef<number | null>(null);
  const bidInFlightRef = useRef(false);
  const renderCountRef = useRef(0);
  const [lastBidPerf, setLastBidPerf] = useState<{
    latencyMs: number;
    renderDelta: number;
  } | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(LIVE_AUDIO_KEY) === '1';
  });

  renderCountRef.current += 1;

  const auctionQuery = useQuery({
    queryKey: ['auction', id],
    queryFn: () => auctionService.getAuctionById(id),
    enabled: Boolean(id),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const bidsQuery = useQuery({
    queryKey: ['bids', id],
    queryFn: () => auctionService.getBids(id),
    enabled: Boolean(id),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const submitMutation = useMutation({
    mutationFn: () => auctionService.submitForReview(id),
    onSuccess: () => {
      toast.success('Đã gửi duyệt');
      queryClient.invalidateQueries({ queryKey: ['auction', id] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
  const placeBidMutation = useMutation({
    mutationFn: ({ amount }: { amount: number }) => auctionService.placeBid(id, amount),
    onSuccess: (payload) => {
      if (payload) {
        addLiveBid(payload);
        updateAuctionPrice(payload.currentPrice, payload.totalBids);
      }
    },
    onSettled: () => {
      bidInFlightRef.current = false;
    },
  });

  const auction = (activeAuction ?? auctionQuery.data) as AuctionDetailData | undefined;
  const allBids: Bid[] = useMemo(
    () => (liveBids.length > 0 ? liveBids : ((bidsQuery.data?.data ?? []) as Bid[])),
    [liveBids, bidsQuery.data],
  );
  const winnerBid = useMemo(
    () => (allBids.length ? allBids.reduce((a, b) => (a.amount > b.amount ? a : b)) : null),
    [allBids],
  );
  const liveFeed = useMemo(() => [...allBids].reverse(), [allBids]);

  useEffect(() => {
    if (!auctionQuery.data) return;
    setActiveAuction(auctionQuery.data);
    return () => resetAuction();
  }, [auctionQuery.data, setActiveAuction, resetAuction]);

  const playCue = useCallback(
    (type: 'bid' | 'tick') => {
      if (isMuted) return;
      try {
        const Ctx =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctx) return;
        if (!audioContextRef.current) {
          audioContextRef.current = new Ctx();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.type = 'triangle';
        oscillator.frequency.value = type === 'bid' ? 980 : 660;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          type === 'bid' ? 0.08 : 0.04,
          ctx.currentTime + 0.02,
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          ctx.currentTime + (type === 'bid' ? 0.15 : 0.08),
        );
        oscillator.start();
        oscillator.stop(ctx.currentTime + (type === 'bid' ? 0.16 : 0.1));
      } catch {
        // ignore audio errors
      }
    },
    [isMuted],
  );

  useEffect(() => {
    if (!isLiveRoom) return;
    const leaderId = winnerBid?.bidderId ?? null;
    const prevLeaderId = lastLeaderRef.current;
    if (prevLeaderId && leaderId && prevLeaderId !== leaderId) {
      lastLeaderRef.current = leaderId;
      setLeaderSweep(true);
      const sweepTimer = setTimeout(() => setLeaderSweep(false), 900);
      if (user?.id && prevLeaderId === user.id) {
        setOutbidFlash(true);
        const outbidTimer = setTimeout(() => setOutbidFlash(false), 1000);
        return () => {
          clearTimeout(sweepTimer);
          clearTimeout(outbidTimer);
        };
      }
      return () => clearTimeout(sweepTimer);
    }
    lastLeaderRef.current = leaderId;
  }, [isLiveRoom, winnerBid?.bidderId, user?.id]);

  useEffect(() => {
    if (!isLiveRoom || liveFeed.length === 0) return;
    const newestBid = liveFeed[liveFeed.length - 1];
    if (lastBidIdRef.current && lastBidIdRef.current !== newestBid.id) {
      setLatestBidId(newestBid.id);
      setPricePop(true);
      playCue('bid');
      const glowTimer = setTimeout(() => {
        setLatestBidId(null);
        setPricePop(false);
      }, 1400);
      lastBidIdRef.current = newestBid.id;
      return () => clearTimeout(glowTimer);
    }
    lastBidIdRef.current = newestBid.id;
  }, [isLiveRoom, liveFeed, playCue]);

  useEffect(() => {
    if (!isLiveRoom) return;
    const container = feedRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [isLiveRoom, liveFeed.length]);

  const countdown = useCountdown(
    auction?.status === 'ACTIVE' ? auction.endTime : undefined,
    serverTimeOffsetMs,
  );

  useEffect(() => {
    if (!isLiveRoom || auction?.status !== 'ACTIVE') return;
    const secondsLeft = countdown.hours * 3600 + countdown.minutes * 60 + countdown.seconds;
    if (secondsLeft > 10 || secondsLeft <= 0) {
      lastTickSecondRef.current = null;
      return;
    }
    if (lastTickSecondRef.current === secondsLeft) return;
    lastTickSecondRef.current = secondsLeft;
    playCue('tick');
  }, [isLiveRoom, auction?.status, countdown.hours, countdown.minutes, countdown.seconds, playCue]);

  useEffect(() => {
    return () => {
      const ctx = audioContextRef.current;
      if (ctx && ctx.state !== 'closed') {
        void ctx.close();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LIVE_AUDIO_KEY, isMuted ? '1' : '0');
  }, [isMuted]);

  if (auctionQuery.isLoading) return <LoadingSpinner size="lg" text="Đang tải phiên..." />;
  if (auctionQuery.isError || !auction) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        Không tải được phiên đấu giá.
      </div>
    );
  }

  const now = Date.now() + serverTimeOffsetMs;
  const isEnded = auction.status === 'ENDED' || now > new Date(auction.endTime).getTime();
  const isSeller = user?.id === auction.sellerId;
  const isBuyer = isAuthenticated && !isSeller;
  const canBidNow = isBuyer && auction.status === 'ACTIVE' && !isEnded;
  const showJoinButton = canBidNow && !isLiveRoom;
  const approxFrameMs = null as number | null;

  const joinLiveRoom = () => {
    try {
      const Ctx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!isMuted && Ctx && !audioContextRef.current) {
        audioContextRef.current = new Ctx();
      }
      if (!isMuted && audioContextRef.current?.state === 'suspended') {
        void audioContextRef.current.resume();
      }
    } catch {
      // ignore
    }
    navigate(`/auctions/${id}/live`);
  };
  const quickBids = [1, 2, 5].map((m) => auction.currentPrice + auction.minBidStep * m);
  const quickBid = async (amount: number) => {
    if (bidInFlightRef.current || placeBidMutation.isPending || !canBidNow) return;
    bidInFlightRef.current = true;
    const startedAt = performance.now();
    const renderCountBefore = renderCountRef.current;
    try {
      await placeBidMutation.mutateAsync({ amount });
      setLastBidPerf({
        latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
        renderDelta: Math.max(0, renderCountRef.current - renderCountBefore),
      });
    } catch (err) {
      bidInFlightRef.current = false;
      toast.error(getErrorMessage(err));
    }
  };

  if (isLiveRoom) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(122,31,43,0.18),_transparent_35%),linear-gradient(180deg,#1f0a10_0%,#2a1017_100%)] p-4 text-white sm:p-6">
        <div className="mx-auto max-w-[1400px] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Link
              to={`/auctions/${id}`}
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold"
            >
              Thoát phòng đấu giá
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {isMuted ? 'Tắt âm' : 'Bật âm'}
              </button>
              <div className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em]">
                Live #{auction.id.slice(0, 8)}
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr),minmax(360px,1fr)]">
            <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-black/30">
              {auction.imageUrl ? (
                <img
                  src={auction.imageUrl}
                  alt={auction.title}
                  className="h-full min-h-[460px] w-full object-cover"
                />
              ) : (
                <div className="flex min-h-[460px] items-center justify-center">
                  <Tag className="h-16 w-16 text-white/50" />
                </div>
              )}
              <span className="absolute left-4 top-4 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] animate-pulse">
                Đang đấu giá
              </span>
              <div
                className={`absolute inset-x-4 bottom-4 rounded-2xl border p-4 text-center backdrop-blur ${countdown.hours === 0 && countdown.minutes === 0 && countdown.seconds <= 10 && countdown.seconds > 0 ? 'border-rose-400 bg-rose-600/30' : 'border-white/20 bg-black/45'}`}
              >
                <p className="text-xs uppercase tracking-[0.24em] text-white/80">Đồng hồ phiên</p>
                <p className="mt-2 font-mono text-5xl font-black sm:text-6xl">
                  {auction.status === 'ACTIVE' ? countdown.display : '00:00:00'}
                </p>
              </div>
            </section>

            <aside className={`space-y-4 ${outbidFlash ? 'outbid-shake' : ''}`}>
              <section className="rounded-3xl border border-[#E7B8C1] bg-white p-5 text-slate-900">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Giá hiện tại</p>
                <p
                  className={`mt-2 text-4xl font-black text-[#7A1F2B] ${pricePop ? 'live-price-pop' : ''}`}
                >
                  {formatVnd(auction.currentPrice)}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <Metric label="Lượt bid" value={String(auction.totalBids)} />
                  <Metric label="Đang xem" value={String(viewersCount)} />
                  <Metric label="Bước giá" value={formatVnd(auction.minBidStep)} />
                </div>
                {winnerBid && (
                  <div
                    className={`relative mt-3 overflow-hidden rounded-xl border px-3 py-2 text-sm ${
                      outbidFlash
                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {leaderSweep && (
                      <span className="leader-sweep absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                    )}
                    <span className="relative z-10">Dẫn đầu: {winnerBid.bidderUsername}</span>
                  </div>
                )}
              </section>

              {canBidNow ? (
                <section className="rounded-3xl border border-[#E7B8C1] bg-white p-5 text-slate-900">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Đặt giá nhanh
                  </h3>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {quickBids.map((amount, index) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => void quickBid(amount)}
                        disabled={placeBidMutation.isPending || !canBidNow}
                        className="rounded-xl border border-[#E7B8C1] bg-[#FFF1F3] px-2 py-2 text-sm font-semibold text-[#7A1F2B] disabled:opacity-60"
                      >
                        +{index === 0 ? 1 : index === 1 ? 2 : 5} bước
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void quickBid(auction.currentPrice + auction.minBidStep)}
                    disabled={placeBidMutation.isPending || !canBidNow}
                    className="mt-3 h-12 w-full rounded-2xl bg-[#7A1F2B] text-sm font-bold uppercase text-white disabled:opacity-60"
                  >
                    {placeBidMutation.isPending
                      ? 'Đang gửi...'
                      : `Chốt giá: ${formatVnd(auction.currentPrice + auction.minBidStep)}`}
                  </button>
                </section>
              ) : !isAuthenticated ? (
                <section className="rounded-3xl border border-[#E7B8C1] bg-white p-5 text-slate-900">
                  <p className="text-sm">Đăng nhập để tham gia trả giá trong phòng live.</p>
                  <Link
                    to="/login"
                    className="mt-3 inline-flex h-10 items-center rounded-xl bg-[#7A1F2B] px-4 text-sm font-semibold text-white"
                  >
                    Đăng nhập
                  </Link>
                </section>
              ) : null}

              <section className="rounded-3xl border border-slate-200 bg-white p-4 text-slate-900">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Gauge className="h-4 w-4" />
                  <span>Live Perf</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-100 px-2 py-2">
                    <p className="text-slate-500">Render</p>
                    <p className="mt-1 font-bold text-slate-900">{renderCountRef.current}</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-2 py-2">
                    <p className="text-slate-500">Latency</p>
                    <p className="mt-1 font-bold text-slate-900">
                      {lastBidPerf ? `${lastBidPerf.latencyMs}ms` : '--'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-2 py-2">
                    <p className="text-slate-500">~ms/frame</p>
                    <p className="mt-1 font-bold text-slate-900">
                      {approxFrameMs !== null ? approxFrameMs : '--'}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Mục tiêu: ≤4 render/click, ~16.7ms/frame.
                </p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Live feed
                </h3>
                <div ref={feedRef} className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                  {liveFeed.length === 0 && (
                    <p className="text-sm text-slate-500">Chưa có lệnh bid nào.</p>
                  )}
                  {liveFeed.map((bid) => {
                    const isMine = bid.bidderId === user?.id;
                    const isLatest = bid.id === latestBidId;
                    return (
                      <div
                        key={bid.id}
                        className={`rounded-xl border px-3 py-2 text-sm ${
                          isMine ? 'border-[#E7B8C1] bg-[#FFF1F3]' : 'border-slate-200 bg-slate-50'
                        } ${isLatest ? 'live-feed-item-enter live-feed-item-glow' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">
                            {maskBidderName(bid.bidderUsername, isMine)}
                          </span>
                          <span className="font-bold text-[#7A1F2B]">{formatVnd(bid.amount)}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {format(new Date(bid.createdAt), 'HH:mm:ss dd/MM/yyyy', { locale: vi })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#E8C2C9] bg-[radial-gradient(circle_at_top_left,_rgba(122,31,43,0.14),_transparent_40%),linear-gradient(135deg,#fff6f7_0%,#ffffff_48%,#fff0f2_100%)] p-6 shadow-sm">
        <Link
          to="/auctions"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách đấu giá
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">{auction.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{auction.description}</p>
        {showJoinButton && (
          <button
            type="button"
            onClick={joinLiveRoom}
            className="mt-4 rounded-xl bg-[#7A1F2B] px-4 py-2 text-sm font-semibold text-white"
          >
            Vào phòng đấu giá
          </button>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),24rem]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            {auction.imageUrl ? (
              <img
                src={auction.imageUrl}
                alt={auction.title}
                className="aspect-[16/9] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center bg-slate-100 text-slate-400">
                <Tag className="h-16 w-16" />
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard
                icon={<UserRound className="h-4 w-4 text-slate-500" />}
                label="Người bán"
                value={auction.sellerUsername || auction.seller?.username || 'N/A'}
              />
              <InfoCard
                icon={<Tag className="h-4 w-4 text-slate-500" />}
                label="Danh mục"
                value={auction.categoryName || auction.category?.name || 'N/A'}
              />
              <InfoCard
                icon={<CalendarClock className="h-4 w-4 text-slate-500" />}
                label="Mở phiên"
                value={format(new Date(auction.startTime), 'HH:mm dd/MM/yyyy', { locale: vi })}
              />
              <InfoCard
                icon={<Clock3 className="h-4 w-4 text-slate-500" />}
                label="Kết phiên"
                value={format(new Date(auction.endTime), 'HH:mm dd/MM/yyyy', { locale: vi })}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-[24px] border border-[#E7B8C1] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Giá hiện tại
            </p>
            <p className="mt-2 text-3xl font-black text-[#7A1F2B]">
              {formatVnd(auction.currentPrice)}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <Metric label="Lượt bid" value={String(auction.totalBids)} />
              <Metric label="Đang xem" value={String(viewersCount)} />
              <Metric label="Bước giá" value={formatVnd(auction.minBidStep)} />
            </div>
          </section>

          <AuctionTimer
            startTime={auction.startTime}
            endTime={auction.endTime}
            status={auction.status}
            reviewStatus={auction.reviewStatus}
            serverTimeOffsetMs={serverTimeOffsetMs}
          />

          {showJoinButton ? (
            <section className="rounded-[24px] border border-[#E7B8C1] bg-[#FFF3F5] p-5 shadow-sm">
              <p className="text-sm text-slate-600">
                Phiên đang diễn ra. Nhấn nút để vào phòng live.
              </p>
              <button
                type="button"
                onClick={joinLiveRoom}
                className="mt-4 rounded-xl bg-[#7A1F2B] px-4 py-2 text-sm font-semibold text-white"
              >
                Vào phòng đấu giá
              </button>
            </section>
          ) : isBuyer && !isEnded ? (
            <BidForm
              auction={auction}
              onPlaceBid={async (amount) => {
                await placeBidMutation.mutateAsync({ amount });
              }}
              isLoading={placeBidMutation.isPending}
            />
          ) : !isAuthenticated ? (
            <section className="rounded-[24px] border border-[#E7B8C1] bg-[#FFF3F5] p-5 shadow-sm">
              <p className="text-sm text-slate-600">Đăng nhập để tham gia đấu giá.</p>
              <Link
                to="/login"
                className="mt-4 inline-flex rounded-xl bg-[#7A1F2B] px-4 py-2 text-sm font-semibold text-white"
              >
                Đăng nhập
              </Link>
            </section>
          ) : (
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-600">Bạn là seller hoặc phiên đã đóng.</p>
              {auction.status === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  className="mt-3 rounded-xl bg-[#7A1F2B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    {submitMutation.isPending ? 'Đang gửi...' : 'Gửi duyệt sản phẩm'}
                  </span>
                </button>
              )}
            </section>
          )}

          {winnerBid && isEnded && (
            <WinnerCard
              winnerName={auction.winnerUsername || winnerBid.bidderUsername}
              finalAmount={winnerBid.amount}
              timestamp={format(new Date(winnerBid.createdAt), 'HH:mm dd/MM/yyyy', { locale: vi })}
              isCurrentUserWinner={winnerBid.bidderId === user?.id}
            />
          )}

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">
                {allBids.length} lượt ghi nhận
              </h3>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                {bidsQuery.isLoading ? 'Đang tải...' : 'Realtime'}
              </div>
            </div>
            <div className="mt-4">
              <BidHistory bids={allBids} currentUserId={user?.id} winnerBidId={winnerBid?.id} />
            </div>
          </section>
        </aside>
      </div>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E7B8C1] bg-[#FFF1F3] px-2 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8F2A3E]">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-[#7A1F2B]">{value}</p>
    </div>
  );
}
