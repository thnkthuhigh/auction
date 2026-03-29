import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';

interface WinnerCardProps {
  winnerName: string;
  finalAmount: number;
  timestamp: string;
  isCurrentUserWinner: boolean;
}

export default function WinnerCard({
  winnerName,
  finalAmount,
  timestamp,
  isCurrentUserWinner,
}: WinnerCardProps) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-amber-200 bg-[linear-gradient(180deg,#fffdf7_0%,#ffffff_100%)] shadow-sm">
      <div className="relative border-b border-amber-100 bg-amber-50 px-5 py-4">
        <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-amber-200/40 blur-xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
          Kết quả phiên
        </p>
        <h3 className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Trophy className="h-5 w-5 text-amber-500" />
          Công bố người chiến thắng
        </h3>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-[20px] border border-amber-200 bg-white px-4 py-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Giá chốt cuối
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {finalAmount.toLocaleString('vi-VN')} ₫
          </p>
          <p className="mt-3 text-sm text-slate-500">Người thắng: {winnerName}</p>
        </div>

        <div className="rounded-[20px] bg-slate-50 px-4 py-4 text-sm text-slate-600">
          <p>
            <span className="font-medium text-slate-900">Thời điểm kết thúc:</span> {timestamp}
          </p>
          <p className="mt-2">
            <span className="font-medium text-slate-900">Trạng thái của bạn:</span>{' '}
            {isCurrentUserWinner ? 'Bạn đã thắng phiên này.' : 'Bạn không phải người chiến thắng.'}
          </p>
        </div>

        <Link
          to="/auctions"
          className="flex h-12 items-center justify-center rounded-2xl bg-[#7A1F2B] text-sm font-semibold text-white transition hover:bg-[#611521]"
        >
          Quay lại danh sách đấu giá
        </Link>
      </div>
    </section>
  );
}
