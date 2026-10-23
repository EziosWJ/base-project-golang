import dayjs from 'dayjs';

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('zh-CN');

export const EMPTY_TEXT = '—';

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY_TEXT;
  return currencyFormatter.format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY_TEXT;
  return numberFormatter.format(value);
}

/** Pure dates use YYYY-MM-DD and never undergo timezone conversion. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return EMPTY_TEXT;
  return value.slice(0, 10);
}

/** ISO timestamps are displayed in the viewer's local timezone. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return EMPTY_TEXT;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : value;
}

export function formatNullable(
  value: string | number | null | undefined,
  fallback: string = EMPTY_TEXT,
): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY_TEXT;
  return `${Math.round(value)}%`;
}

export function todayString(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function isDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function formatBytes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY_TEXT;
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
  let amount = value / 1024;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount.toFixed(amount >= 100 ? 0 : 1)} ${units[unit]}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return EMPTY_TEXT;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} 天 ${hours} 小时`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分`;
  return `${minutes} 分`;
}
