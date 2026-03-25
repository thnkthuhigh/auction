import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowUpRight, Gavel, Sparkles } from 'lucide-react';
import type { Auction } from '@auction/shared';

interface Props {
  auction: Auction;
  onPlaceBid: (amount: number) => void;
  isLoading?: boolean;
}

type BidFormValues = {
  amount: number;
};

export default function BidForm({ auction, onPlaceBid, isLoading }: Props) {
  const minBid = auction.currentPrice + auction.minBidStep;
  const isExpiredByTime = new Date(auction.endTime).getTime() <= Date.now();
  const canBid = auction.status === 'ACTIVE' && !isExpiredByTime && !isLoading;

  const getDisabledReason = () => {
    if (isLoading) return 'Dang gui lenh bid...';
    if (auction.status === 'PENDING') return 'Dau gia chua bat dau';
    if (auction.status === 'REVIEW') return 'San pham dang cho duyet';
    if (auction.status === 'CANCELLED') return 'Phien da bi huy';
    if (isExpiredByTime) return 'Dau gia da het thoi gian';
    return 'Dau gia da ket thuc';
  };

  const disabledReason = getDisabledReason();

  const schema = z.object({
    amount: z
      .number({ invalid_type_error: 'Vui long nhap so tien' })
      .int('So tien phai la so nguyen')
      .min(minBid, `Gia thau toi thieu ${minBid.toLocaleString('vi-VN')} VND`),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
    setValue,
    watch,
    reset,
  } = useForm<BidFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const quickBids = [minBid, minBid + auction.minBidStep, minBid + auction.minBidStep * 2];
  const enteredAmount = watch('amount');

  const getBidValidationError = (amount: number): string | null => {
    if (!canBid) return disabledReason;

    if (!Number.isFinite(amount) || amount <= 0) {
      return 'Vui long nhap gia hop le';
    }

    if (!Number.isInteger(amount)) {
      return 'So tien phai la so nguyen';
    }

    if (amount < minBid) {
      return `Gia thau toi thieu ${minBid.toLocaleString('vi-VN')} VND`;
    }

    const diffFromCurrent = amount - auction.currentPrice;
    if (diffFromCurrent % auction.minBidStep !== 0) {
      const roundedDiff = Math.ceil(diffFromCurrent / auction.minBidStep) * auction.minBidStep;
      const nextValidBid = auction.currentPrice + roundedDiff;
      return `Gia bid phai theo buoc ${auction.minBidStep.toLocaleString('vi-VN')} VND. Goi y: ${nextValidBid.toLocaleString('vi-VN')} VND`;
    }

    return null;
  };

  const submitBid = (amount: number) => {
    const errorMessage = getBidValidationError(amount);
    if (errorMessage) {
      setError('amount', { type: 'manual', message: errorMessage });
      return;
    }

    clearErrors('amount');
    onPlaceBid(amount);
    reset();
  };

  const onSubmit = ({ amount }: BidFormValues) => {
    submitBid(amount);
  };

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Bid panel
          </p>
          <h3 className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Gavel className="h-5 w-5 text-blue-600" />
            Dat gia thau
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <Sparkles className="h-3.5 w-3.5" />
          Toi thieu {minBid.toLocaleString('vi-VN')} VND
        </span>
      </div>

      <div className="mt-4 grid gap-3 rounded-[20px] bg-slate-50 p-4 sm:grid-cols-2">
        <SummaryCell
          label="Gia hien tai"
          value={`${auction.currentPrice.toLocaleString('vi-VN')} VND`}
          tone="blue"
        />
        <SummaryCell
          label="Buoc gia"
          value={`${auction.minBidStep.toLocaleString('vi-VN')} VND`}
          tone="slate"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {quickBids.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => {
              setValue('amount', amount, { shouldValidate: true });
              submitBid(amount);
            }}
            disabled={!canBid}
            className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            {amount.toLocaleString('vi-VN')} VND
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Nhap gia tuy chinh</span>
          <input
            {...register('amount', { valueAsNumber: true })}
            id="bid-amount-input"
            type="number"
            step="1"
            min={minBid}
            placeholder={`Toi thieu ${minBid.toLocaleString('vi-VN')}`}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={!canBid}
          />
          {errors.amount && <p className="mt-1 text-xs text-rose-500">{errors.amount.message}</p>}
        </label>

        <button
          type="submit"
          disabled={!canBid}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <ArrowUpRight className="h-4 w-4" />
          {isLoading ? 'Dang xu ly...' : 'Gui muc gia'}
        </button>
      </form>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Moi gia dat phai cao hon gia hien tai va theo dung buoc gia toi thieu cua phien.
      </p>
      {Number.isFinite(enteredAmount) && enteredAmount > 0 && (
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Gia hop le tiep theo toi thieu: {minBid.toLocaleString('vi-VN')} VND
        </p>
      )}

      {!canBid && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          {disabledReason}
        </div>
      )}
    </section>
  );
}

function SummaryCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'blue' | 'slate';
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        tone === 'blue' ? 'border-blue-200 bg-white text-blue-700' : 'border-slate-200 bg-white'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}
