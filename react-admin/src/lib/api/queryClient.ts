import { QueryClient } from '@tanstack/react-query';
import { shouldRetryQuery } from './errors';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 300_000,
        retry: shouldRetryQuery,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}
