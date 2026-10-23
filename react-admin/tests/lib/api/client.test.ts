import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  api,
  authorizationValue,
  compactQuery,
  rawClient,
  setAuthTokenSource,
  toPageResult,
} from '../../../src/lib/api/client';

function mockResponse(data: unknown, status = 200) {
  return vi.spyOn(rawClient, 'request').mockResolvedValue({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {},
  } as never);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('API client envelope handling', () => {
  it('unwraps successful envelope data', async () => {
    mockResponse({ code: 200, message: 'success', data: { id: 7 } });
    await expect(api.get<{ id: number }>('/auth/me')).resolves.toEqual({ id: 7 });
  });

  it('rejects business failures carried by HTTP 200', async () => {
    mockResponse({ code: 400, message: '业务失败', data: null });
    await expect(api.post('/auth/login', {})).rejects.toMatchObject({
      kind: 'business',
      code: 400,
      message: '业务失败',
    });
  });

  it('converts records pagination to items once', () => {
    expect(
      toPageResult({ records: [{ id: 1 }, { id: 2 }], total: 12, page: 2, pageSize: 10 }),
    ).toEqual({ items: [{ id: 1 }, { id: 2 }], total: 12, page: 2, pageSize: 10 });
  });

  it('supports tokenValue that already contains the auth scheme', async () => {
    const spy = mockResponse({ code: 200, message: 'success', data: null });
    setAuthTokenSource(() => 'Bearer jwt-value');
    await api.get('/auth/me');
    expect(spy.mock.calls[0][0].headers).toMatchObject({ Authorization: 'Bearer jwt-value' });

    setAuthTokenSource(() => 'jwt-value');
    await api.get('/auth/me');
    expect(spy.mock.calls[1][0].headers).toMatchObject({ Authorization: 'Bearer jwt-value' });
    setAuthTokenSource(null);
  });

  it('normalizes authorization values', () => {
    expect(authorizationValue('Bearer abc')).toBe('Bearer abc');
    expect(authorizationValue('abc')).toBe('Bearer abc');
  });

  it('drops empty query values', () => {
    expect(compactQuery({ page: 1, keyword: '', status: undefined, id: 0 })).toEqual({
      page: 1,
      id: 0,
    });
  });
});
