import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_PAGE_SIZE } from '../config/options';

export interface ListStateOptions {
  filterKeys: readonly string[];
  defaultPageSize?: number;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (value === null || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * URL-backed list state shared by every admin list page. Committed filters,
 * pagination and back/forward navigation survive a refresh and deep links.
 */
export function useListState({ filterKeys, defaultPageSize = DEFAULT_PAGE_SIZE }: ListStateOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramsRef = useRef(searchParams);

  useEffect(() => {
    paramsRef.current = searchParams;
  }, [searchParams]);

  const state = useMemo(() => {
    const values: Record<string, string> = {};
    for (const key of filterKeys) {
      const value = (searchParams.get(key) ?? '').trim();
      if (value) values[key] = value;
    }
    return {
      page: parsePositiveInt(searchParams.get('page'), 1),
      pageSize: parsePositiveInt(searchParams.get('pageSize'), defaultPageSize),
      values,
    };
  }, [searchParams, filterKeys, defaultPageSize]);

  const update = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(paramsRef.current);
      mutate(next);
      paramsRef.current = next;
      setSearchParams(next, { replace: true });
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (page: number) => {
      update((params) => {
        if (page <= 1) params.delete('page');
        else params.set('page', String(page));
      });
    },
    [update],
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      update((params) => {
        if (pageSize === defaultPageSize) params.delete('pageSize');
        else params.set('pageSize', String(pageSize));
        params.delete('page');
      });
    },
    [defaultPageSize, update],
  );

  const setFilter = useCallback(
    (key: string, value: string | number | undefined) => {
      if (!filterKeys.includes(key)) return;
      update((params) => {
        if (value === undefined || value === '') params.delete(key);
        else params.set(key, String(value));
        params.delete('page');
      });
    },
    [filterKeys, update],
  );

  const setFilters = useCallback(
    (values: Record<string, string | number | undefined>) => {
      update((params) => {
        for (const [key, value] of Object.entries(values)) {
          if (!filterKeys.includes(key)) continue;
          if (value === undefined || value === '') params.delete(key);
          else params.set(key, String(value));
        }
        params.delete('page');
      });
    },
    [filterKeys, update],
  );

  const reset = useCallback(() => {
    paramsRef.current = new URLSearchParams();
    setSearchParams(new URLSearchParams(), { replace: false });
  }, [setSearchParams]);

  const filters = state.values;
  const hasActiveFilters = Object.keys(filters).length > 0 || state.page > 1;

  /** Numeric server query built from the URL state. */
  const query = useMemo(
    () => ({ page: state.page, pageSize: state.pageSize, ...filters }),
    [state.page, state.pageSize, filters],
  );

  return {
    page: state.page,
    pageSize: state.pageSize,
    filters,
    query,
    setPage,
    setPageSize,
    setFilter,
    setFilters,
    reset,
    hasActiveFilters,
  };
}
