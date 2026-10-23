import { API_PREFIX, http } from "@/lib/http";
import type {
  ChangePasswordRequest,
  UpdateAvatarRequest,
} from "@/types/account";
import type { CurrentUser } from "@/types/auth";

export async function getAccountProfile(): Promise<CurrentUser> {
  return http.get<CurrentUser>(`${API_PREFIX}/auth/me`);
}

export function changeCurrentUserPassword(data: ChangePasswordRequest) {
  return http.put<void>(`${API_PREFIX}/system/user/me/password`, data);
}

export function updateCurrentUserAvatar(data: UpdateAvatarRequest) {
  return http.put<void>(`${API_PREFIX}/system/user/me/avatar`, data);
}
