import { api, buildApiUrl, compactQuery, toPageResult } from '../../lib/api/client';
import type { ApiPageRaw, PageResult } from '../../types/api';
import type {
  AssignableRole,
  ConfigInput,
  ConfigListQuery,
  ConfigRecord,
  DeptInput,
  DeptListQuery,
  DeptOption,
  DeptRecord,
  DictDataInput,
  DictDataListQuery,
  DictDataRecord,
  DictOption,
  DictTypeInput,
  DictTypeListQuery,
  DictTypeRecord,
  FileListQuery,
  FileRecord,
  FileUploadBatchResult,
  FileUploadOptions,
  LoginLogListQuery,
  LoginLogRecord,
  OperLogDetail,
  OperLogListQuery,
  OperLogRecord,
  RoleDetailRecord,
  RoleInput,
  RoleListQuery,
  RoleRecord,
  SystemMenuInput,
  SystemMenuListQuery,
  SystemMenuRecord,
  UserInput,
  UserListQuery,
  UserRecord,
} from '../../types/system';

const V1 = '/system';

/* ------------------------------- users ------------------------------- */

export function getUserPage(query: UserListQuery): Promise<PageResult<UserRecord>> {
  return api
    .get<ApiPageRaw<UserRecord>>(`${V1}/user/page`, {
      params: compactQuery(query),
    })
    .then(toPageResult);
}

export function getUserDetail(id: number): Promise<UserRecord> {
  return api.get<UserRecord>(`${V1}/user/${id}`);
}

export function createUser(data: UserInput): Promise<void> {
  return api.post<void>(`${V1}/user`, data);
}

export function updateUser(id: number, data: UserInput): Promise<void> {
  return api.put<void>(`${V1}/user/${id}`, data);
}

export function deleteUser(id: number): Promise<void> {
  return api.delete<void>(`${V1}/user/${id}`);
}

export function batchDeleteUsers(ids: number[]): Promise<void> {
  return api.post<void>(`${V1}/user/batch-delete`, { ids });
}

export function updateUserStatus(id: number, status: 0 | 1): Promise<void> {
  return api.patch<void>(`${V1}/user/${id}/status`, { status });
}

export function assignUserRoles(id: number, roleIds: number[]): Promise<void> {
  return api.put<void>(`${V1}/user/${id}/roles`, { roleIds });
}

export function resetUserPassword(id: number): Promise<{ password?: string } | string> {
  return api.put<{ password?: string } | string>(`${V1}/user/${id}/reset-password`);
}

export function changeCurrentPassword(data: {
  oldPassword: string;
  newPassword: string;
}): Promise<void> {
  return api.put<void>(`${V1}/user/me/password`, data);
}

export function updateCurrentAvatar(avatar: string): Promise<void> {
  return api.put<void>(`${V1}/user/me/avatar`, { avatar });
}

export function getAssignableRoles(): Promise<AssignableRole[]> {
  return api.get<AssignableRole[]>(`${V1}/role/options`);
}

/* ------------------------------- roles ------------------------------- */

export function getRolePage(query: RoleListQuery): Promise<PageResult<RoleRecord>> {
  return api
    .get<ApiPageRaw<RoleRecord>>(`${V1}/role/page`, {
      params: compactQuery(query),
    })
    .then(toPageResult);
}

export function getRoleDetail(id: number): Promise<RoleDetailRecord> {
  return api.get<RoleDetailRecord>(`${V1}/role/${id}`);
}

export function createRole(data: RoleInput): Promise<void> {
  return api.post<void>(`${V1}/role`, data);
}

export function updateRole(id: number, data: RoleInput): Promise<void> {
  return api.put<void>(`${V1}/role/${id}`, data);
}

export function deleteRole(id: number): Promise<void> {
  return api.delete<void>(`${V1}/role/${id}`);
}

export function batchDeleteRoles(ids: number[]): Promise<void> {
  return api.post<void>(`${V1}/role/batch-delete`, { ids });
}

export function updateRoleStatus(id: number, status: 0 | 1): Promise<void> {
  return api.patch<void>(`${V1}/role/${id}/status`, { status });
}

export function assignRoleMenus(id: number, menuIds: number[]): Promise<void> {
  return api.put<void>(`${V1}/role/${id}/menus`, { menuIds });
}

/* ------------------------------- menus ------------------------------- */

export function getMenuTree(): Promise<SystemMenuRecord[]> {
  return api.get<SystemMenuRecord[]>(`${V1}/menu/tree`);
}

export function getMenuPage(
  query: SystemMenuListQuery,
): Promise<PageResult<SystemMenuRecord>> {
  return api
    .get<ApiPageRaw<SystemMenuRecord>>(`${V1}/menu/page`, {
      params: compactQuery(query),
    })
    .then(toPageResult);
}

export function getMenuDetail(id: number): Promise<SystemMenuRecord> {
  return api.get<SystemMenuRecord>(`${V1}/menu/${id}`);
}

export function createMenu(data: SystemMenuInput): Promise<void> {
  return api.post<void>(`${V1}/menu`, data);
}

export function updateMenu(id: number, data: SystemMenuInput): Promise<void> {
  return api.put<void>(`${V1}/menu/${id}`, data);
}

export function deleteMenu(id: number): Promise<void> {
  return api.delete<void>(`${V1}/menu/${id}`);
}

export function batchDeleteMenus(ids: number[]): Promise<void> {
  return api.post<void>(`${V1}/menu/batch-delete`, { ids });
}

export function updateMenuStatus(id: number, status: 0 | 1): Promise<void> {
  return api.patch<void>(`${V1}/menu/${id}/status`, { status });
}

/* ------------------------------- departments ------------------------------- */

export function getDeptTree(): Promise<DeptRecord[]> {
  return api.get<DeptRecord[]>(`${V1}/dept/tree`);
}

export function getDeptOptions(): Promise<DeptOption[]> {
  return api.get<DeptOption[]>(`${V1}/dept/options`);
}

export function getDeptPage(query: DeptListQuery): Promise<PageResult<DeptRecord>> {
  return api
    .get<ApiPageRaw<DeptRecord>>(`${V1}/dept/page`, {
      params: compactQuery(query),
    })
    .then(toPageResult);
}

export function getDeptDetail(id: number): Promise<DeptRecord> {
  return api.get<DeptRecord>(`${V1}/dept/${id}`);
}

export function createDept(data: DeptInput): Promise<void> {
  return api.post<void>(`${V1}/dept`, data);
}

export function updateDept(id: number, data: DeptInput): Promise<void> {
  return api.put<void>(`${V1}/dept/${id}`, data);
}

export function deleteDept(id: number): Promise<void> {
  return api.delete<void>(`${V1}/dept/${id}`);
}

export function batchDeleteDepts(ids: number[]): Promise<void> {
  return api.post<void>(`${V1}/dept/batch-delete`, { ids });
}

export function updateDeptStatus(id: number, status: 0 | 1): Promise<void> {
  return api.patch<void>(`${V1}/dept/${id}/status`, { status });
}

/* ------------------------------- dictionaries ------------------------------- */

export function getDictTypePage(
  query: DictTypeListQuery,
): Promise<PageResult<DictTypeRecord>> {
  return api
    .get<ApiPageRaw<DictTypeRecord>>(`${V1}/dict-type/page`, {
      params: compactQuery(query),
    })
    .then(toPageResult);
}

export function getDictTypeDetail(id: number): Promise<DictTypeRecord> {
  return api.get<DictTypeRecord>(`${V1}/dict-type/${id}`);
}

export function createDictType(data: DictTypeInput): Promise<void> {
  return api.post<void>(`${V1}/dict-type`, data);
}

export function updateDictType(id: number, data: DictTypeInput): Promise<void> {
  return api.put<void>(`${V1}/dict-type/${id}`, data);
}

export function deleteDictType(id: number): Promise<void> {
  return api.delete<void>(`${V1}/dict-type/${id}`);
}

export function batchDeleteDictTypes(ids: number[]): Promise<void> {
  return api.post<void>(`${V1}/dict-type/batch-delete`, { ids });
}

export function updateDictTypeStatus(id: number, status: 0 | 1): Promise<void> {
  return api.patch<void>(`${V1}/dict-type/${id}/status`, { status });
}

export function getDictDataPage(
  query: DictDataListQuery,
): Promise<PageResult<DictDataRecord>> {
  return api
    .get<ApiPageRaw<DictDataRecord>>(`${V1}/dict-data/page`, {
      params: compactQuery(query),
    })
    .then(toPageResult);
}

export function getDictDataDetail(id: number): Promise<DictDataRecord> {
  return api.get<DictDataRecord>(`${V1}/dict-data/${id}`);
}

export function createDictData(data: DictDataInput): Promise<void> {
  return api.post<void>(`${V1}/dict-data`, data);
}

export function updateDictData(id: number, data: DictDataInput): Promise<void> {
  return api.put<void>(`${V1}/dict-data/${id}`, data);
}

export function deleteDictData(id: number): Promise<void> {
  return api.delete<void>(`${V1}/dict-data/${id}`);
}

export function batchDeleteDictData(ids: number[]): Promise<void> {
  return api.post<void>(`${V1}/dict-data/batch-delete`, { ids });
}

export function getDictItems(dictCode: string): Promise<DictOption[]> {
  return api.get<DictOption[]>(`${V1}/dict/${encodeURIComponent(dictCode)}/items`);
}

/* ------------------------------- configs ------------------------------- */

export function getConfigPage(query: ConfigListQuery): Promise<PageResult<ConfigRecord>> {
  return api
    .get<ApiPageRaw<ConfigRecord>>(`${V1}/config/page`, {
      params: compactQuery(query),
    })
    .then(toPageResult);
}

export function getConfigDetail(id: number): Promise<ConfigRecord> {
  return api.get<ConfigRecord>(`${V1}/config/${id}`);
}

export function createConfig(data: ConfigInput): Promise<void> {
  return api.post<void>(`${V1}/config`, data);
}

export function updateConfig(id: number, data: ConfigInput): Promise<void> {
  return api.put<void>(`${V1}/config/${id}`, data);
}

export function deleteConfig(id: number): Promise<void> {
  return api.delete<void>(`${V1}/config/${id}`);
}

export function batchDeleteConfigs(ids: number[]): Promise<void> {
  return api.post<void>(`${V1}/config/batch-delete`, { ids });
}

export function updateConfigStatus(id: number, status: 0 | 1): Promise<void> {
  return api.patch<void>(`${V1}/config/${id}/status`, { status });
}

/* ------------------------------- files ------------------------------- */

export function getFilePage(query: FileListQuery): Promise<PageResult<FileRecord>> {
  return api
    .get<ApiPageRaw<FileRecord>>(`${V1}/file/page`, {
      params: compactQuery(query),
    })
    .then(toPageResult);
}

export function getFileDetail(id: number): Promise<FileRecord> {
  return api.get<FileRecord>(`${V1}/file/${id}`);
}

function uploadFormData(files: File[], options: FileUploadOptions = {}, field = 'file') {
  const formData = new FormData();
  files.forEach((file) => formData.append(field, file));
  if (options.businessModule) formData.append('businessModule', options.businessModule);
  if (options.remark) formData.append('remark', options.remark);
  return formData;
}

export function uploadFile(file: File, options?: FileUploadOptions): Promise<FileRecord> {
  return api.post<FileRecord>(
    `${V1}/file/upload`,
    uploadFormData([file], options, 'file'),
  );
}

export function uploadFiles(
  files: File[],
  options?: FileUploadOptions,
): Promise<FileUploadBatchResult> {
  return api.post<FileUploadBatchResult>(
    `${V1}/file/upload-batch`,
    uploadFormData(files, options, 'files'),
  );
}

export function updateFile(
  id: number,
  data: { businessModule?: string; remark?: string },
): Promise<void> {
  return api.put<void>(`${V1}/file/${id}`, data);
}

export function deleteFile(id: number): Promise<void> {
  return api.delete<void>(`${V1}/file/${id}`);
}

export function batchDeleteFiles(ids: number[]): Promise<void> {
  return api.post<void>(`${V1}/file/batch-delete`, { ids });
}

export function updateFileStatus(id: number, status: 0 | 1): Promise<void> {
  return api.patch<void>(`${V1}/file/${id}/status`, { status });
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
  return api.get<FileAccessLink>(`${V1}/file/${id}/access-url`, {
    params: { disposition },
    signal,
  });
}

/** Load the stable local stream URL with the API token, or a signed URL with cookies omitted. */
export async function getFileBlob(url: string, signal?: AbortSignal): Promise<Blob> {
  if (url.startsWith('/api/')) {
    return api.blob(url.slice('/api/v1'.length), { signal });
  }
  // The signed URL authorizes R2 access; never send the API Bearer Token to R2.
  const response = await fetch(url, { credentials: 'omit', signal });
  if (!response.ok) throw new Error('文件加载失败，请重试');
  return response.blob();
}

export async function downloadFile(id: number): Promise<Blob> {
  const link = await getFileLink(id, 'attachment');
  return getFileBlob(link.url);
}

export function getFileViewUrl(id: number): string {
  return buildApiUrl(`${V1}/file/${id}/view`);
}

/* ------------------------------- logs ------------------------------- */

export function getLoginLogPage(
  query: LoginLogListQuery,
): Promise<PageResult<LoginLogRecord>> {
  return api
    .get<ApiPageRaw<LoginLogRecord>>(`${V1}/login-log/page`, {
      params: compactQuery(query),
    })
    .then(toPageResult);
}

export function getLoginLogDetail(id: number): Promise<LoginLogRecord> {
  return api.get<LoginLogRecord>(`${V1}/login-log/${id}`);
}

export function clearLoginLogs(): Promise<void> {
  return api.delete<void>(`${V1}/login-log/clear`);
}

export function getOperLogPage(
  query: OperLogListQuery,
): Promise<PageResult<OperLogRecord>> {
  return api
    .get<ApiPageRaw<OperLogRecord>>(`${V1}/oper-log/page`, {
      params: compactQuery(query),
    })
    .then(toPageResult);
}

export function getOperLogDetail(id: number): Promise<OperLogDetail> {
  return api.get<OperLogDetail>(`${V1}/oper-log/${id}`);
}

export function clearOperLogs(): Promise<void> {
  return api.delete<void>(`${V1}/oper-log/clear`);
}
