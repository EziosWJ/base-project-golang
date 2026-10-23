import {
  App,
  Badge,
  Button,
  Dropdown,
  Empty,
  Space,
  Spin,
  Typography,
  type MenuProps,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCheck, MailOpen } from 'lucide-react';
import { queryKeys } from '../../lib/query/keys';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../features/notifications/api';
import type { NotificationRecord } from '../../types/notification';

export function NotificationBell() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const unread = useQuery({
    queryKey: queryKeys.notifications.unread(),
    queryFn: getUnreadNotificationCount,
    refetchInterval: 60_000,
    staleTime: 15_000,
  });

  const recent = useQuery({
    queryKey: queryKeys.notifications.list({ page: 1, pageSize: 5 }),
    queryFn: () => getNotifications({ page: 1, pageSize: 5 }),
    refetchInterval: 60_000,
    staleTime: 15_000,
  });

  const open = async (record: NotificationRecord) => {
    try {
      if (record.isRead !== 1) await markNotificationRead(record.id);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '标记已读失败');
    } finally {
      void unread.refetch();
      void recent.refetch();
      navigate(record.jumpPath || '/notifications');
    }
  };

  const readAll = async () => {
    try {
      await markAllNotificationsRead();
      message.success('已全部标记为已读');
      void unread.refetch();
      void recent.refetch();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  const records = recent.data?.items ?? [];
  const items: MenuProps['items'] = [
    ...(recent.isLoading
      ? [{ key: 'loading', label: <Spin size="small" />, disabled: true }]
      : records.length === 0
        ? [
            {
              key: 'empty',
              label: (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无通知" />
              ),
              disabled: true,
            },
          ]
        : records.map((record) => ({
            key: `notification-${record.id}`,
            label: (
              <div style={{ maxWidth: 280, padding: '2px 0' }}>
                <Space size={6} align="start">
                  {record.isRead !== 1 && <Badge status="processing" />}
                  <div>
                    <Typography.Text strong={record.isRead !== 1}>
                      {record.title}
                    </Typography.Text>
                    <div style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>
                      {record.publishTime?.replace('T', ' ').slice(0, 16)}
                    </div>
                  </div>
                </Space>
              </div>
            ),
            onClick: () => void open(record),
          }))),
    { type: 'divider' as const },
    {
      key: 'view-all',
      icon: <MailOpen size={14} />,
      label: '查看全部通知',
      onClick: () => navigate('/notifications'),
    },
    {
      key: 'read-all',
      icon: <CheckCheck size={14} />,
      label: '全部标记为已读',
      disabled: !unread.data,
      onClick: () => void readAll(),
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <Badge count={unread.data ?? 0} size="small" offset={[-4, 4]}>
        <Button type="text" aria-label="站内通知" icon={<Bell size={18} />} />
      </Badge>
    </Dropdown>
  );
}
