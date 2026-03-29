import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarClock, Clock3, PauseCircle, ShieldAlert, TimerReset } from 'lucide-react';
import { useCountdown } from '@/hooks/useCountdown';

interface Props {
  startTime: string;
  endTime: string;
  status: string;
  reviewStatus?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  serverTimeOffsetMs?: number;
}

export default function AuctionTimer({
  startTime,
  endTime,
  status,
  reviewStatus,
  serverTimeOffsetMs = 0,
}: Props) {
  const isPendingApproved = status === 'PENDING' && reviewStatus === 'APPROVED';
  const countdownTarget = status === 'ACTIVE' ? endTime : isPendingApproved ? startTime : undefined;
  const { hours, minutes, seconds, isExpired, isUrgent } = useCountdown(
    countdownTarget,
    serverTimeOffsetMs,
  );

  const formattedStartTime = format(new Date(startTime), 'HH:mm dd/MM/yyyy', { locale: vi });
  const formattedEndTime = format(new Date(endTime), 'HH:mm dd/MM/yyyy', { locale: vi });

  if (status === 'ACTIVE') {
    return (
      <section
        className={`rounded-[24px] border-2 p-5 shadow-sm ${
          isUrgent ? 'border-rose-300 bg-rose-50' : 'border-[#E7B8C1] bg-[#FFF1F3]'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
              isUrgent ? 'bg-rose-100 text-rose-600' : 'bg-white text-[#7A1F2B]'
            }`}
          >
            <Clock3 className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Đang đấu giá
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">Đếm ngược đến lúc kết thúc</p>
            <p className="mt-1 text-sm text-slate-500">
              {isExpired ? 'Phiên đã hết thời gian.' : `Kết thúc lúc ${formattedEndTime}`}
            </p>

            {isExpired ? (
              <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-600">
                Phiên đang chờ hệ thống chốt trạng thái.
              </p>
            ) : (
              <div className="mt-4 flex items-center gap-2">
                <TimeBlock label="Giờ" value={hours} urgent={isUrgent} />
                <Colon urgent={isUrgent} />
                <TimeBlock label="Phút" value={minutes} urgent={isUrgent} />
                <Colon urgent={isUrgent} />
                <TimeBlock label="Giây" value={seconds} urgent={isUrgent} pulse={isUrgent} />
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (status === 'PENDING') {
    const startsInFuture = new Date(startTime).getTime() > Date.now();

    return (
      <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-amber-600">
            <TimerReset className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Phiên chờ mở
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {isPendingApproved && startsInFuture ? 'Sắp bắt đầu' : 'Đang ở trạng thái bản nháp'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {isPendingApproved && startsInFuture
                ? `Dự kiến mở lúc ${formattedStartTime}`
                : 'Seller vẫn có thể cập nhật hoặc gửi duyệt phiên này.'}
            </p>

            {isPendingApproved && startsInFuture && !isExpired ? (
              <div className="mt-4 flex items-center gap-2">
                <TimeBlock label="Giờ" value={hours} urgent={false} />
                <Colon urgent={false} />
                <TimeBlock label="Phút" value={minutes} urgent={false} />
                <Colon urgent={false} />
                <TimeBlock label="Giây" value={seconds} urgent={false} />
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                Chưa thể đặt giá cho tới khi phiên được mở công khai.
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (status === 'REVIEW') {
    return (
      <section className="rounded-[24px] border border-[#E7B8C1] bg-[#FFF3F5] p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#7A1F2B]">
            <ShieldAlert className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Chờ duyệt
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              Sản phẩm đang chờ admin phê duyệt
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Phiên sẽ được hiển thị công khai sau khi qua bước kiểm duyệt.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (status === 'SUSPENDED') {
    return (
      <section className="rounded-[24px] border border-orange-200 bg-orange-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-orange-600">
            <PauseCircle className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Tạm dừng
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              Phiên đang được tạm dừng để kiểm tra
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Tạm dừng lúc {formattedEndTime}. Không nhận thêm lượt đặt giá mới.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <CalendarClock className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {status === 'CANCELLED' ? 'Đã hủy' : 'Đã kết thúc'}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {status === 'CANCELLED' ? 'Phiên không còn diễn ra' : 'Phiên đã đóng'}
          </p>
          <p className="mt-1 text-sm text-slate-500">Kết thúc lúc {formattedEndTime}</p>
        </div>
      </div>
    </section>
  );
}

function Colon({ urgent }: { urgent: boolean }) {
  return (
    <span className={`text-2xl font-bold ${urgent ? 'text-rose-600' : 'text-[#7A1F2B]'}`}>:</span>
  );
}

function TimeBlock({
  label,
  value,
  urgent,
  pulse = false,
}: {
  label: string;
  value: number;
  urgent: boolean;
  pulse?: boolean;
}) {
  return (
    <div className="min-w-[4.75rem] rounded-2xl bg-white px-3 py-3 text-center shadow-sm">
      <div
        className={`font-mono text-2xl font-bold ${urgent ? 'text-rose-600' : 'text-[#7A1F2B]'} ${
          pulse ? 'animate-pulse' : ''
        }`}
      >
        {String(value).padStart(2, '0')}
      </div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
    </div>
  );
}
