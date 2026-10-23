import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryClientProvider } from '@tanstack/react-query';
import '../config/dayjs';
import { createThemeConfig } from '../styles/theme';
import { getAuthQueryClient, useAuthStore } from '../features/auth/store';
import {
  getInitialTheme,
  getStoredTheme,
  getSystemTheme,
  storeTheme,
  type ThemeMode,
} from '../utils/theme';

export type { ThemeMode };

interface AppPreferences {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const PreferencesContext = createContext<AppPreferences | null>(null);

function applyThemeAttributes(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getInitialTheme);

  // Follow the operating system only while the user has made no explicit choice.
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (getStoredTheme() === null) setThemeModeState(getSystemTheme());
    };
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    applyThemeAttributes(themeMode);
  }, [themeMode]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    storeTheme(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((current) => {
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
      storeTheme(next);
      return next;
    });
  }, []);

  const preferences = useMemo(
    () => ({ themeMode, setThemeMode, toggleTheme }),
    [themeMode, setThemeMode, toggleTheme],
  );
  const themeConfig = useMemo(() => createThemeConfig(themeMode), [themeMode]);

  return (
    <PreferencesContext.Provider value={preferences}>
      <ConfigProvider locale={zhCN} theme={themeConfig} button={{ autoInsertSpace: false }}>
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </PreferencesContext.Provider>
  );
}

/** Restores the stored token once, before route guards decide where to go. */
function SessionBootstrap() {
  useEffect(() => {
    const state = useAuthStore.getState();
    if (state.token && state.status === 'booting') {
      void state.restore().catch(() => undefined);
    }
  }, []);
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getAuthQueryClient()}>
      <SessionBootstrap />
      <PreferencesProvider>{children}</PreferencesProvider>
    </QueryClientProvider>
  );
}

export function useAppPreferences(): AppPreferences {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('useAppPreferences must be used within AppProviders');
  return value;
}
