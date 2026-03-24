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
      <div className="border-b border-amber-100 bg-amber-50 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
          Auction result
        </p>
        <h3 className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Trophy className="h-5 w-5 text-amber-500" />
          Ket qua phien dau gia
        </h3>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-[20px] border border-amber-200 bg-white px-4 py-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Gia chot cuoi
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {finalAmount.toLocaleString('vi-VN')} đ
          </p>
          <p className="mt-3 text-sm text-slate-500">Nguoi thang: {winnerName}</p>
        </div>

        <div className="rounded-[20px] bg-slate-50 px-4 py-4 text-sm text-slate-600">
          <p>
            <span className="font-medium text-slate-900">Thoi diem ket thuc:</span> {timestamp}
          </p>
          <p className="mt-2">
            <span className="font-medium text-slate-900">Trang thai cua ban:</span>{' '}
            {isCurrentUserWinner ? 'Ban da thang phien nay.' : 'Ban khong phai nguoi chien thang.'}
          </p>
        </div>

        <Link
          to="/auctions"
          className="flex h-12 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Quay lai danh sach dau gia
        </Link>
      </div>
    </section>
  );
}
