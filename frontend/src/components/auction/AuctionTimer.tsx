import { Clock } from 'lucide-react';
import { useCountdown } from '@/hooks/useCountdown';

interface Props {
  endTime: string;
  status: string;
}

/**
 * TV5 phụ trách component này
 */
export default function AuctionTimer({ endTime, status }: Props) {
  const { hours, minutes, seconds, isExpired, isUrgent, display } = useCountdown(endTime);

  if (status !== 'ACTIVE') return null;

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl border-2 ${isUrgent ? 'border-red-300 bg-red-50' : 'border-blue-200 bg-blue-50'}`}
    >
      <Clock className={`h-5 w-5 ${isUrgent ? 'text-red-500' : 'text-blue-500'}`} />
      <div>
        <p className="text-xs text-gray-500 font-medium">Thời gian còn lại</p>
        {isExpired ? (
          <p className="text-lg font-bold text-gray-500">Đã kết thúc</p>
        ) : (
          <div className="flex items-center gap-2">
            <TimeBlock label="Giờ" value={hours} urgent={isUrgent} />
            <span className={`text-2xl font-bold ${isUrgent ? 'text-red-600' : 'text-blue-600'}`}>
              :
            </span>
            <TimeBlock label="Phút" value={minutes} urgent={isUrgent} />
            <span className={`text-2xl font-bold ${isUrgent ? 'text-red-600' : 'text-blue-600'}`}>
              :
            </span>
            <TimeBlock label="Giây" value={seconds} urgent={isUrgent} />
          </div>
        )}
      </div>
    </div>
  );
}

function TimeBlock({ label, value, urgent }: { label: string; value: number; urgent: boolean }) {
  return (
    <div className="text-center">
      <div
        className={`text-2xl font-bold font-mono min-w-[2.5rem] ${urgent ? 'text-red-600' : 'text-blue-600'}`}
      >
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}
