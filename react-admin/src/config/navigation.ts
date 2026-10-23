import {
  Bell,
  LayoutDashboard,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { getMenuIcon } from './menu-icons';
import {
  findRouteByPath,
  findRouteByPermissionCode,
  routeDefinitions,
  type AppRouteDefinition,
} from './routes';
import type { CurrentUserMenu } from '../types/auth';

export interface NavItem {
  key: string;
  label: string;
  path?: string;
  external?: boolean;
  icon?: LucideIcon;
  children?: NavItem[];
}

export interface CommandItem {
  key: string;
  label: string;
  title?: string;
  group: string;
  path: string;
  icon?: LucideIcon;
  keywords?: string;
}

export interface BreadcrumbEntry {
  key: string;
  title: string;
  path?: string;
}

function normalizePath(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

function isExternalPath(path: string | null | undefined): boolean {
  return Boolean(path && /^https?:\/\//i.test(path));
}

function sortedMenus(menus: CurrentUserMenu[]): CurrentUserMenu[] {
  return [...menus].sort((left, right) => left.sortOrder - right.sortOrder);
}

/** Maps a backend menu onto a locally registered page; unknown pages stay hidden. */
export function resolveMenuRoute(menu: CurrentUserMenu): AppRouteDefinition | undefined {
  return (
    findRouteByPermissionCode(menu.permissionCode) ??
    findRouteByPath(menu.path)
  );
}

function toNavItem(menu: CurrentUserMenu, isAdmin: boolean): NavItem | null {
  if (menu.visible !== 1) return null;

  if (menu.menuType === 'DIR') {
    const children = sortedMenus(menu.children ?? [])
      .map((child) => toNavItem(child, isAdmin))
      .filter((item): item is NavItem => Boolean(item));
    if (children.length === 0) return null;
    return {
      key: `dir:${menu.id}`,
      label: menu.menuName,
      icon: getMenuIcon(menu.icon),
      children,
    };
  }

  if (menu.menuType === 'LINK') {
    const target = menu.path;
    if (!isExternalPath(target)) return null;
    return {
      key: target,
      label: menu.menuName,
      path: target,
      external: true,
      icon: getMenuIcon(menu.icon),
    };
  }

  const route = resolveMenuRoute(menu);
  if (!route) {
    if (import.meta.env.DEV) {
      console.warn(`菜单「${menu.menuName}」未在本前端注册，已从导航隐藏。`, menu.path);
    }
    return null;
  }
  if (route.adminOnly && !isAdmin) return null;

  const path = normalizePath(menu.path || route.path);
  return {
    key: path,
    label: menu.menuName || route.label,
    path,
    icon: getMenuIcon(menu.icon) ?? route.icon,
  };
}

function dedupe(items: NavItem[], seen = new Set<string>()): NavItem[] {
  const result: NavItem[] = [];
  for (const item of items) {
    if (item.path) {
      if (seen.has(item.path)) continue;
      seen.add(item.path);
    }
    const children = item.children ? dedupe(item.children, seen) : undefined;
    if (item.children && (!children || children.length === 0)) continue;
    result.push({ ...item, children });
  }
  return result;
}

/**
 * Top navigation = workbench + backend menu tree + local message entries.
 * Backend directories become dropdowns; top-level menu nodes become links.
 */
export function buildNavigation(menus: CurrentUserMenu[], isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
    { key: '/', label: '工作台', path: '/', icon: LayoutDashboard },
  ];

  for (const menu of sortedMenus(menus)) {
    const item = toNavItem(menu, isAdmin);
    if (item) items.push(item);
  }

  const messages: NavItem[] = [
    { key: '/notifications', label: '我的通知', path: '/notifications', icon: Bell },
    { key: '/announcements', label: '公告', path: '/announcements', icon: MessageSquare },
  ];
  if (isAdmin) {
    messages.push(
      { key: '/system/notification', label: '通知管理', path: '/system/notification', icon: Bell },
      {
        key: '/system/announcement',
        label: '公告管理',
        path: '/system/announcement',
        icon: MessageSquare,
      },
    );
  }
  items.push({
    key: 'local:messages',
    label: '消息中心',
    icon: MessageSquare,
    children: messages,
  });

  return dedupe(items);
}

export function flattenNavigation(nav: NavItem[]): Array<NavItem & { parents: string[] }> {
  const result: Array<NavItem & { parents: string[] }> = [];
  const walk = (items: NavItem[], parents: string[]) => {
    for (const item of items) {
      if (item.children?.length) {
        walk(item.children, [...parents, item.label]);
      } else {
        result.push({ ...item, parents });
      }
    }
  };
  walk(nav, []);
  return result;
}

/** Command search only exposes links that are visible and actually routable. */
export function buildCommandItems(nav: NavItem[]): CommandItem[] {
  const navItems = flattenNavigation(nav)
    .filter((item) => item.path && !item.external)
    .map((item) => {
      const route = findRouteByPath(item.path);
      return {
        key: item.path as string,
        label: item.label,
        title: route?.title ?? item.label,
        group: item.parents[0] ?? '导航',
        path: item.path as string,
        icon: item.icon ?? route?.icon,
        keywords: route?.keywords,
      };
    });

  const accountItems = routeDefinitions
    .filter((route) => route.path.startsWith('/account/') && route.searchable)
    .map((route) => ({
      key: route.path,
      label: route.label,
      title: route.title,
      group: '账号',
      path: route.path,
      icon: route.icon,
      keywords: route.keywords,
    }));

  const seen = new Set<string>();
  return [...navItems, ...accountItems].filter((item) => {
    if (seen.has(item.path)) return false;
    seen.add(item.path);
    return true;
  });
}

export function buildBreadcrumb(pathname: string, nav: NavItem[]): BreadcrumbEntry[] {
  const normalized = normalizePath(pathname);
  if (normalized === '/') return [];

  const trail: NavItem[] = [];
  const walk = (items: NavItem[], parents: NavItem[]): boolean => {
    for (const item of items) {
      if (item.path === normalized) {
        trail.push(...parents, item);
        return true;
      }
      if (item.children?.length && walk(item.children, [...parents, item])) return true;
    }
    return false;
  };

  if (!walk(nav, [])) return [];
  return [
    { key: 'home', title: '工作台', path: '/' },
    ...trail.map((item, index) => ({
      key: item.key,
      title: item.label,
      path: index === trail.length - 1 ? undefined : item.path,
    })),
  ];
}
