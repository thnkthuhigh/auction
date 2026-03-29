const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

function toValidDate(value: string | number | Date): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatTimeVN(value: string | number | Date, fallback = '-'): string {
  const date = toValidDate(value);
  if (!date) return fallback;
  return date.toLocaleTimeString('vi-VN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: VIETNAM_TIMEZONE,
  });
}

export function formatDateTimeVN(value: string | number | Date, fallback = '-'): string {
  const date = toValidDate(value);
  if (!date) return fallback;
  return date.toLocaleString('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
  });
}

export function formatDateVN(value: string | number | Date, fallback = '-'): string {
  const date = toValidDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
  });
}
