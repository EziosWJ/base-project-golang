/** Unified envelope returned by every Go API endpoint. */
export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

/** Raw server pagination shape; converted once at the API boundary. */
export interface ApiPageRaw<T> {
  records: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Frontend pagination shape consumed by list pages. */
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type ApiStatus = 0 | 1;

export type ApiFieldErrors = Record<string, string>;

export interface PageQuery {
  page: number;
  pageSize: number;
}

export type SortOrder = 'asc' | 'desc';

/** Sort keys are only added when the endpoint supports them. */
export interface ListQuery extends PageQuery {
  sortBy?: string;
  sortOrder?: SortOrder;
}
