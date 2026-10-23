import { AxiosError } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { applyServerFieldErrors } from '../../src/lib/forms';

describe('applyServerFieldErrors', () => {
  it('maps API validation details onto matching form fields', () => {
    const setFields = vi.fn();
    const form = { setFields } as unknown as Parameters<typeof applyServerFieldErrors>[0];
    const error = new AxiosError('bad request', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 400,
      statusText: '',
      headers: {},
      config: {} as never,
      data: {
        code: 400,
        message: '请检查表单内容后重试。',
        data: { code: '客户编码已存在', email: '邮箱已被使用' },
      },
    });

    expect(applyServerFieldErrors(form, error)).toBe(true);
    expect(setFields).toHaveBeenCalledWith([
      { name: 'code', errors: ['客户编码已存在'] },
      { name: 'email', errors: ['邮箱已被使用'] },
    ]);
  });

  it('does nothing when there are no field details', () => {
    const setFields = vi.fn();
    const form = { setFields } as unknown as Parameters<typeof applyServerFieldErrors>[0];
    expect(applyServerFieldErrors(form, new Error('network'))).toBe(false);
    expect(setFields).not.toHaveBeenCalled();
  });
});
