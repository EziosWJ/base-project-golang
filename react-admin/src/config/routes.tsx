import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import {
  Bell,
  BookOpen,
  Building2,
  ClipboardList,
  File,
  FileSearch,
  FileText,
  LayoutDashboard,
  ListChecks,
  ListOrdered,
  LogIn,
  Menu as MenuIcon,
  MessageSquare,
  MonitorCog,
  Network,
  PanelLeft,
  Settings2,
  Shield,
  Table2,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { matchPath } from 'react-router-dom';

export interface AppRouteDefinition {
  /** Route pattern, e.g. /system/user. */
  path: string;
  label: string;
  /** Document title and command-search hint. */
  title: string;
  description: string;
  icon?: LucideIcon;
  /** Fallback breadcrumb group when no backend menu supplies one. */
  group?: string;
  component: LazyExoticComponent<ComponentType>;
  /** Backend menu permission code (sys_menu.permission_code). */
  permissionCode?: string;
  /** Local entry available to every signed-in account. */
  authenticatedOnly?: boolean;
  /** Local entry reserved for the ADMIN role (server still enforces its own rules). */
  adminOnly?: boolean;
  searchable?: boolean;
  keywords?: string;
}

const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const UsersPage = lazy(() => import('../pages/system/UsersPage'));
const RolesPage = lazy(() => import('../pages/system/RolesPage'));
const MenusPage = lazy(() => import('../pages/system/MenusPage'));
const DeptsPage = lazy(() => import('../pages/system/DeptsPage'));
const DictsPage = lazy(() => import('../pages/system/DictsPage'));
const ConfigsPage = lazy(() => import('../pages/system/ConfigsPage'));
const FilesPage = lazy(() => import('../pages/system/FilesPage'));
const LoginLogsPage = lazy(() => import('../pages/system/LoginLogsPage'));
const OperLogsPage = lazy(() => import('../pages/system/OperLogsPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const AnnouncementsPage = lazy(() => import('../pages/AnnouncementsPage'));
const NotificationAdminPage = lazy(() => import('../pages/system/NotificationAdminPage'));
const AnnouncementAdminPage = lazy(() => import('../pages/system/AnnouncementAdminPage'));
const ServerMonitoringPage = lazy(() => import('../pages/monitor/ServerMonitoringPage'));
const ProfilePage = lazy(() => import('../pages/account/ProfilePage'));
const ChangePasswordPage = lazy(() => import('../pages/account/ChangePasswordPage'));
const FormDemoPage = lazy(() => import('../pages/examples/FormDemoPage'));
const ListDemoPage = lazy(() => import('../pages/examples/ListDemoPage'));
const TreeDemoPage = lazy(() => import('../pages/examples/TreeDemoPage'));
const TreeTableDemoPage = lazy(() => import('../pages/examples/TreeTableDemoPage'));
const DetailDemoPage = lazy(() => import('../pages/examples/DetailDemoPage'));
const BrowsePickerDemoPage = lazy(() => import('../pages/examples/BrowsePickerDemoPage'));
const DocumentDialogDemoPage = lazy(() => import('../pages/examples/DocumentDialogDemoPage'));

export { LoginPage, NotFoundPage };

export const routeDefinitions: AppRouteDefinition[] = [
  {
    path: '/',
    label: '工作台',
    title: '系统工作台',
    description: '系统运行概况与常用入口。',
    icon: LayoutDashboard,
    component: DashboardPage,
    authenticatedOnly: true,
    searchable: true,
    keywords: 'dashboard workbench 首页 工作台',
  },
  {
    path: '/system/user',
    label: '用户管理',
    title: '用户管理',
    description: '维护系统账号、所属部门、角色与启用状态。',
    icon: Users,
    group: '系统管理',
    component: UsersPage,
    permissionCode: 'system:user',
    searchable: true,
    keywords: 'user 用户 账号 部门 角色',
  },
  {
    path: '/system/role',
    label: '角色管理',
    title: '角色管理',
    description: '维护角色、菜单授权与状态。',
    icon: Shield,
    group: '系统管理',
    component: RolesPage,
    permissionCode: 'system:role',
    searchable: true,
    keywords: 'role 角色 权限 菜单授权',
  },
  {
    path: '/system/menu',
    label: '菜单管理',
    title: '菜单管理',
    description: '维护导航菜单、路由标识与可见性。',
    icon: MenuIcon,
    group: '系统管理',
    component: MenusPage,
    permissionCode: 'system:menu',
    searchable: true,
    keywords: 'menu 菜单 导航 权限标识',
  },
  {
    path: '/system/dept',
    label: '部门管理',
    title: '部门管理',
    description: '维护组织架构与部门负责人。',
    icon: Building2,
    group: '系统管理',
    component: DeptsPage,
    permissionCode: 'system:dept',
    searchable: true,
    keywords: 'dept 部门 组织',
  },
  {
    path: '/system/dict',
    label: '字典管理',
    title: '字典管理',
    description: '维护字典类型与字典数据。',
    icon: BookOpen,
    group: '系统管理',
    component: DictsPage,
    permissionCode: 'system:dict',
    searchable: true,
    keywords: 'dict 字典 数据',
  },
  {
    path: '/system/config',
    label: '配置管理',
    title: '配置管理',
    description: '维护系统配置项与运行开关。',
    icon: Settings2,
    group: '系统管理',
    component: ConfigsPage,
    permissionCode: 'system:config',
    searchable: true,
    keywords: 'config 配置 参数',
  },
  {
    path: '/system/file',
    label: '文件管理',
    title: '文件管理',
    description: '上传、查看和维护业务文件。',
    icon: File,
    group: '文件管理',
    component: FilesPage,
    permissionCode: 'system:file',
    searchable: true,
    keywords: 'file 文件 附件 上传',
  },
  {
    path: '/system/login-log',
    label: '登录日志',
    title: '登录日志',
    description: '查看账号登录记录。',
    icon: LogIn,
    group: '日志管理',
    component: LoginLogsPage,
    permissionCode: 'system:login-log',
    searchable: true,
    keywords: 'login log 登录 日志',
  },
  {
    path: '/system/oper-log',
    label: '操作日志',
    title: '操作日志',
    description: '查看系统操作审计记录。',
    icon: ListChecks,
    group: '日志管理',
    component: OperLogsPage,
    permissionCode: 'system:oper-log',
    searchable: true,
    keywords: 'oper log 操作 审计 日志',
  },
  {
    path: '/monitor/server',
    label: '服务器监控',
    title: '服务器监控',
    description: '查看主机资源快照与历史趋势。',
    icon: MonitorCog,
    group: '系统监控',
    component: ServerMonitoringPage,
    permissionCode: 'monitor:server',
    searchable: true,
    keywords: 'monitor 监控 服务器 cpu 内存 磁盘 网络',
  },
  {
    path: '/notifications',
    label: '我的通知',
    title: '我的通知',
    description: '查看和标记站内通知。',
    icon: Bell,
    component: NotificationsPage,
    authenticatedOnly: true,
    searchable: true,
    keywords: 'notification 通知 消息',
  },
  {
    path: '/announcements',
    label: '公告',
    title: '公告',
    description: '查看站内与公开公告。',
    icon: MessageSquare,
    component: AnnouncementsPage,
    authenticatedOnly: true,
    searchable: true,
    keywords: 'announcement 公告 通知',
  },
  {
    path: '/system/notification',
    label: '通知管理',
    title: '通知管理',
    description: '向指定账号或全部账号发布通知。',
    icon: Bell,
    group: '消息中心',
    component: NotificationAdminPage,
    adminOnly: true,
    searchable: true,
    keywords: 'notification admin 通知 发布',
  },
  {
    path: '/system/announcement',
    label: '公告管理',
    title: '公告管理',
    description: '创建、发布和撤回公告。',
    icon: FileText,
    group: '消息中心',
    component: AnnouncementAdminPage,
    adminOnly: true,
    searchable: true,
    keywords: 'announcement admin 公告 发布',
  },
  {
    path: '/account/profile',
    label: '个人中心',
    title: '个人中心',
    description: '查看当前账号资料。',
    icon: UserCog,
    group: '账号',
    component: ProfilePage,
    authenticatedOnly: true,
    searchable: true,
    keywords: 'profile account 个人 账号 资料',
  },
  {
    path: '/account/change-password',
    label: '修改密码',
    title: '修改密码',
    description: '更新当前账号登录密码。',
    icon: Shield,
    group: '账号',
    component: ChangePasswordPage,
    authenticatedOnly: true,
    searchable: true,
    keywords: 'password account 密码 修改',
  },
  {
    path: '/forms/basic',
    label: '标准表单 Demo',
    title: '标准表单 Demo',
    description: '演示表单布局、校验和提交反馈。',
    icon: FileText,
    group: '页面示例',
    component: FormDemoPage,
    permissionCode: 'examples:form',
    searchable: true,
    keywords: 'form 表单 demo 示例',
  },
  {
    path: '/examples/list',
    label: '列表页 Demo',
    title: '列表页 Demo',
    description: '演示列表筛选、分页和列设置。',
    icon: Table2,
    group: '页面示例',
    component: ListDemoPage,
    permissionCode: 'examples:list',
    searchable: true,
    keywords: 'list table 列表 demo 示例',
  },
  {
    path: '/examples/tree',
    label: '树形结构 Demo',
    title: '树形结构 Demo',
    description: '演示树形数据展示与选择。',
    icon: Network,
    group: '页面示例',
    component: TreeDemoPage,
    permissionCode: 'examples:tree',
    searchable: true,
    keywords: 'tree 树 demo 示例',
  },
  {
    path: '/examples/tree-table',
    label: '左树右表 Demo',
    title: '左树右表 Demo',
    description: '演示树形导航配合列表。',
    icon: PanelLeft,
    group: '页面示例',
    component: TreeTableDemoPage,
    permissionCode: 'examples:tree-table',
    searchable: true,
    keywords: 'tree table 左树右表 demo 示例',
  },
  {
    path: '/examples/detail',
    label: '详情页 Demo',
    title: '详情页 Demo',
    description: '演示详情字段与区块布局。',
    icon: FileSearch,
    group: '页面示例',
    component: DetailDemoPage,
    permissionCode: 'examples:detail',
    searchable: true,
    keywords: 'detail 详情 demo 示例',
  },
  {
    path: '/examples/browse-picker',
    label: '浏览选择 Demo',
    title: '浏览选择 Demo',
    description: '演示弹窗浏览与选择。',
    icon: ListOrdered,
    group: '页面示例',
    component: BrowsePickerDemoPage,
    permissionCode: 'examples:browse-picker',
    searchable: true,
    keywords: 'picker browse 选择 demo 示例',
  },
  {
    path: '/examples/document-dialog',
    label: '单据弹窗 Demo',
    title: '单据弹窗 Demo',
    description: '演示单据明细弹窗交互。',
    icon: ClipboardList,
    group: '页面示例',
    component: DocumentDialogDemoPage,
    permissionCode: 'examples:document-dialog',
    searchable: true,
    keywords: 'document dialog 单据 demo 示例',
  },
];

function normalizePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

function patternScore(pattern: string): number {
  return pattern.split('/').filter(Boolean).length * 10 + (pattern.includes(':') ? 0 : 5);
}

/** Matches the most specific configured route for a browser pathname. */
export function matchRoute(pathname: string): AppRouteDefinition | undefined {
  const normalized = normalizePath(pathname);
  return [...routeDefinitions]
    .filter((route) => matchPath({ path: route.path, end: true }, normalized))
    .sort((left, right) => patternScore(right.path) - patternScore(left.path))[0];
}

export function findRouteByPermissionCode(code: string | null | undefined) {
  if (!code) return undefined;
  return routeDefinitions.find((route) => route.permissionCode === code);
}

export function findRouteByPath(path: string | null | undefined) {
  if (!path) return undefined;
  const normalized = normalizePath(path);
  return routeDefinitions.find((route) => route.path === normalized);
}

export function getNavigationRoute(pathname: string): AppRouteDefinition | undefined {
  return matchRoute(pathname);
}
