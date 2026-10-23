import { lazy, Suspense, type ReactNode } from 'react';
import { Button, Result, Spin, Typography } from 'antd';
import {
  createBrowserRouter,
  isRouteErrorResponse,
  RouterProvider,
  useNavigate,
  useRouteError,
} from 'react-router-dom';
import { env } from '../config/env';
import { copy } from '../config/copy';
import { routeDefinitions } from '../config/routes';
import AppLayout from '../layouts/AppLayout';
import { RequireAuth } from '../components/auth/RequireAuth';
import { RouteAccess } from '../components/auth/RouteAccess';

const LoginPage = lazy(() => import('../pages/LoginPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

function RouteLoading() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: 240,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
      role="status"
      aria-live="polite"
    >
      <Spin size="large" />
      <span>{copy.common.loadingPage}</span>
    </div>
  );
}

function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const notFound = status === 404;

  return (
    <Result
      status={notFound ? '404' : '500'}
      title={
        <Typography.Title level={1} style={{ margin: 0, fontSize: 24 }}>
          {notFound ? copy.errors.title404 : copy.errors.title500}
        </Typography.Title>
      }
      subTitle={notFound ? copy.errors.subtitle404 : copy.errors.subtitle500}
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          {copy.errors.home}
        </Button>
      }
    />
  );
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<RouteLoading />}>{element}</Suspense>;
}

const protectedChildren = routeDefinitions
  .filter((route) => route.path !== '/')
  .map((route) => ({
    path: route.path.replace(/^\//, ''),
    element: (
      <RouteAccess route={route}>{withSuspense(<route.component />)}</RouteAccess>
    ),
    handle: { title: route.title, label: route.label, path: route.path },
  }));

const dashboard = routeDefinitions.find((route) => route.path === '/');

const router = createBrowserRouter(
  [
    {
      path: '/login',
      element: withSuspense(<LoginPage />),
      errorElement: <RouteErrorPage />,
    },
    {
      path: '/',
      element: (
        <RequireAuth>
          <AppLayout />
        </RequireAuth>
      ),
      errorElement: <RouteErrorPage />,
      children: [
        {
          index: true,
          element: dashboard
            ? withSuspense(<dashboard.component />)
            : withSuspense(<NotFoundPage />),
          handle: { title: dashboard?.title, label: dashboard?.label, path: '/' },
        },
        ...protectedChildren,
        {
          path: '*',
          element: withSuspense(<NotFoundPage />),
          handle: { title: copy.errors.title404, label: copy.errors.title404 },
        },
      ],
    },
  ],
  { basename: env.basePath === '/' ? undefined : env.basePath },
);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
