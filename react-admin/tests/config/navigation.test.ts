import { describe, expect, it } from 'vitest';
import {
  buildBreadcrumb,
  buildCommandItems,
  buildNavigation,
  flattenNavigation,
  resolveMenuRoute,
} from '../../src/config/navigation';
import { findRouteByPermissionCode, routeDefinitions } from '../../src/config/routes';
import { buildMenuAccess, canAccessRoute } from '../../src/lib/access';
import type { CurrentUserMenu } from '../../src/types/auth';
import type { CurrentUser } from '../../src/types/auth';

function menu(overrides: Partial<CurrentUserMenu> = {}): CurrentUserMenu {
  return {
    id: 1,
    parentId: 0,
    menuName: '系统管理',
    menuType: 'DIR',
    path: '/system',
    icon: 'Settings',
    permissionCode: 'system',
    sortOrder: 1,
    visible: 1,
    children: [],
    ...overrides,
  };
}

const menus: CurrentUserMenu[] = [
  menu({
    children: [
      menu({
        id: 2,
        parentId: 1,
        menuName: '用户管理',
        menuType: 'MENU',
        path: '/system/user',
        permissionCode: 'system:user',
        icon: 'User',
        sortOrder: 1,
      }),
      menu({
        id: 3,
        parentId: 1,
        menuName: '未注册页面',
        menuType: 'MENU',
        path: '/system/unregistered',
        permissionCode: 'system:unregistered',
        sortOrder: 2,
      }),
      menu({
        id: 4,
        parentId: 1,
        menuName: '隐藏菜单',
        menuType: 'MENU',
        path: '/system/role',
        permissionCode: 'system:role',
        visible: 0,
        sortOrder: 3,
      }),
    ],
  }),
  menu({
    id: 5,
    menuName: '文件管理',
    menuType: 'MENU',
    path: '/system/file',
    permissionCode: 'system:file',
    icon: 'File',
    sortOrder: 2,
  }),
  menu({
    id: 6,
    menuName: '外部系统',
    menuType: 'LINK',
    path: 'https://example.com',
    permissionCode: 'external',
    sortOrder: 3,
  }),
];

const admin: CurrentUser = {
  id: 1,
  username: 'admin',
  nickname: '管理员',
  roles: [{ id: 1, roleName: '超级管理员', roleCode: 'ADMIN' }],
};

const member: CurrentUser = {
  id: 2,
  username: 'member',
  nickname: '普通成员',
  roles: [{ id: 2, roleName: '成员', roleCode: 'MEMBER' }],
};

describe('menu-to-navigation mapping', () => {
  it('maps registered codes, hides unknown pages and invisible menus', () => {
    const nav = buildNavigation(menus, false);
    const flat = flattenNavigation(nav);
    expect(flat.some((item) => item.path === '/system/user')).toBe(true);
    expect(flat.some((item) => item.path === '/system/unregistered')).toBe(false);
    expect(flat.some((item) => item.path === '/system/role')).toBe(false);
    expect(flat.some((item) => item.path === '/system/file')).toBe(true);
    expect(flat.some((item) => item.external)).toBe(true);
    expect(flat.some((item) => item.path === '/')).toBe(true);
    expect(flat.some((item) => item.path === '/notifications')).toBe(true);
    expect(flat.some((item) => item.path === '/announcements')).toBe(true);
  });

  it('adds ADMIN-only management entries only for admins', () => {
    const memberNav = flattenNavigation(buildNavigation(menus, false));
    const adminNav = flattenNavigation(buildNavigation(menus, true));
    expect(memberNav.some((item) => item.path === '/system/notification')).toBe(false);
    expect(adminNav.some((item) => item.path === '/system/notification')).toBe(true);
    expect(adminNav.some((item) => item.path === '/system/announcement')).toBe(true);
  });

  it('prefers permission codes and falls back to paths', () => {
    expect(resolveMenuRoute(menu({ permissionCode: 'system:user', path: '/wrong' }))?.path).toBe(
      '/system/user',
    );
    expect(resolveMenuRoute(menu({ permissionCode: null, path: '/system/dept' }))?.path).toBe(
      '/system/dept',
    );
    expect(resolveMenuRoute(menu({ permissionCode: 'nope', path: '/nope' }))).toBeUndefined();
  });

  it('builds breadcrumbs from the same navigation tree', () => {
    const nav = buildNavigation(menus, false);
    expect(buildBreadcrumb('/system/user', nav).map((entry) => entry.title)).toEqual([
      '工作台',
      '系统管理',
      '用户管理',
    ]);
    expect(buildBreadcrumb('/', nav)).toEqual([]);
  });

  it('exposes only visible, routable command entries', () => {
    const items = buildCommandItems(buildNavigation(menus, false));
    expect(items.some((item) => item.path === '/system/user')).toBe(true);
    expect(items.some((item) => item.path === '/system/unregistered')).toBe(false);
    expect(items.some((item) => item.path === '/system/role')).toBe(false);
    expect(items.some((item) => item.path.startsWith('http'))).toBe(false);
    expect(items.some((item) => item.path === '/account/profile')).toBe(true);
  });
});

describe('route access rules', () => {
  const access = buildMenuAccess(menus, member);
  const adminAccess = buildMenuAccess(menus, admin);

  it('allows routes granted by code or path', () => {
    const userRoute = findRouteByPermissionCode('system:user');

    expect(userRoute && canAccessRoute(userRoute, access)).toBe(true);
    const fileRoute = findRouteByPermissionCode('system:file');
    expect(fileRoute && canAccessRoute(fileRoute, access)).toBe(true);
  });

  it('denies routes missing from the menu tree', () => {
    const deptRoute = findRouteByPermissionCode('system:dept');
    expect(deptRoute && canAccessRoute(deptRoute, access)).toBe(false);
  });

  it('keeps authenticated-only routes open and admin routes restricted', () => {
    const notifications = routeDefinitions.find((route) => route.path === '/notifications');
    const profile = routeDefinitions.find((route) => route.path === '/account/profile');
    const adminRoute = routeDefinitions.find((route) => route.path === '/system/notification');

    expect(notifications && canAccessRoute(notifications, access)).toBe(true);
    expect(profile && canAccessRoute(profile, access)).toBe(true);
    expect(adminRoute && canAccessRoute(adminRoute, access)).toBe(false);
    expect(adminRoute && canAccessRoute(adminRoute, adminAccess)).toBe(true);
    expect(adminAccess.isAdmin).toBe(true);
    expect(access.isAdmin).toBe(false);
  });

  it('keeps hidden menus out of navigation but still grants their page access', () => {
    const roleRoute = findRouteByPermissionCode('system:role');
    expect(roleRoute && canAccessRoute(roleRoute, access)).toBe(true);
  });
});
