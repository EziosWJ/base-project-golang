import axios, { type AxiosRequestConfig } from 'axios';
import { env } from '../../config/env';
import {
  ApiError,
  errorFromEnvelope,
  isEnvelope,
  normalizeApiError,
} from './errors';
import type { ApiPageRaw, PageResult } from '../../types/api';

type TokenSource = () => string | null;
type UnauthorizedHandler = () => void;

let tokenSource: TokenSource | null = null;
let unauthorizedHandler: UnauthorizedHandler | null = null;
let redirecting = false;

/** Registered once by the auth store; keeps the HTTP layer dependency-free. */
export function setAuthTokenSource(source: TokenSource | null): void {
  tokenSource = source;
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

function notifyUnauthorized(error: ApiError): void {
  if (error.kind !== 'unauthorized' || redirecting) return;
  if (!unauthorizedHandler) return;
  redirecting = true;
  unauthorizedHandler();
  // Allow recovery if the handler chose not to navigate (e.g. login page).
  window.setTimeout(() => {
    redirecting = false;
  }, 1_000);
}

// Content-Type is intentionally not fixed here: Axios selects JSON for plain
// objects and lets the browser add the multipart boundary for FormData uploads.
export const rawClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
});

/** Tolerates both the project envelope and raw payloads (e.g. proxied files). */
/** The Go API returns tokenValue as "Bearer <jwt>"; tolerate bare JWTs too. */
export function authorizationValue(token: string): string {
  return /^[A-Za-z][A-Za-z0-9_-]*\s+/.test(token.trim()) ? token.trim() : `Bearer ${token}`;
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const token = tokenSource?.();
  const headers = {
    ...(config.headers ?? {}),
    ...(token ? { Authorization: authorizationValue(token) } : {}),
  };

  let response;
  try {
    response = await rawClient.request({ ...config, headers });
  } catch (error) {
    const apiError = normalizeApiError(error);
    notifyUnauthorized(apiError);
    throw apiError;
  }

  if (config.responseType === 'blob') {
    return response.data as T;
  }

  const body: unknown = response.data;
  if (isEnvelope(body)) {
    if (body.code !== 200) {
      const apiError = errorFromEnvelope(body, response.status, body);
      notifyUnauthorized(apiError);
      throw apiError;
    }
    return body.data as T;
  }

  return body as T;
}

export const api = {
  get<T>(path: string, config?: AxiosRequestConfig) {
    return request<T>({ ...config, url: path, method: 'GET' });
  },
  post<T>(path: string, data?: unknown, config?: AxiosRequestConfig) {
    return request<T>({ ...config, url: path, method: 'POST', data });
  },
  put<T>(path: string, data?: unknown, config?: AxiosRequestConfig) {
    return request<T>({ ...config, url: path, method: 'PUT', data });
  },
  patch<T>(path: string, data?: unknown, config?: AxiosRequestConfig) {
    return request<T>({ ...config, url: path, method: 'PATCH', data });
  },
  delete<T>(path: string, data?: unknown, config?: AxiosRequestConfig) {
    return request<T>({ ...config, url: path, method: 'DELETE', data });
  },
  blob(path: string, config?: AxiosRequestConfig) {
    return request<Blob>({ ...config, url: path, method: 'GET', responseType: 'blob' });
  },
};

/** Convert the server's `records` pagination once, at the API boundary. */
export function toPageResult<T>(raw: ApiPageRaw<T>): PageResult<T> {
  return {
    items: raw.records ?? [],
    total: raw.total ?? 0,
    page: raw.page ?? 1,
    pageSize: raw.pageSize ?? (raw.records?.length || 10),
  };
}

/** Drop empty filters so the server receives only meaningful query keys. */
export function compactQuery<T extends object>(query: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ) as Partial<T>;
}

export function buildApiUrl(path: string): string {
  return `${env.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
