import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders, useAppPreferences, type ThemeMode } from '../../src/app/AppProviders';

function Probe() {
  const { themeMode, toggleTheme } = useAppPreferences();
  return (
    <div>
      <span data-testid="theme-mode">{themeMode}</span>
      <button type="button" onClick={toggleTheme}>
        toggle
      </button>
    </div>
  );
}

function mockSystemTheme(dark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: dark && query.includes('prefers-color-scheme: dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('AppProviders theme system', () => {
  it('emits design tokens as CSS variables for CSS Modules', () => {
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );
    expect(document.head.textContent).toContain('--ant-color-primary');
    expect(document.head.textContent).toContain('--ant-color-link');
  });

  it('follows the operating system when no preference is stored', async () => {
    mockSystemTheme(true);
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
  });

  it('prefers a saved user choice over the operating system', async () => {
    mockSystemTheme(true);
    window.localStorage.setItem('app-theme', 'light' satisfies ThemeMode);
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
  });

  it('persists manual toggles', async () => {
    const user = userEvent.setup({ delay: null });
    mockSystemTheme(false);
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
    expect(window.localStorage.getItem('app-theme')).toBe('dark');
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
  });
});
