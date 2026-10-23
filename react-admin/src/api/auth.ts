import { API_PREFIX, http } from "@/lib/http";
import type {
  CurrentUser,
  CurrentUserMenu,
  LoginRequest,
  LoginResponse,
} from "@/types";

export function loginByPassword(request: LoginRequest): Promise<LoginResponse> {
  return http.post<LoginResponse>(`${API_PREFIX}/auth/login`, request);
}

export function getCurrentUser(): Promise<CurrentUser> {
  return http.get<CurrentUser>(`${API_PREFIX}/auth/me`);
}

export function logoutCurrentUser(): Promise<void> {
  return http.post<void>(`${API_PREFIX}/auth/logout`);
}

export function getCurrentUserMenus(): Promise<CurrentUserMenu[]> {
  return http.get<CurrentUserMenu[]>(`${API_PREFIX}/auth/menus`);
}
