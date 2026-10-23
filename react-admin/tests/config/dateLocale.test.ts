import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import '../../src/config/dayjs';

describe('date locale', () => {
  it('configures Day.js for Chinese calendar panels', () => {
    expect(dayjs.locale()).toBe('zh-cn');
    // Monday-first week and Chinese month formatting come from the locale.
    expect(dayjs('2026-10-18').format('dddd')).toBe('星期日');
  });
});
