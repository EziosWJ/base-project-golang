import { useMemo, type ReactNode } from 'react';
import { useAuthStore } from '../../features/auth/store';
import { buildMenuAccess, canAccessRoute } from '../../lib/access';
import type { AppRouteDefinition } from '../../config/routes';
import ForbiddenPage from '../../pages/ForbiddenPage';

/** Direct URL access follows the same menu/permission mapping as navigation. */
export function RouteAccess({
  route,
  children,
}: {
  route: AppRouteDefinition;
  children: ReactNode;
}) {
  const menus = useAuthStore((state) => state.menus);
  const user = useAuthStore((state) => state.user);
  const access = useMemo(() => buildMenuAccess(menus, user), [menus, user]);

  if (!canAccessRoute(route, access)) return <ForbiddenPage />;
  return children;
}
