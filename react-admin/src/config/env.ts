function normalizeBasePath(value: string | undefined): string {
  const segment = (value ?? '/').trim().replace(/^\/+|\/+$/g, '');
  return segment ? '/' + segment : '/';
}

export function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export const env = Object.freeze({
  basePath: normalizeBasePath(import.meta.env.VITE_BASE_PATH),
  /** Full API prefix, e.g. /api/v1 or http://127.0.0.1:8100/api/v1. */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') || '/api/v1',
  isTest: import.meta.env.MODE === 'test',
});

/** Prefix a public asset path with the configured deployment base path. */
export function withBasePath(path: string): string {
  const suffix = path.startsWith('/') ? path : '/' + path;
  return env.basePath === '/' ? suffix : env.basePath + suffix;
}
