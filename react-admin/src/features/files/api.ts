import { del, get, getBlob, getPage, patch, post, put } from '../../lib/api/client';
import type { PaginatedResult } from '../../types/api';
import type {
  FileListQuery,
  FileRecord,
  FileUploadBatchResult,
  FileUploadOptions,
} from '../../types/files';

const BASE = '/system/file';

function uploadFormData(key: 'file' | 'files', files: File[], options: FileUploadOptions = {}): FormData {
  const data = new FormData();
  files.forEach((file) => data.append(key, file));
  if (options.businessModule) data.append('businessModule', options.businessModule);
  if (options.remark) data.append('remark', options.remark);
  return data;
}

export function listFiles(query: FileListQuery): Promise<PaginatedResult<FileRecord>> {
  return getPage<FileRecord>(`${BASE}/page`, { ...query });
}

export function uploadFile(file: File, options?: FileUploadOptions): Promise<FileRecord> {
  return post<FileRecord>(`${BASE}/upload`, uploadFormData('file', [file], options));
}

export function uploadFiles(files: File[], options?: FileUploadOptions): Promise<FileUploadBatchResult> {
  return post<FileUploadBatchResult>(`${BASE}/upload-batch`, uploadFormData('files', files, options));
}

export function getFile(id: number): Promise<FileRecord> {
  return get<FileRecord>(`${BASE}/${id}`);
}

export function updateFile(id: number, input: Pick<FileRecord, 'businessModule' | 'remark'>): Promise<void> {
  return put<void>(`${BASE}/${id}`, input);
}

export function deleteFile(id: number): Promise<void> {
  return del<void>(`${BASE}/${id}`);
}

export function deleteFiles(ids: number[]): Promise<void> {
  return post<void>(`${BASE}/batch-delete`, { ids });
}

export function setFileStatus(id: number, status: 0 | 1): Promise<void> {
  return patch<void>(`${BASE}/${id}/status`, { status });
}

export interface FileAccessLink {
  url: string;
  direct: boolean;
}

export function getFileLink(
  id: number,
  disposition: 'inline' | 'attachment',
  signal?: AbortSignal,
): Promise<FileAccessLink> {
  return get<FileAccessLink>(`${BASE}/${id}/access-url`, { disposition }, { signal });
}

/** 签名 URL 自身授权访问 R2，不把系统 Bearer Token 发送给对象存储。 */
export async function getSignedBlob(url: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(url, { credentials: 'omit', signal });
  if (!response.ok) throw new Error('文件加载失败，请重试');
  return response.blob();
}

export async function downloadFile(id: number): Promise<Blob> {
  const link = await getFileLink(id, 'attachment');
  if (!link.direct) return getBlob(link.url);
  return getSignedBlob(link.url);
}
