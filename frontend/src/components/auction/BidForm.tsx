import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Gavel } from 'lucide-react';
import type { Auction } from '@auction/shared';

interface Props {
  auction: Auction;
  onPlaceBid: (amount: number) => void;
  isLoading?: boolean;
}

export default function BidForm({ auction, onPlaceBid, isLoading }: Props) {
  const minBid = auction.currentPrice + auction.minBidStep;
  const isExpiredByTime = new Date(auction.endTime).getTime() <= Date.now();
  const canBid = auction.status === 'ACTIVE' && !isExpiredByTime && !isLoading;

  const schema = z.object({
    amount: z
      .number({ invalid_type_error: 'Vui lòng nhập số tiền' })
      .int('Số tiền phải là số nguyên')
      .min(minBid, `Giá thầu tối thiểu ${minBid.toLocaleString('vi-VN')} ₫`),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<{ amount: number }>({
    resolver: zodResolver(schema),
  });

  const onSubmit = ({ amount }: { amount: number }) => {
    if (!canBid) return;
    onPlaceBid(amount);
    reset();
  };

  const quickBids = [minBid, minBid + auction.minBidStep, minBid + auction.minBidStep * 2];

  return (
    <div className="bg-white rounded-xl border-2 border-blue-100 p-6 space-y-4">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <Gavel className="h-5 w-5 text-blue-600" />
        Đặt giá thầu
      </h3>

      <div className="bg-blue-50 rounded-lg p-3 text-center">
        <p className="text-xs text-gray-500">Giá hiện tại</p>
        <p className="text-2xl font-bold text-blue-600">
          {auction.currentPrice.toLocaleString('vi-VN')} ₫
        </p>
        <p className="text-xs text-gray-400">
          Bước giá tối thiểu: {auction.minBidStep.toLocaleString('vi-VN')} ₫
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {quickBids.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => canBid && onPlaceBid(amount)}
            disabled={!canBid}
            className="text-xs px-2 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {amount.toLocaleString('vi-VN')} ₫
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nhập giá thầu tùy chỉnh
          </label>
          <input
            {...register('amount', { valueAsNumber: true })}
            type="number"
            step="1"
            min={minBid}
            placeholder={`Tối thiểu ${minBid.toLocaleString('vi-VN')}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!canBid}
          />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
        </div>

        <button
          type="submit"
          disabled={!canBid}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Gavel className="h-4 w-4" />
          {isLoading ? 'Đang xử lý...' : 'Đặt giá'}
        </button>
      </form>

      {!canBid && (
        <p className="text-center text-sm text-gray-400">
          {auction.status === 'PENDING'
            ? 'Đấu giá chưa bắt đầu'
            : isExpiredByTime
              ? 'Đấu giá đã hết thời gian'
              : 'Đấu giá đã kết thúc'}
        </p>
      )}
    </div>
  );
}
