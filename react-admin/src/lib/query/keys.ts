import type {
  ConfigListQuery,
  DeptListQuery,
  DictDataListQuery,
  DictTypeListQuery,
  FileListQuery,
  LoginLogListQuery,
  OperLogListQuery,
  RoleListQuery,
  SystemMenuListQuery,
  UserListQuery,
} from '../../types/system';

export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    me: () => ['auth', 'me'] as const,
    menus: () => ['auth', 'menus'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (query: UserListQuery) => ['users', 'list', query] as const,
    detail: (id: number) => ['users', 'detail', id] as const,
    roleOptions: () => ['users', 'role-options'] as const,
  },
  roles: {
    all: ['roles'] as const,
    list: (query: RoleListQuery) => ['roles', 'list', query] as const,
    detail: (id: number) => ['roles', 'detail', id] as const,
    menuTree: () => ['roles', 'menu-tree'] as const,
  },
  menus: {
    all: ['menus'] as const,
    list: (query: SystemMenuListQuery) => ['menus', 'list', query] as const,
    tree: () => ['menus', 'tree'] as const,
  },
  depts: {
    all: ['depts'] as const,
    list: (query: DeptListQuery) => ['depts', 'list', query] as const,
    options: () => ['depts', 'options'] as const,
  },
  dicts: {
    all: ['dicts'] as const,
    types: (query: DictTypeListQuery) => ['dicts', 'types', query] as const,
    data: (query: DictDataListQuery) => ['dicts', 'data', query] as const,
  },
  configs: {
    all: ['configs'] as const,
    list: (query: ConfigListQuery) => ['configs', 'list', query] as const,
  },
  files: {
    all: ['files'] as const,
    list: (query: FileListQuery) => ['files', 'list', query] as const,
  },
  loginLogs: {
    all: ['login-logs'] as const,
    list: (query: LoginLogListQuery) => ['login-logs', 'list', query] as const,
    detail: (id: number) => ['login-logs', 'detail', id] as const,
  },
  operLogs: {
    all: ['oper-logs'] as const,
    list: (query: OperLogListQuery) => ['oper-logs', 'list', query] as const,
    detail: (id: number) => ['oper-logs', 'detail', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (query: { page: number; pageSize: number }) => ['notifications', 'list', query] as const,
    unread: () => ['notifications', 'unread'] as const,
    adminList: (query: { page: number; pageSize: number }) =>
      ['notifications', 'admin-list', query] as const,
  },
  announcements: {
    all: ['announcements'] as const,
    list: (scope: string, query: { page: number; pageSize: number }) =>
      ['announcements', 'list', scope, query] as const,
    detail: (scope: string, id: number) => ['announcements', 'detail', scope, id] as const,
    adminList: (query: { page: number; pageSize: number }) =>
      ['announcements', 'admin-list', query] as const,
  },
  monitoring: {
    all: ['monitoring'] as const,
    snapshot: () => ['monitoring', 'snapshot'] as const,
    history: (resource: string, device: string) =>
      ['monitoring', 'history', resource, device] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: () => ['dashboard', 'summary'] as const,
  },
};
