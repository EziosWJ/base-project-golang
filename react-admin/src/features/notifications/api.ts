import { api, toPageResult } from '../../lib/api/client';
import type { ApiPageRaw, PageResult } from '../../types/api';
import type {
  NotificationPublishInput,
  NotificationRecord,
} from '../../types/notification';

const BASE = '/system/notification';

export function getNotifications(query: {
  page: number;
  pageSize: number;
}): Promise<PageResult<NotificationRecord>> {
  return api
    .get<ApiPageRaw<NotificationRecord>>(`${BASE}/page`, { params: query })
    .then(toPageResult);
}

export function getUnreadNotificationCount(): Promise<number> {
  return api.get<number>(`${BASE}/unread-count`);
}

export function getNotification(id: number): Promise<NotificationRecord> {
  return api.get<NotificationRecord>(`${BASE}/${id}`);
}

export function markNotificationRead(id: number): Promise<void> {
  return api.put<void>(`${BASE}/${id}/read`);
}

export function markAllNotificationsRead(): Promise<void> {
  return api.put<void>(`${BASE}/read-all`);
}

export function publishNotification(data: NotificationPublishInput): Promise<void> {
  return api.post<void>(BASE, data);
}

export function getAdminNotifications(query: {
  page: number;
  pageSize: number;
}): Promise<PageResult<NotificationRecord>> {
  return api
    .get<ApiPageRaw<NotificationRecord>>('/system/notification-admin/page', { params: query })
    .then(toPageResult);
}
