import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';
import type { RouteObject } from 'react-router-dom';
import { PreferencesProvider } from '../src/app/AppProviders';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

export function TestProviders({
  children,
  queryClient = createTestQueryClient(),
}: {
  children: ReactNode;
  queryClient?: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>{children}</PreferencesProvider>
    </QueryClientProvider>
  );
}

interface RenderWithRouterOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  path?: string;
  queryClient?: QueryClient;
}

export function renderWithRouter(
  ui: ReactElement,
  { route = '/', path = '/', queryClient = createTestQueryClient(), ...options }: RenderWithRouterOptions = {},
) {
  return {
    queryClient,
    ...render(
      <TestProviders queryClient={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        </MemoryRouter>
      </TestProviders>,
      options,
    ),
  };
}

export function renderRoutes(
  routes: RouteObject[],
  { route = '/', queryClient = createTestQueryClient(), ...options }: Omit<RenderWithRouterOptions, 'path'> = {},
) {
  return {
    queryClient,
    ...render(
      <TestProviders queryClient={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            {routes.map((entry) => (
              <Route key={entry.path ?? entry.index?.toString()} path={entry.path} index={entry.index} element={entry.element} />
            ))}
          </Routes>
        </MemoryRouter>
      </TestProviders>,
      options,
    ),
  };
}

export function renderWithProviders(
  ui: ReactElement,
  { queryClient = createTestQueryClient(), ...options }: { queryClient?: QueryClient } & Omit<RenderOptions, 'wrapper'> = {},
) {
  return {
    queryClient,
    ...render(<TestProviders queryClient={queryClient}>{ui}</TestProviders>, options),
  };
}
