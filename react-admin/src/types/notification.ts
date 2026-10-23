export type AnnouncementScope = 'PUBLIC' | 'INTERNAL';
export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN';

export interface NotificationRecord {
  id: number;
  title: string;
  content: string;
  jumpPath?: string;
  sourceType: string;
  publisherId?: number | null;
  publishTime: string;
  createTime: string;
  isRead: 0 | 1;
  recipientCount?: number;
  readCount?: number;
}

export interface NotificationPublishInput {
  title: string;
  content: string;
  jumpPath?: string;
  userIds: number[];
  allUsers: boolean;
}

export interface AnnouncementRecord {
  id: number;
  title: string;
  content: string;
  scope: AnnouncementScope;
  status: AnnouncementStatus;
  publishTime?: string | null;
  expiresAt?: string | null;
  createTime: string;
}

export interface AnnouncementInput {
  title: string;
  content: string;
  scope: AnnouncementScope;
  expiresAt?: string | null;
}
