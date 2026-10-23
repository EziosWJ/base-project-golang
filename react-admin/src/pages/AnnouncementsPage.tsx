import { useState } from 'react';
import { Button, Card, Empty, List, Pagination, Space, Tabs, Tag, Typography } from 'antd';
import { RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { DetailDrawer } from '../components/admin/DetailDrawer';
import { getErrorMessage } from '../lib/api/errors';
import { formatDateTime } from '../utils/format';
import { queryKeys } from '../lib/query/keys';
import { getAnnouncement, getAnnouncements } from '../features/announcements/api';
import type { AnnouncementScope } from '../types/notification';

export default function AnnouncementsPage() {
  const [scope, setScope] = useState<AnnouncementScope>('INTERNAL');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [detailId, setDetailId] = useState<number | null>(null);

  const list = useQuery({
    queryKey: queryKeys.announcements.list(scope, { page, pageSize }),
    queryFn: () => getAnnouncements(scope, page, pageSize),
  });
  const detail = useQuery({
    queryKey: queryKeys.announcements.detail(scope, detailId ?? 0),
    queryFn: () => getAnnouncement(scope, detailId as number),
    enabled: detailId !== null,
  });

  const changeScope = (next: string) => {
    setScope(next as AnnouncementScope);
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="公告"
        description="站内公告仅登录用户可见；公开公告通过公开接口提供。"
        extra={
          <Button icon={<RefreshCw size={16} />} onClick={() => void list.refetch()}>
            刷新
          </Button>
        }
      />

      <Card>
        <Tabs
          activeKey={scope}
          onChange={changeScope}
          items={[
            { key: 'INTERNAL', label: '站内公告' },
            { key: 'PUBLIC', label: '公开公告' },
          ]}
        />
        {list.isLoading ? (
          <Typography.Text type="secondary">加载中…</Typography.Text>
        ) : list.error ? (
          <Typography.Text type="danger">{getErrorMessage(list.error)}</Typography.Text>
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <Empty description="暂无公告" />
        ) : (
          <>
            <List
              dataSource={list.data?.items ?? []}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button key="view" type="link" size="small" onClick={() => setDetailId(item.id)}>
                      查看
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space size={8}>
                        <Typography.Link strong onClick={() => setDetailId(item.id)}>
                          {item.title}
                        </Typography.Link>
                        <Tag color={item.status === 'PUBLISHED' ? 'success' : 'default'}>
                          {item.status === 'PUBLISHED' ? '已发布' : item.status}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space separator={<span>·</span>} size={6} wrap>
                        <span>{formatDateTime(item.publishTime || item.createTime)}</span>
                        {item.expiresAt && <span>有效期至 {formatDateTime(item.expiresAt)}</span>}
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
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <DetailDrawer
        open={detailId !== null}
        title={detail.data?.title ?? '公告详情'}
        onClose={() => setDetailId(null)}
        loading={detail.isLoading}
        error={detail.error}
      >
        {detail.data && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space size={8} wrap>
              <Tag>{detail.data.scope === 'PUBLIC' ? '公开公告' : '站内公告'}</Tag>
              <Typography.Text type="secondary">
                {formatDateTime(detail.data.publishTime || detail.data.createTime)}
              </Typography.Text>
            </Space>
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', fontSize: 15 }}>
              {detail.data.content}
            </Typography.Paragraph>
            {detail.data.expiresAt && (
              <Typography.Text type="secondary">
                有效期至 {formatDateTime(detail.data.expiresAt)}
              </Typography.Text>
            )}
          </Space>
        )}
      </DetailDrawer>
    </div>
  );
}
