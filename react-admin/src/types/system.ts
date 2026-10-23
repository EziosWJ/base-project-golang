import type { ApiStatus, PageQuery } from './api';

/* ------------------------------- users ------------------------------- */

export type UserGender = 'MALE' | 'FEMALE' | 'UNSPECIFIED';

export interface UserRoleSummary {
  id: number;
  roleName: string;
  roleCode?: string;
  status?: ApiStatus;
}

export interface UserRecord {
  id: number;
  username: string;
  nickname: string;
  phone?: string | null;
  email?: string | null;
  avatar?: string | null;
  gender: UserGender;
  deptId?: number | null;
  deptName?: string | null;
  status: ApiStatus;
  isBuiltin: ApiStatus;
  roles?: UserRoleSummary[];
  lastLoginTime?: string | null;
  lastLoginIp?: string | null;
  remark?: string | null;
  createTime?: string;
  updateTime?: string;
}

export interface UserListQuery extends PageQuery {
  username?: string;
  nickname?: string;
  phone?: string;
  email?: string;
  status?: ApiStatus;
  deptId?: number;
}

export interface UserInput {
  username?: string;
  nickname: string;
  phone?: string;
  email?: string;
  gender?: UserGender;
  deptId?: number | null;
  status: ApiStatus;
  remark?: string;
}

export interface AssignableRole {
  id: number;
  roleName: string;
  roleCode: string;
  status: ApiStatus;
}

/* ------------------------------- roles ------------------------------- */

export interface RoleRecord {
  id: number;
  roleName: string;
  roleCode: string;
  status: ApiStatus;
  sortOrder: number;
  isBuiltin: ApiStatus;
  remark?: string | null;
  createTime?: string;
  updateTime?: string;
}

export interface RoleDetailRecord extends RoleRecord {
  menuIds: number[];
}

export interface RoleListQuery extends PageQuery {
  roleName?: string;
  roleCode?: string;
  status?: ApiStatus;
}

export interface RoleInput {
  roleName: string;
  roleCode: string;
  status: ApiStatus;
  sortOrder: number;
  remark?: string;
}

/* ------------------------------- menus ------------------------------- */

export type SystemMenuType = 'DIR' | 'MENU' | 'LINK';

export interface SystemMenuRecord {
  id: number;
  parentId: number;
  menuName: string;
  menuType: SystemMenuType;
  path?: string | null;
  component?: string | null;
  externalUrl?: string | null;
  icon?: string | null;
  permissionCode?: string | null;
  sortOrder: number;
  visible: ApiStatus;
  status: ApiStatus;
  isBuiltin: ApiStatus;
  remark?: string | null;
  createTime?: string;
  updateTime?: string;
  children?: SystemMenuRecord[];
}

export interface SystemMenuListQuery extends PageQuery {
  menuName?: string;
  menuType?: SystemMenuType;
  status?: ApiStatus;
  visible?: ApiStatus;
}

export interface SystemMenuInput {
  parentId: number;
  menuName: string;
  menuType: SystemMenuType;
  path?: string;
  component?: string;
  externalUrl?: string;
  icon?: string;
  permissionCode?: string;
  sortOrder: number;
  visible: ApiStatus;
  status: ApiStatus;
  remark?: string;
}

/* ------------------------------- departments ------------------------------- */

export interface DeptRecord {
  id: number;
  parentId: number;
  deptName: string;
  deptCode: string;
  leader?: string | null;
  phone?: string | null;
  email?: string | null;
  sortOrder: number;
  status: ApiStatus;
  isBuiltin: ApiStatus;
  remark?: string | null;
  createTime?: string;
  updateTime?: string;
  children?: DeptRecord[];
}

export interface DeptOption {
  id: number;
  parentId: number;
  deptName: string;
  deptCode?: string;
  disabled?: boolean;
  children?: DeptOption[];
}

export interface DeptListQuery extends PageQuery {
  deptName?: string;
  deptCode?: string;
  status?: ApiStatus;
}

export interface DeptInput {
  parentId: number;
  deptName: string;
  deptCode: string;
  leader?: string;
  phone?: string;
  email?: string;
  sortOrder: number;
  status: ApiStatus;
  remark?: string;
}

/* ------------------------------- dictionaries ------------------------------- */

export interface DictTypeRecord {
  id: number;
  dictName: string;
  dictCode: string;
  status: ApiStatus;
  sortOrder: number;
  isBuiltin: ApiStatus;
  remark?: string | null;
  createTime?: string;
  updateTime?: string;
}

export interface DictDataRecord {
  id: number;
  dictTypeId: number;
  dictCode?: string;
  dictLabel: string;
  dictValue: string;
  sortOrder: number;
  remark?: string | null;
  createTime?: string;
  updateTime?: string;
}

export interface DictTypeListQuery extends PageQuery {
  dictName?: string;
  dictCode?: string;
  status?: ApiStatus;
}

export interface DictDataListQuery extends PageQuery {
  dictTypeId?: number;
  dictLabel?: string;
  dictValue?: string;
}

export interface DictTypeInput {
  dictName: string;
  dictCode: string;
  status: ApiStatus;
  sortOrder: number;
  remark?: string;
}

export interface DictDataInput {
  dictTypeId: number;
  dictLabel: string;
  dictValue: string;
  sortOrder: number;
  remark?: string;
}

export interface DictOption {
  label: string;
  value: string;
  sortOrder: number;
}

/* ------------------------------- configs ------------------------------- */

export type ConfigScope = 'SYSTEM' | 'CUSTOM';
export type ConfigValueType = 'TEXT' | 'NUMBER' | 'BOOLEAN';

export interface ConfigRecord {
  id: number;
  configName: string;
  configKey: string;
  configValue: string;
  configType: ConfigScope;
  valueType: ConfigValueType;
  status: ApiStatus;
  isBuiltin: ApiStatus;
  remark?: string | null;
  createTime?: string;
  updateTime?: string;
}

export interface ConfigListQuery extends PageQuery {
  configName?: string;
  configKey?: string;
  configType?: ConfigScope;
  status?: ApiStatus;
}

export interface ConfigInput {
  configName: string;
  configKey: string;
  configValue?: string;
  configType: ConfigScope;
  valueType: ConfigValueType;
  status: ApiStatus;
  remark?: string;
}

/* ------------------------------- files ------------------------------- */

export interface FileRecord {
  id: number;
  originalName: string;
  storageName: string;
  extension: string;
  mimeType: string;
  fileSize: number;
  fileMd5?: string;
  accessUrl: string;
  businessModule?: string | null;
  remark?: string | null;
  status: ApiStatus;
  createTime: string;
  updateTime?: string;
}

export interface FileListQuery extends PageQuery {
  originalName?: string;
  businessModule?: string;
  mimeType?: string;
  status?: ApiStatus;
}

export interface FileUploadOptions {
  businessModule?: string;
  remark?: string;
}

export interface FileUploadFailure {
  fileName: string;
  message: string;
  index: number;
}

export interface FileUploadBatchResult {
  succeeded: FileRecord[];
  failed: FileUploadFailure[];
}

/* ------------------------------- logs ------------------------------- */

export interface LoginLogRecord {
  id: number;
  username: string;
  loginStatus: string;
  loginIp: string;
  loginLocation?: string;
  browser: string;
  os: string;
  userAgent?: string;
  message: string;
  loginTime: string;
  createTime?: string;
}

export interface LoginLogListQuery extends PageQuery {
  username?: string;
  loginIp?: string;
  loginStatus?: string;
}

export interface OperLogRecord {
  id: number;
  moduleName: string;
  operationType: string;
  requestMethod: string;
  requestUrl: string;
  operatorName: string;
  operatorIp: string;
  operationStatus: string;
  costTime: number;
  operationTime: string;
}

export interface OperLogDetail extends OperLogRecord {
  requestParams?: string;
  responseResult?: string;
  errorMessage?: string;
}

export interface OperLogListQuery extends PageQuery {
  moduleName?: string;
  operatorName?: string;
  operationType?: string;
  operationStatus?: string;
}
