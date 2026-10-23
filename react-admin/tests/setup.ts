import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
import { server } from '../src/mocks/server';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: !query.includes('max-width') && !query.includes('prefers-color-scheme'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'blob:test'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  window.localStorage.clear();
});

afterAll(() => {
  server.close();
});

configure({ asyncUtilTimeout: 3_000 });
