import { api } from '../../lib/api/client';
import type {
  CurrentUser,
  CurrentUserMenu,
  LoginRequest,
  LoginResponse,
} from '../../types/auth';

export function loginByPassword(data: LoginRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/login', data);
}

export function logoutCurrentUser(): Promise<void> {
  return api.post<void>('/auth/logout');
}

export function getCurrentUser(): Promise<CurrentUser> {
  return api.get<CurrentUser>('/auth/me');
}

export function getCurrentUserMenus(): Promise<CurrentUserMenu[]> {
  return api.get<CurrentUserMenu[]>('/auth/menus');
}
