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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        Kết quả đấu giá
      </h3>

      <div className="rounded-lg border border-gray-200 p-4 text-center">
        <p className="text-xs text-gray-500">Kết quả cuối cùng</p>
        <p className="mt-1 text-3xl font-extrabold text-blue-600">
          {finalAmount.toLocaleString('vi-VN')} ₫
        </p>
        <p className="mt-2 text-sm text-gray-500">Người thắng: {winnerName}</p>
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        <p>Người thắng: {winnerName}</p>
        <p>Giá cuối: {finalAmount.toLocaleString('vi-VN')} ₫</p>
        <p>Kết thúc lúc: {timestamp}</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Trạng thái phiên đấu giá
        </label>
        <input
          value={
            isCurrentUserWinner ? 'Bạn đã thắng phiên đấu giá' : 'Bạn đã không thắng phiên đấu giá'
          }
          readOnly
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
        />

        <a
          href="/"
          className="w-full h-12 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center"
        >
          Về trang chủ
        </a>
      </div>
    </div>
  );
}
