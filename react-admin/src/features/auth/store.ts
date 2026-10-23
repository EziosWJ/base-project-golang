import { create } from 'zustand';
import {
  getCurrentUser,
  getCurrentUserMenus,
  loginByPassword,
  logoutCurrentUser,
} from './api';
import { setAuthTokenSource, setUnauthorizedHandler } from '../../lib/api/client';
import { createQueryClient } from '../../lib/api/queryClient';
import { env } from '../../config/env';
import type { AuthStatus, CurrentUser, CurrentUserMenu } from '../../types/auth';

const STORAGE_KEY = 'base-go-admin-auth';
const queryClient = createQueryClient();

interface StoredAuth {
  token: string;
  user: CurrentUser | null;
}

interface AuthState {
  token: string | null;
  user: CurrentUser | null;
  menus: CurrentUserMenu[];
  status: AuthStatus;
  login: (username: string, password: string) => Promise<void>;
  restore: () => Promise<void>;
  logout: () => Promise<void>;
  clear: () => void;
}

function normalizePath(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

function loginPath(): string {
  const base = env.basePath === '/' ? '' : env.basePath;
  return `${base}/login`;
}

function readStoredAuth(): StoredAuth {
  const empty: StoredAuth = { token: '', user: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<StoredAuth>;
    if (typeof parsed.token !== 'string') {
      window.localStorage.removeItem(STORAGE_KEY);
      return empty;
    }
    return { token: parsed.token, user: parsed.user ?? null };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return empty;
  }
}

function writeStoredAuth(token: string, user: CurrentUser | null): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
  } catch {
    // Storage is optional; the in-memory session still works for this tab.
  }
}

function clearStoredAuth(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures in private browsing contexts.
  }
}

function redirectToLogin(): void {
  if (window.location.pathname === loginPath()) return;
  const next = normalizePath(`${window.location.pathname}${window.location.search}`);
  window.location.replace(`${loginPath()}?redirect=${encodeURIComponent(next)}`);
}

const stored = readStoredAuth();
let restorePromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  token: stored.token || null,
  user: stored.user,
  menus: [],
  status: stored.token ? 'booting' : 'anonymous',

  login: async (username, password) => {
    const result = await loginByPassword({ username, password });
    const token = result.tokenValue;
    queryClient.clear();
    set({
      token,
      user: null,
      menus: [],
      status: 'booting',
    });
    writeStoredAuth(token, null);

    try {
      const [user, menus] = await Promise.all([getCurrentUser(), getCurrentUserMenus()]);
      writeStoredAuth(token, user);
      set({ user, menus, status: 'authenticated' });
    } catch (error) {
      get().clear();
      throw error;
    }
  },

  restore: async () => {
    if (restorePromise) return restorePromise;
    const { token } = get();
    if (!token) {
      set({ status: 'anonymous' });
      return;
    }

    restorePromise = (async () => {
      set({ status: 'booting' });
      try {
        const [user, menus] = await Promise.all([getCurrentUser(), getCurrentUserMenus()]);
        writeStoredAuth(token, user);
        set({ user, menus, status: 'authenticated' });
      } catch (error) {
        get().clear();
        throw error;
      } finally {
        restorePromise = null;
      }
    })();

    return restorePromise;
  },

  logout: async () => {
    try {
      if (get().token) await logoutCurrentUser();
    } catch {
      // Local cleanup wins; a failed logout must not trap the user in the app.
    } finally {
      get().clear();
    }
  },

  clear: () => {
    clearStoredAuth();
    queryClient.clear();
    set({
      token: null,
      user: null,
      menus: [],
      status: 'anonymous',
    });
  },
}));

export function getAuthQueryClient() {
  return queryClient;
}

setAuthTokenSource(() => useAuthStore.getState().token);
setUnauthorizedHandler(() => {
  useAuthStore.getState().clear();
  redirectToLogin();
});
