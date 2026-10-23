import { useMemo, type ReactNode } from 'react';
import { Card, Col, Empty, List, Row, Space, Statistic, Tag, Tooltip, Typography } from 'antd';
import {
  Bell,
  Building2,
  FileText,
  MonitorCog,
  Shield,
  Users as UsersIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../features/auth/store';
import { buildMenuAccess } from '../lib/access';
import { buildNavigation, flattenNavigation } from '../config/navigation';
import { queryKeys } from '../lib/query/keys';
import {
  getDeptTree,
  getFilePage,
  getLoginLogPage,
  getRolePage,
  getUserPage,
} from '../features/system/api';
import { getUnreadNotificationCount, getNotifications } from '../features/notifications/api';
import { getMonitorSnapshot } from '../features/monitoring/api';
import { getErrorMessage } from '../lib/api/errors';
import type { DeptRecord } from '../types/system';

function countTree(nodes: DeptRecord[]): number {
  return nodes.reduce((total, node) => total + 1 + countTree(node.children ?? []), 0);
}

function StatCard({
  title,
  value,
  loading,
  error,
  icon,
  to,
}: {
  title: string;
  value: number | undefined;
  loading: boolean;
  error: unknown;
  icon: ReactNode;
  to: string;
}) {
  const display = loading ? '…' : error ? '—' : (value ?? 0);
  return (
    <Card size="small" className="workbench-stat">
      <Space align="start" size={12}>
        <span className="workbench-stat-icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <Typography.Text type="secondary">{title}</Typography.Text>
          <div>
            <Tooltip title={error ? getErrorMessage(error) : undefined}>
              <Statistic value={display} styles={{ content: { fontSize: 26 } }} />
            </Tooltip>
          </div>
          <Link to={to}>查看详情</Link>
        </div>
      </Space>
    </Card>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const menus = useAuthStore((state) => state.menus);
  const access = useMemo(() => buildMenuAccess(menus, user), [menus, user]);
  const navigation = useMemo(
    () => buildNavigation(menus, access.isAdmin),
    [menus, access.isAdmin],
  );
  const quickEntries = useMemo(
    () =>
      flattenNavigation(navigation)
        .filter((item) => item.path && item.path !== '/' && !item.external)
        .slice(0, 8),
    [navigation],
  );

  const can = (code: string) => access.codes.has(code);

  const users = useQuery({
    queryKey: queryKeys.users.list({ page: 1, pageSize: 1 }),
    queryFn: () => getUserPage({ page: 1, pageSize: 1 }),
    enabled: can('system:user'),
    staleTime: 60_000,
  });
  const roles = useQuery({
    queryKey: queryKeys.roles.list({ page: 1, pageSize: 1 }),
    queryFn: () => getRolePage({ page: 1, pageSize: 1 }),
    enabled: can('system:role'),
    staleTime: 60_000,
  });
  const depts = useQuery({
    queryKey: queryKeys.depts.options(),
    queryFn: getDeptTree,
    enabled: can('system:dept'),
    staleTime: 60_000,
  });
  const files = useQuery({
    queryKey: queryKeys.files.list({ page: 1, pageSize: 1 }),
    queryFn: () => getFilePage({ page: 1, pageSize: 1 }),
    enabled: can('system:file'),
    staleTime: 60_000,
  });
  const unread = useQuery({
    queryKey: queryKeys.notifications.unread(),
    queryFn: getUnreadNotificationCount,
    staleTime: 30_000,
  });
  const notifications = useQuery({
    queryKey: queryKeys.notifications.list({ page: 1, pageSize: 5 }),
    queryFn: () => getNotifications({ page: 1, pageSize: 5 }),
    staleTime: 30_000,
  });
  const loginLogs = useQuery({
    queryKey: queryKeys.loginLogs.list({ page: 1, pageSize: 5 }),
    queryFn: () => getLoginLogPage({ page: 1, pageSize: 5 }),
    enabled: can('system:login-log'),
    staleTime: 30_000,
  });
  const monitor = useQuery({
    queryKey: queryKeys.monitoring.snapshot(),
    queryFn: () => getMonitorSnapshot(),
    enabled: can('monitor:server'),
    staleTime: 30_000,
  });

  const roleNames = user?.roles.map((role) => role.roleName).join(' / ') || '未分配角色';
  const host = monitor.data?.host;

  return (
    <div className="workbench">
      <Card className="workbench-hero" variant="borderless">
        <Row gutter={[24, 16]} align="middle">
          <Col flex="auto">
            <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 6 }}>
              {user?.nickname || user?.username || '你好'}，欢迎回来
            </Typography.Title>
            <Typography.Text type="secondary">
              {user?.dept?.deptName || '未分配部门'} · {roleNames}
              {user?.lastLoginTime
                ? ` · 上次登录 ${user.lastLoginTime.replace('T', ' ').slice(0, 16)}`
                : ''}
            </Typography.Text>
          </Col>
          <Col>
            <Space size={20} wrap>
              <div>
                <Typography.Text type="secondary">未读通知</Typography.Text>
                <div>
                  <Typography.Title level={3} style={{ margin: 0 }}>
                    {unread.data ?? '—'}
                  </Typography.Title>
                </div>
              </div>
              <div>
                <Typography.Text type="secondary">监控数据源</Typography.Text>
                <div>
                  {host?.data ? (
                    <Tag color="success">{host.data.hostname}</Tag>
                  ) : (
                    <Tag color="default">{host?.status ?? '未启用'}</Tag>
                  )}
                </div>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {(can('system:user') || can('system:role') || can('system:dept') || can('system:file')) && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {can('system:user') && (
            <Col xs={24} sm={12} xl={6}>
              <StatCard
                title="系统用户"
                value={users.data?.total}
                loading={users.isLoading}
                error={users.error}
                icon={<UsersIcon size={20} />}
                to="/system/user"
              />
            </Col>
          )}
          {can('system:role') && (
            <Col xs={24} sm={12} xl={6}>
              <StatCard
                title="角色"
                value={roles.data?.total}
                loading={roles.isLoading}
                error={roles.error}
                icon={<Shield size={20} />}
                to="/system/role"
              />
            </Col>
          )}
          {can('system:dept') && (
            <Col xs={24} sm={12} xl={6}>
              <StatCard
                title="部门节点"
                value={depts.data ? countTree(depts.data) : undefined}
                loading={depts.isLoading}
                error={depts.error}
                icon={<Building2 size={20} />}
                to="/system/dept"
              />
            </Col>
          )}
          {can('system:file') && (
            <Col xs={24} sm={12} xl={6}>
              <StatCard
                title="文件"
                value={files.data?.total}
                loading={files.isLoading}
                error={files.error}
                icon={<FileText size={20} />}
                to="/system/file"
              />
            </Col>
          )}
        </Row>
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <Bell size={16} />
                最新通知
              </Space>
            }
            extra={<Link to="/notifications">全部通知</Link>}
          >
            {notifications.isLoading ? (
              <Typography.Text type="secondary">加载中…</Typography.Text>
            ) : notifications.error ? (
              <Typography.Text type="danger">{getErrorMessage(notifications.error)}</Typography.Text>
            ) : (notifications.data?.items.length ?? 0) === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无通知" />
            ) : (
              <List
                size="small"
                dataSource={notifications.data?.items ?? []}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Link to={item.jumpPath || '/notifications'}>{item.title}</Link>}
                      description={item.publishTime?.replace('T', ' ').slice(0, 16)}
                    />
                    {item.isRead !== 1 && <Tag color="processing">未读</Tag>}
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          {can('system:login-log') ? (
            <Card
              title={
                <Space>
                  <MonitorCog size={16} />
                  最近登录
                </Space>
              }
              extra={<Link to="/system/login-log">登录日志</Link>}
            >
              {loginLogs.isLoading ? (
                <Typography.Text type="secondary">加载中…</Typography.Text>
              ) : loginLogs.error ? (
                <Typography.Text type="danger">{getErrorMessage(loginLogs.error)}</Typography.Text>
              ) : (loginLogs.data?.items.length ?? 0) === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无登录记录" />
              ) : (
                <List
                  size="small"
                  dataSource={loginLogs.data?.items ?? []}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={item.username}
                        description={`${item.loginIp} · ${item.browser || '未知浏览器'}`}
                      />
                      <Space size={8}>
                        <Tag color={item.loginStatus === 'SUCCESS' ? 'success' : 'error'}>
                          {item.loginStatus === 'SUCCESS' ? '成功' : '失败'}
                        </Tag>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {item.loginTime?.replace('T', ' ').slice(0, 16)}
                        </Typography.Text>
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          ) : (
            <Card title="快捷入口">
              <List
                size="small"
                dataSource={quickEntries}
                renderItem={(item) => (
                  <List.Item>
                    <Space>
                      {item.icon ? <item.icon size={16} /> : null}
                      <Link to={item.path as string}>{item.label}</Link>
                    </Space>
                    <Typography.Text type="secondary">{item.parents.join(' / ') || '导航'}</Typography.Text>
                  </List.Item>
                )}
              />
            </Card>
          )}
        </Col>
      </Row>

      {can('system:login-log') && quickEntries.length > 0 && (
        <Card title="快捷入口" style={{ marginTop: 16 }}>
          <Row gutter={[12, 12]}>
            {quickEntries.map((item) => {
              const Icon = item.icon;
              return (
                <Col xs={12} sm={8} md={6} key={item.path}>
                  <Link to={item.path as string} className="workbench-quick-link">
                    {Icon ? <Icon size={18} /> : null}
                    <span>{item.label}</span>
                  </Link>
                </Col>
              );
            })}
          </Row>
        </Card>
      )}
    </div>
  );
}
