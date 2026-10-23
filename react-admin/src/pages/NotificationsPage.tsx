import { useState } from 'react';
import { App, Button, Card, Empty, List, Pagination, Space, Tag, Typography } from 'antd';
import { CheckCheck, RefreshCw } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { DetailDrawer } from '../components/admin/DetailDrawer';
import { getErrorMessage } from '../lib/api/errors';
import { formatDateTime } from '../utils/format';
import { queryKeys } from '../lib/query/keys';
import {
  getNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  getUnreadNotificationCount,
} from '../features/notifications/api';

export default function NotificationsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailId, setDetailId] = useState<number | null>(null);

  const list = useQuery({
    queryKey: queryKeys.notifications.list({ page, pageSize }),
    queryFn: () => getNotifications({ page, pageSize }),
  });
  const unread = useQuery({
    queryKey: queryKeys.notifications.unread(),
    queryFn: getUnreadNotificationCount,
  });
  const detail = useQuery({
    queryKey: [...queryKeys.notifications.all, 'detail', detailId ?? 0],
    queryFn: () => getNotification(detailId as number),
    enabled: detailId !== null,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  };

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      message.success('已全部标记为已读');
      invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openDetail = (id: number, isRead: number) => {
    setDetailId(id);
    if (isRead !== 1) readMutation.mutate(id);
  };

  return (
    <div>
      <PageHeader
        title="我的通知"
        description="站内通知来自管理员发布或系统事件。未读数量会显示在顶部导航。"
        extra={
          <Space>
            <Button
              icon={<CheckCheck size={16} />}
              loading={readAllMutation.isPending}
              disabled={!unread.data}
              onClick={() => readAllMutation.mutate()}
            >
              全部已读
            </Button>
            <Button icon={<RefreshCw size={16} />} onClick={() => void list.refetch()}>
              刷新
            </Button>
          </Space>
        }
      />

      <Card>
        {list.isLoading ? (
          <Typography.Text type="secondary">加载中…</Typography.Text>
        ) : list.error ? (
          <Typography.Text type="danger">{getErrorMessage(list.error)}</Typography.Text>
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <Empty description="暂无通知" />
        ) : (
          <>
            <List
              dataSource={list.data?.items ?? []}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button key="view" type="link" size="small" onClick={() => openDetail(item.id, item.isRead)}>
                      查看
                    </Button>,
                    item.isRead !== 1 ? (
                      <Button
                        key="read"
                        type="link"
                        size="small"
                        onClick={() => readMutation.mutate(item.id)}
                      >
                        标记已读
                      </Button>
                    ) : null,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space size={8}>
                        {item.isRead !== 1 && <Tag color="processing">未读</Tag>}
                        <Typography.Link strong onClick={() => openDetail(item.id, item.isRead)}>
                          {item.title}
                        </Typography.Link>
                      </Space>
                    }
                    description={
                      <Space separator={<span>·</span>} size={6} wrap>
                        <span>{formatDateTime(item.publishTime)}</span>
                        <span>{item.sourceType === 'MANUAL' ? '管理员发布' : item.sourceType}</span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
            <Pagination
              style={{ marginTop: 16, textAlign: 'right' }}
              current={page}
              pageSize={pageSize}
              total={list.data?.total ?? 0}
              showSizeChanger
              onChange={(nextPage, nextSize) => {
                if (nextSize !== pageSize) {
                  setPageSize(nextSize);
                  setPage(1);
                } else {
                  setPage(nextPage);
                }
              }}
            />
          </>
        )}
      </Card>

      <DetailDrawer
        open={detailId !== null}
        title={detail.data?.title ?? '通知详情'}
        onClose={() => setDetailId(null)}
        loading={detail.isLoading}
        error={detail.error}
      >
        {detail.data && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space size={8} wrap>
              <Tag>{detail.data.sourceType === 'MANUAL' ? '管理员发布' : detail.data.sourceType}</Tag>
              <Typography.Text type="secondary">
                {formatDateTime(detail.data.publishTime)}
              </Typography.Text>
            </Space>
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', fontSize: 15 }}>
              {detail.data.content}
            </Typography.Paragraph>
            {detail.data.jumpPath && (
              <Typography.Link href={detail.data.jumpPath}>打开关联页面</Typography.Link>
            )}
          </Space>
        )}
      </DetailDrawer>
    </div>
  );
}
