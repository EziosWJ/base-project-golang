import type { ApiStatus } from '../types/api';
import type { UserGender } from '../types/system';

export type StatusTone = 'success' | 'processing' | 'warning' | 'error' | 'default';

export interface StatusMeta {
  label: string;
  tone: StatusTone;
}

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
}

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 10;

export const statusMeta: Record<ApiStatus, StatusMeta> = {
  1: { label: '启用', tone: 'success' },
  0: { label: '禁用', tone: 'default' },
};

export const statusOptions: Array<SelectOption<ApiStatus>> = [
  { value: 1, label: '启用' },
  { value: 0, label: '禁用' },
];

export const visibleOptions: Array<SelectOption<ApiStatus>> = [
  { value: 1, label: '显示' },
  { value: 0, label: '隐藏' },
];

export const genderMeta: Record<UserGender, string> = {
  MALE: '男',
  FEMALE: '女',
  UNSPECIFIED: '未知',
};

export const genderOptions: Array<SelectOption<UserGender>> = [
  { value: 'MALE', label: '男' },
  { value: 'FEMALE', label: '女' },
  { value: 'UNSPECIFIED', label: '未知' },
];

export const menuTypeMeta: Record<string, string> = {
  DIR: '目录',
  MENU: '菜单',
  LINK: '外链',
};

export const menuTypeOptions: SelectOption[] = [
  { value: 'DIR', label: '目录' },
  { value: 'MENU', label: '菜单' },
  { value: 'LINK', label: '外链' },
];

export const configTypeMeta: Record<string, string> = {
  SYSTEM: '系统配置',
  CUSTOM: '自定义配置',
};

export const configTypeOptions: SelectOption[] = [
  { value: 'SYSTEM', label: '系统配置' },
  { value: 'CUSTOM', label: '自定义配置' },
];

export const configValueTypeMeta: Record<string, string> = {
  TEXT: '文本',
  NUMBER: '数字',
  BOOLEAN: '布尔',
};

export const configValueTypeOptions: SelectOption[] = [
  { value: 'TEXT', label: '文本' },
  { value: 'NUMBER', label: '数字' },
  { value: 'BOOLEAN', label: '布尔' },
];

export const loginStatusOptions: SelectOption[] = [
  { value: 'SUCCESS', label: '成功' },
  { value: 'FAIL', label: '失败' },
];

export const operationTypeMeta: Record<string, string> = {
  CREATE: '新增',
  UPDATE: '修改',
  DELETE: '删除',
  IMPORT: '导入',
  EXPORT: '导出',
};

export const operationTypeOptions: SelectOption[] = Object.entries(operationTypeMeta).map(
  ([value, label]) => ({ value, label }),
);

export const logStatusMeta: Record<string, StatusMeta> = {
  SUCCESS: { label: '成功', tone: 'success' },
  FAIL: { label: '失败', tone: 'error' },
  ERROR: { label: '失败', tone: 'error' },
};

export const announcementStatusMeta: Record<string, StatusMeta> = {
  DRAFT: { label: '草稿', tone: 'default' },
  PUBLISHED: { label: '已发布', tone: 'success' },
  WITHDRAWN: { label: '已撤回', tone: 'warning' },
};

export function getStatusMeta(
  meta: Record<string, StatusMeta>,
  value: string | number,
): StatusMeta {
  return meta[String(value)] ?? { label: String(value), tone: 'default' };
}
