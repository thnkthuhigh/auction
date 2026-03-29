import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowUpRight, Gavel, Sparkles } from 'lucide-react';
import type { Auction } from '@auction/shared';

interface Props {
  auction: Auction;
  onPlaceBid: (amount: number) => Promise<void>;
  isLoading?: boolean;
}

type BidFormValues = {
  amount: number;
};

function getBidSubmitErrorMessage(error: unknown): string {
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

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Không thể gửi giá đặt. Vui lòng thử lại.';
}

export default function BidForm({ auction, onPlaceBid, isLoading }: Props) {
  const minBid = auction.currentPrice + auction.minBidStep;
  const isExpiredByTime = new Date(auction.endTime).getTime() <= Date.now();
  const canBid = auction.status === 'ACTIVE' && !isExpiredByTime && !isLoading;

  const getDisabledReason = () => {
    if (isLoading) return 'Đang gửi lệnh bid...';
    if (auction.status === 'PENDING') return 'Phiên chưa bắt đầu';
    if (auction.status === 'REVIEW') return 'Sản phẩm đang chờ duyệt';
    if (auction.status === 'SUSPENDED') return 'Phiên đang tạm dừng để kiểm tra';
    if (auction.status === 'CANCELLED') return 'Phiên đã bị huỷ';
    if (isExpiredByTime) return 'Phiên đã hết thời gian';
    return 'Phiên đã kết thúc';
  };

  const disabledReason = getDisabledReason();

  const schema = z.object({
    amount: z
      .number({ invalid_type_error: 'Vui lòng nhập số tiền' })
      .int('Số tiền phải là số nguyên')
      .min(minBid, `Giá thầu tối thiểu ${minBid.toLocaleString('vi-VN')} VNĐ`),
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
      return 'Vui lòng nhập giá hợp lệ';
    }

    if (!Number.isInteger(amount)) {
      return 'Số tiền phải là số nguyên';
    }

    if (amount < minBid) {
      return `Giá thầu tối thiểu ${minBid.toLocaleString('vi-VN')} VNĐ`;
    }

    const diffFromCurrent = amount - auction.currentPrice;
    if (diffFromCurrent % auction.minBidStep !== 0) {
      const roundedDiff = Math.ceil(diffFromCurrent / auction.minBidStep) * auction.minBidStep;
      const nextValidBid = auction.currentPrice + roundedDiff;
      return `Giá bid phải theo bước ${auction.minBidStep.toLocaleString('vi-VN')} VNĐ. Gợi ý: ${nextValidBid.toLocaleString('vi-VN')} VNĐ`;
    }

    return null;
  };

  const submitBid = async (amount: number) => {
    const errorMessage = getBidValidationError(amount);
    if (errorMessage) {
      setError('amount', { type: 'manual', message: errorMessage });
      return;
    }

    clearErrors('amount');
    try {
      await onPlaceBid(amount);
      reset();
    } catch (error: unknown) {
      setError('amount', {
        type: 'server',
        message: getBidSubmitErrorMessage(error),
      });
    }
  };

  const onSubmit = ({ amount }: BidFormValues) => {
    void submitBid(amount);
  };

  return (
    <section className="rounded-[24px] border border-[#E7B8C1] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Bảng đặt giá
          </p>
          <h3 className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Gavel className="h-5 w-5 text-[#7A1F2B]" />
            Đặt giá
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF1F3] px-3 py-1 text-xs font-semibold text-[#7A1F2B]">
          <Sparkles className="h-3.5 w-3.5" />
          Tối thiểu {minBid.toLocaleString('vi-VN')} VNĐ
        </span>
      </div>

      <div className="mt-4 grid gap-3 rounded-[20px] bg-slate-50 p-4 sm:grid-cols-2">
        <SummaryCell
          label="Giá hiện tại"
          value={`${auction.currentPrice.toLocaleString('vi-VN')} VNĐ`}
          tone="brand"
        />
        <SummaryCell
          label="Bước giá"
          value={`${auction.minBidStep.toLocaleString('vi-VN')} VNĐ`}
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
              void submitBid(amount);
            }}
            disabled={!canBid}
            className="rounded-2xl border border-[#E7B8C1] bg-[#FFF1F3] px-3 py-3 text-sm font-semibold text-[#7A1F2B] transition hover:bg-[#FDE7EB] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            {amount.toLocaleString('vi-VN')} VNĐ
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Nhập giá tuỳ chỉnh</span>
          <input
            {...register('amount', {
              valueAsNumber: true,
              onChange: () => {
                clearErrors('amount');
              },
            })}
            id="bid-amount-input"
            type="number"
            step="1"
            min={minBid}
            placeholder={`Tối thiểu ${minBid.toLocaleString('vi-VN')}`}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#A63E53] focus:ring-4 focus:ring-[#F6D9DF] disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={!canBid}
          />
          {errors.amount && <p className="mt-1 text-xs text-rose-500">{errors.amount.message}</p>}
        </label>

        <button
          type="submit"
          disabled={!canBid}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#7A1F2B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#611521] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <ArrowUpRight className="h-4 w-4" />
          {isLoading ? 'Đang xử lý...' : 'ĐẶT GIÁ'}
        </button>
      </form>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Mọi giá đặt phải cao hơn giá hiện tại và theo đúng bước giá tối thiểu của phiên.
      </p>
      {Number.isFinite(enteredAmount) && enteredAmount > 0 && (
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Giá hợp lệ tiếp theo tối thiểu: {minBid.toLocaleString('vi-VN')} VNĐ
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
  tone: 'brand' | 'slate';
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        tone === 'brand' ? 'border-[#E7B8C1] bg-white text-[#7A1F2B]' : 'border-slate-200 bg-white'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}
