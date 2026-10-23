import axios from 'axios';
import type { ApiEnvelope, ApiFieldErrors } from '../../types/api';

export type ApiErrorKind =
  | 'business'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'server'
  | 'network'
  | 'timeout'
  | 'canceled'
  | 'unknown';

const kindMessages: Record<ApiErrorKind, string> = {
  business: '请求未能完成，请检查填写内容后重试。',
  unauthorized: '登录状态已失效，请重新登录。',
  forbidden: '没有访问该资源的权限。',
  notFound: '请求的数据不存在。',
  server: '服务暂时不可用，请稍后重试。',
  network: '网络连接失败，请检查网络后重试。',
  timeout: '请求超时，请稍后重试。',
  canceled: '请求已取消。',
  unknown: '发生未知错误，请稍后重试。',
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly code?: number;
  readonly status?: number;
  readonly details?: unknown;
  readonly fieldErrors?: ApiFieldErrors;
  readonly original: unknown;

  constructor(
    message: string,
    options: {
      kind: ApiErrorKind;
      code?: number;
      status?: number;
      details?: unknown;
      fieldErrors?: ApiFieldErrors;
      original: unknown;
    },
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = options.kind;
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    this.fieldErrors = options.fieldErrors;
    this.original = options.original;
  }

  get retryable(): boolean {
    return this.kind === 'network' || this.kind === 'timeout' || this.kind === 'server';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return isRecord(value) && typeof value.code === 'number' && 'data' in value;
}

function fieldErrorsFrom(value: unknown): ApiFieldErrors | undefined {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value);
  if (entries.length === 0) return undefined;
  if (!entries.every(([, item]) => typeof item === 'string')) return undefined;
  return Object.fromEntries(entries) as ApiFieldErrors;
}

function kindFromCode(code: number | undefined): ApiErrorKind {
  if (code === 401) return 'unauthorized';
  if (code === 403) return 'forbidden';
  if (code === 404) return 'notFound';
  if (code !== undefined && code >= 500) return 'server';
  return 'business';
}

export function errorFromEnvelope(
  body: ApiEnvelope<unknown>,
  status: number,
  original: unknown,
): ApiError {
  const kind = kindFromCode(body.code);
  return new ApiError(body.message?.trim() || kindMessages[kind], {
    kind,
    code: body.code,
    status,
    details: body.data,
    fieldErrors: fieldErrorsFrom(body.data),
    original,
  });
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isCancel(error)) {
    return new ApiError(kindMessages.canceled, { kind: 'canceled', original: error });
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const body = error.response?.data;
    const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';

    if (timedOut) {
      return new ApiError(kindMessages.timeout, { kind: 'timeout', original: error });
    }
    if (status === undefined) {
      return new ApiError(kindMessages.network, { kind: 'network', original: error });
    }
    if (isEnvelope(body)) {
      return errorFromEnvelope(body, status, error);
    }
    const kind = kindFromCode(status);
    const message =
      isRecord(body) && typeof body.message === 'string' && body.message.trim()
        ? body.message
        : kindMessages[kind];
    return new ApiError(message, { kind, code: status, status, original: error });
  }

  if (error instanceof Error) {
    return new ApiError(error.message || kindMessages.unknown, { kind: 'unknown', original: error });
  }

  return new ApiError(kindMessages.unknown, { kind: 'unknown', original: error });
}

export function getErrorMessage(error: unknown): string {
  return normalizeApiError(error).message;
}

/** Field-level validation errors returned in the envelope data, if any. */
export function getFieldErrors(error: unknown): ApiFieldErrors | undefined {
  return normalizeApiError(error).fieldErrors;
}

/** Queries retry at most once for retryable transport/server failures. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const normalized = normalizeApiError(error);
  if (!normalized.retryable) return false;
  return failureCount < 1;
}
