import type { CurrentUser, CurrentUserMenu } from '../types/auth';
import type { AppRouteDefinition } from '../config/routes';

export interface MenuAccess {
  codes: Set<string>;
  paths: Set<string>;
  isAdmin: boolean;
}

function walk(menus: CurrentUserMenu[], access: MenuAccess): void {
  for (const menu of menus) {
    if (menu.permissionCode) access.codes.add(menu.permissionCode);
    if (menu.path) access.paths.add(menu.path.replace(/\/+$/, '') || '/');
    if (menu.children?.length) walk(menu.children, access);
  }
}

/** Access is built from the backend menu tree; hidden menus still grant access. */
export function buildMenuAccess(menus: CurrentUserMenu[], user: CurrentUser | null): MenuAccess {
  const access: MenuAccess = {
    codes: new Set<string>(),
    paths: new Set<string>(),
    isAdmin: Boolean(user?.roles.some((role) => role.roleCode === 'ADMIN')),
  };
  walk(menus, access);
  return access;
}

export function canAccessRoute(route: AppRouteDefinition, access: MenuAccess): boolean {
  if (route.authenticatedOnly) return true;
  if (route.adminOnly) return access.isAdmin;
  if (!route.permissionCode) return true;

  const normalized = route.path.replace(/\/+$/, '') || '/';
  return access.codes.has(route.permissionCode) || access.paths.has(normalized);
}
