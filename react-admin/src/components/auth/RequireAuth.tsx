import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '../../features/auth/store';

function FullPageLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
      }}
      role="status"
      aria-live="polite"
    >
      <Spin size="large" />
      <span>正在恢复登录状态…</span>
    </div>
  );
}

/** Blocks protected pages until the stored token has been validated. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  useEffect(() => {
    if (token && status === 'booting') {
      void useAuthStore.getState().restore().catch(() => undefined);
    }
  }, [token, status]);

  if (!token) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(next)}`} replace />;
  }

  if (status !== 'authenticated') {
    return <FullPageLoading />;
  }

  return children;
}
