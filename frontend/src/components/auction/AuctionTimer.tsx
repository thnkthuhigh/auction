import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarClock, Clock3, ShieldAlert, TimerReset } from 'lucide-react';
import { useCountdown } from '@/hooks/useCountdown';

interface Props {
  startTime: string;
  endTime: string;
  status: string;
  serverTimeOffsetMs?: number;
}

export default function AuctionTimer({
  startTime,
  endTime,
  status,
  serverTimeOffsetMs = 0,
}: Props) {
  const countdownTarget =
    status === 'ACTIVE' ? endTime : status === 'PENDING' ? startTime : undefined;
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
          isUrgent ? 'border-rose-300 bg-rose-50' : 'border-blue-200 bg-blue-50'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
              isUrgent ? 'bg-rose-100 text-rose-600' : 'bg-white text-blue-600'
            }`}
          >
            <Clock3 className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Dang dau gia
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">Dem nguoc den luc ket thuc</p>
            <p className="mt-1 text-sm text-slate-500">
              {isExpired ? 'Phien da het thoi gian.' : `Ket thuc luc ${formattedEndTime}`}
            </p>

            {isExpired ? (
              <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-600">
                Phien dang cho he thong chot trang thai.
              </p>
            ) : (
              <div className="mt-4 flex items-center gap-2">
                <TimeBlock label="Gio" value={hours} urgent={isUrgent} />
                <Colon urgent={isUrgent} />
                <TimeBlock label="Phut" value={minutes} urgent={isUrgent} />
                <Colon urgent={isUrgent} />
                <TimeBlock label="Giay" value={seconds} urgent={isUrgent} />
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
              Phien cho mo
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {startsInFuture ? 'Sap bat dau' : 'Dang o trang thai ban nhap'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {startsInFuture
                ? `Du kien mo luc ${formattedStartTime}`
                : 'Seller van co the cap nhat hoac gui duyet phien nay.'}
            </p>

            {startsInFuture && !isExpired ? (
              <div className="mt-4 flex items-center gap-2">
                <TimeBlock label="Gio" value={hours} urgent={false} />
                <Colon urgent={false} />
                <TimeBlock label="Phut" value={minutes} urgent={false} />
                <Colon urgent={false} />
                <TimeBlock label="Giay" value={seconds} urgent={false} />
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                Chua the dat gia cho toi khi phien duoc mo cong khai.
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (status === 'REVIEW') {
    return (
      <section className="rounded-[24px] border border-blue-200 bg-blue-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600">
            <ShieldAlert className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Cho duyet
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              San pham dang cho admin phe duyet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Phien se duoc hien thi cong khai sau khi qua buoc kiem duyet.
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
            {status === 'CANCELLED' ? 'Da huy' : 'Da ket thuc'}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {status === 'CANCELLED' ? 'Phien khong con dien ra' : 'Phien da dong'}
          </p>
          <p className="mt-1 text-sm text-slate-500">Ket thuc luc {formattedEndTime}</p>
        </div>
      </div>
    </section>
  );
}

function Colon({ urgent }: { urgent: boolean }) {
  return (
    <span className={`text-2xl font-bold ${urgent ? 'text-rose-600' : 'text-blue-600'}`}>:</span>
  );
}

function TimeBlock({ label, value, urgent }: { label: string; value: number; urgent: boolean }) {
  return (
    <div className="min-w-[4.75rem] rounded-2xl bg-white px-3 py-3 text-center shadow-sm">
      <div className={`text-2xl font-bold font-mono ${urgent ? 'text-rose-600' : 'text-blue-600'}`}>
        {String(value).padStart(2, '0')}
      </div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
    </div>
  );
}
