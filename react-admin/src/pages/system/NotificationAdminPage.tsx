import { useState } from 'react';
import {
  App,
  Button,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from 'antd';
import { Plus, RefreshCw } from 'lucide-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { DetailDrawer } from '../../components/admin/DetailDrawer';
import { FormDrawer } from '../../components/FormDrawer/FormDrawer';
import { getErrorMessage } from '../../lib/api/errors';
import { applyServerFieldErrors } from '../../lib/forms';
import { formatDateTime } from '../../utils/format';
import { queryKeys } from '../../lib/query/keys';
import { getUserPage } from '../../features/system/api';
import {
  getAdminNotifications,
  publishNotification,
} from '../../features/notifications/api';
import type { NotificationRecord } from '../../types/notification';

interface PublishFormValues {
  title: string;
  content: string;
  jumpPath?: string;
  allUsers: boolean;
  userIds?: number[];
}

export default function NotificationAdminPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<PublishFormValues>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<NotificationRecord | null>(null);
  const allUsers = Form.useWatch('allUsers', form);

  const list = useQuery({
    queryKey: queryKeys.notifications.adminList({ page, pageSize }),
    queryFn: () => getAdminNotifications({ page, pageSize }),
    placeholderData: keepPreviousData,
  });

  const users = useQuery({
    queryKey: [...queryKeys.users.all, 'options'],
    queryFn: () => getUserPage({ page: 1, pageSize: 200 }),
    enabled: open && !allUsers,
    staleTime: 60_000,
  });

  const publish = useMutation({
    mutationFn: (values: PublishFormValues) =>
      publishNotification({
        title: values.title,
        content: values.content,
        jumpPath: values.jumpPath,
        allUsers: values.allUsers,
        userIds: values.allUsers ? [] : (values.userIds ?? []),
      }),
    onSuccess: () => {
      message.success('通知已发布');
      setOpen(false);
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
    onError: (error) => { applyServerFieldErrors(form, error); }
  });

  const openPublish = () => {
    form.resetFields();
    form.setFieldsValue({ allUsers: true });
    setOpen(true);
  };

  const columns: TableColumnsType<NotificationRecord> = [
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      render: (value: string, record) => (
        <Typography.Link onClick={() => setDetail(record)}>{value}</Typography.Link>
      ),
    },
    {
      title: '来源',
      dataIndex: 'sourceType',
      width: 120,
      render: (value: string) => (
        <Tag>{value === 'MANUAL' ? '管理员发布' : value}</Tag>
      ),
    },
    { title: '接收人数', dataIndex: 'recipientCount', width: 110 },
    { title: '已读人数', dataIndex: 'readCount', width: 110 },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
  ];

  return (
    <div>
      <PageHeader
        title="通知管理"
        description="向全部账号或指定账号发布站内通知。发布后用户可在顶部通知入口查看。"
        extra={
          <Space>
            <Button icon={<RefreshCw size={16} />} onClick={() => void list.refetch()}>
              刷新
            </Button>
            <Button type="primary" icon={<Plus size={16} />} onClick={openPublish}>
              发布通知
            </Button>
          </Space>
        }
      />

      <Table<NotificationRecord>
        rowKey="id"
        columns={columns}
        dataSource={list.data?.items ?? []}
        loading={list.isLoading}
        locale={{ emptyText: list.error ? getErrorMessage(list.error) : '暂无通知' }}
        pagination={{
          current: page,
          pageSize,
          total: list.data?.total ?? 0,
          showSizeChanger: true,
          onChange: (nextPage, nextSize) => {
            if (nextSize !== pageSize) {
              setPageSize(nextSize);
              setPage(1);
            } else {
              setPage(nextPage);
            }
          },
        }}
      />

      <FormDrawer<PublishFormValues>
        open={open}
        title="发布通知"
        form={form}
        onClose={() => setOpen(false)}
        onFinish={(values) => publish.mutateAsync(values)}
        submitting={publish.isPending}
        error={publish.error}
        submitText="发布"
        width={600}
      >
        <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
          <Input maxLength={120} showCount />
        </Form.Item>
        <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
          <Input.TextArea rows={6} maxLength={2000} showCount />
        </Form.Item>
        <Form.Item name="jumpPath" label="跳转地址">
          <Input placeholder="可选，例如 /system/user" />
        </Form.Item>
        <Form.Item name="allUsers" label="接收范围" valuePropName="checked">
          <Switch checkedChildren="全部账号" unCheckedChildren="指定账号" />
        </Form.Item>
        {!allUsers && (
          <Form.Item
            name="userIds"
            label="指定账号"
            rules={[{ required: true, message: '请选择至少一个账号' }]}
          >
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              loading={users.isLoading}
              placeholder="选择接收账号"
              options={(users.data?.items ?? []).map((user) => ({
                value: user.id,
                label: `${user.nickname}（${user.username}）`,
              }))}
            />
          </Form.Item>
        )}
        {!allUsers && (users.data?.total ?? 0) > 200 && (
          <Typography.Text type="secondary">
            当前仅加载前 200 个账号用于选择，更多账号请使用全部账号发布。
          </Typography.Text>
        )}
      </FormDrawer>

      <DetailDrawer
        open={detail !== null}
        title={detail?.title ?? '通知详情'}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space size={8} wrap>
              <Tag>{detail.sourceType === 'MANUAL' ? '管理员发布' : detail.sourceType}</Tag>
              <Typography.Text type="secondary">{formatDateTime(detail.publishTime)}</Typography.Text>
            </Space>
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{detail.content}</Typography.Paragraph>
            <Typography.Text type="secondary">
              接收 {detail.recipientCount ?? 0} 人，已读 {detail.readCount ?? 0} 人
            </Typography.Text>
            {detail.jumpPath && <Typography.Link href={detail.jumpPath}>关联页面</Typography.Link>}
          </Space>
        )}
      </DetailDrawer>
    </div>
  );
}
