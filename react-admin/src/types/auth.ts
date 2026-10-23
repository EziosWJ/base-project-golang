import type { ApiStatus } from './api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  tokenName: string;
  tokenValue: string;
  expiresIn: number;
}

export interface CurrentUserDept {
  id: number;
  deptName: string;
  deptCode?: string;
}

export interface CurrentUserRole {
  id: number;
  roleName: string;
  roleCode: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  nickname: string;
  avatar?: string | null;
  phone?: string | null;
  email?: string | null;
  dept?: CurrentUserDept | null;
  roles: CurrentUserRole[];
  lastLoginTime?: string | null;
  lastLoginIp?: string | null;
}

export type MenuType = 'DIR' | 'MENU' | 'LINK';

export interface CurrentUserMenu {
  id: number;
  parentId: number;
  menuName: string;
  menuType: MenuType;
  path: string;
  component?: string | null;
  icon?: string | null;
  permissionCode?: string | null;
  sortOrder: number;
  visible: ApiStatus;
  children: CurrentUserMenu[];
}

export type AuthStatus = 'booting' | 'anonymous' | 'authenticated';
