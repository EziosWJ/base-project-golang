import { describe, expect, it } from 'vitest';
import {
  EMPTY_TEXT,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNullable,
  formatNumber,
  formatPercent,
  isDateString,
  todayString,
} from '../../src/utils/format';

describe('format utils', () => {
  it('formats currency and numbers for zh-CN', () => {
    expect(formatCurrency(1234.5)).toContain('1,234.50');
    expect(formatCurrency(null)).toBe(EMPTY_TEXT);
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatPercent(42.6)).toBe('43%');
  });

  it('keeps pure dates unchanged and never shifts timezones', () => {
    expect(formatDate('2026-10-18')).toBe('2026-10-18');
    expect(formatDate('2026-10-18T23:30:00.000Z')).toBe('2026-10-18');
    expect(formatDate('')).toBe(EMPTY_TEXT);
  });

  it('formats ISO timestamps and supports fallback text', () => {
    expect(formatDateTime(null)).toBe(EMPTY_TEXT);
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
    expect(formatDateTime('2026-10-18T00:00:00.000Z')).toMatch(/^2026-10-1[78] \d{2}:\d{2}$/);
    expect(formatNullable(null, '从未登录')).toBe('从未登录');
    expect(formatNullable(0)).toBe('0');
  });

  it('validates YYYY-MM-DD date strings strictly', () => {
    expect(isDateString('2026-10-18')).toBe(true);
    expect(isDateString('2026-02-30')).toBe(false);
    expect(isDateString('2026-1-1')).toBe(false);
    expect(isDateString('')).toBe(false);
    expect(todayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
