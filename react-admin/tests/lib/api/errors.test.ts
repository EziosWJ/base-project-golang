import { describe, expect, it } from 'vitest';
import { ApiError, getErrorMessage, normalizeApiError, shouldRetryQuery } from '../../../src/lib/api/errors';

describe('API error normalization', () => {
  it('uses the envelope message even when HTTP status is 200', () => {
    const error = normalizeApiError({
      isAxiosError: true,
      response: {
        status: 200,
        data: { code: 400, message: '用户名已存在', data: null },
      },
    });
    expect(error.kind).toBe('business');
    expect(error.code).toBe(400);
    expect(getErrorMessage(error)).toBe('用户名已存在');
  });

  it('classifies 401 envelope failures as unauthorized', () => {
    const error = normalizeApiError({
      isAxiosError: true,
      response: {
        status: 401,
        data: { code: 401, message: '登录状态无效', data: null },
      },
    });
    expect(error.kind).toBe('unauthorized');
    expect(shouldRetryQuery(0, error)).toBe(false);
  });

  it('keeps field errors from envelope data', () => {
    const error = normalizeApiError({
      isAxiosError: true,
      response: {
        status: 400,
        data: { code: 400, message: '参数错误', data: { username: '用户名不能为空' } },
      },
    });
    expect(error.fieldErrors).toEqual({ username: '用户名不能为空' });
  });

  it('retries retryable server failures at most once', () => {
    const error = new ApiError('服务不可用', { kind: 'server', original: null });
    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(false);
  });

  it('treats missing responses as network failures', () => {
    const error = normalizeApiError({ isAxiosError: true, message: 'Network Error' });
    expect(error.kind).toBe('network');
    expect(error.retryable).toBe(true);
  });
});
