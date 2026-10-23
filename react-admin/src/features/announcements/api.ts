import { api, toPageResult } from '../../lib/api/client';
import type { ApiPageRaw, PageResult } from '../../types/api';
import type {
  AnnouncementInput,
  AnnouncementRecord,
  AnnouncementScope,
} from '../../types/notification';

function base(scope: AnnouncementScope) {
  return scope === 'PUBLIC' ? '/public/announcement' : '/system/announcement';
}

export function getAnnouncements(
  scope: AnnouncementScope,
  page: number,
  pageSize: number,
): Promise<PageResult<AnnouncementRecord>> {
  return api
    .get<ApiPageRaw<AnnouncementRecord>>(`${base(scope)}/page`, {
      params: { page, pageSize },
    })
    .then(toPageResult);
}

export function getAnnouncement(
  scope: AnnouncementScope,
  id: number,
): Promise<AnnouncementRecord> {
  return api.get<AnnouncementRecord>(`${base(scope)}/${id}`);
}

export function getAdminAnnouncements(
  page: number,
  pageSize: number,
): Promise<PageResult<AnnouncementRecord>> {
  return api
    .get<ApiPageRaw<AnnouncementRecord>>('/system/announcement-admin/page', {
      params: { page, pageSize },
    })
    .then(toPageResult);
}

export function saveAnnouncement(
  data: AnnouncementInput,
  id?: number,
): Promise<AnnouncementRecord> {
  return id
    ? api.put<AnnouncementRecord>(`/system/announcement/${id}`, data)
    : api.post<AnnouncementRecord>('/system/announcement', data);
}

export function publishAnnouncement(id: number): Promise<void> {
  return api.put<void>(`/system/announcement/${id}/publish`);
}

export function withdrawAnnouncement(id: number): Promise<void> {
  return api.put<void>(`/system/announcement/${id}/withdraw`);
}
