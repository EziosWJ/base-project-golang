import { describe, expect, it } from 'vitest';
import { copy, getCopy, setCopyLocale } from '../../src/config/copy';

describe('centralized copy', () => {
  it('exposes a typed Chinese dictionary and an i18n seam', () => {
    expect(copy.common.search).toBe('搜索');
    expect(copy.table.total(12)).toBe('共 12 条');
    expect(copy.export.csv(copy.export.scopeSelected)).toBe('导出 CSV（选中行）');
    expect(getCopy()).toBe(copy);
    setCopyLocale('zh-CN');
    expect(getCopy().localeName).toBe('简体中文');
  });
});
