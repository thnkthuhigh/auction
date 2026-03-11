import { useState, useEffect } from 'react';
import { differenceInSeconds, parseISO } from 'date-fns';

/**
 * Hook đếm ngược thời gian cho đấu giá
 * TV5 phụ trách
 */
export function useCountdown(endTime: string | undefined) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!endTime) return;

    const update = () => {
      const diff = differenceInSeconds(parseISO(endTime), new Date());
      setSecondsLeft(Math.max(0, diff));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const isExpired = secondsLeft === 0;
  const isUrgent = secondsLeft <= 60 && secondsLeft > 0;

  return {
    hours,
    minutes,
    seconds,
    isExpired,
    isUrgent,
    display: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  };
}
