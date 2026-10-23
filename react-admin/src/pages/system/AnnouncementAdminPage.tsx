import { useState } from 'react';
import {
  App,
  Button,
  DatePicker,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from 'antd';
import { Plus, RefreshCw } from 'lucide-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { DetailDrawer } from '../../components/admin/DetailDrawer';
import { FormDrawer } from '../../components/FormDrawer/FormDrawer';
import { announcementStatusMeta } from '../../config/options';
import { getErrorMessage } from '../../lib/api/errors';
import { applyServerFieldErrors } from '../../lib/forms';
import { formatDateTime } from '../../utils/format';
import { queryKeys } from '../../lib/query/keys';
import {
  getAdminAnnouncements,
  publishAnnouncement,
  saveAnnouncement,
  withdrawAnnouncement,
} from '../../features/announcements/api';
import type { AnnouncementRecord, AnnouncementScope } from '../../types/notification';

interface AnnouncementFormValues {
  title: string;
  content: string;
  scope: AnnouncementScope;
  expiresAt?: dayjs.Dayjs | null;
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default',
  PUBLISHED: 'success',
  WITHDRAWN: 'warning',
};

export default function AnnouncementAdminPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<AnnouncementFormValues>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<AnnouncementRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<AnnouncementRecord | null>(null);

  const list = useQuery({
    queryKey: queryKeys.announcements.adminList({ page, pageSize }),
    queryFn: () => getAdminAnnouncements(page, pageSize),
    placeholderData: keepPreviousData,
  });

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });

  const save = useMutation({
    mutationFn: (values: AnnouncementFormValues) =>
      saveAnnouncement(
        {
          title: values.title,
          content: values.content,
          scope: values.scope,
          expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
        },
        editing?.id,
      ),
    onSuccess: () => {
      message.success(editing ? '公告已保存' : '公告草稿已创建');
      setOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (error) => { applyServerFieldErrors(form, error); }
  });

  const publish = useMutation({
    mutationFn: publishAnnouncement,
    onSuccess: () => {
      message.success('公告已发布');
      invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const withdraw = useMutation({
    mutationFn: withdrawAnnouncement,
    onSuccess: () => {
      message.success('公告已撤回');
      invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ scope: 'INTERNAL' });
    setOpen(true);
  };

  const openEdit = (record: AnnouncementRecord) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      scope: record.scope,
      expiresAt: record.expiresAt ? dayjs(record.expiresAt) : null,
    });
    setOpen(true);
  };

  const columns: TableColumnsType<AnnouncementRecord> = [
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      render: (value: string, record) => (
        <Typography.Link onClick={() => setDetail(record)}>{value}</Typography.Link>
      ),
    },
    {
      title: '范围',
      dataIndex: 'scope',
      width: 110,
      render: (value: AnnouncementScope) => (
        <Tag>{value === 'PUBLIC' ? '公开' : '站内'}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: string) => (
        <Tag color={STATUS_COLOR[value] ?? 'default'}>
          {announcementStatusMeta[value]?.label ?? value}
        </Tag>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      width: 170,
      render: (value: string | null) => formatDateTime(value),
    },
    {
      title: '有效期至',
      dataIndex: 'expiresAt',
      width: 170,
      render: (value: string | null) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_, record) => (
        <Space size={0} wrap className="table-actions">
          <Button
            type="link"
            size="small"
            disabled={record.status !== 'DRAFT'}
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
          {record.status === 'PUBLISHED' ? (
            <Button
              type="link"
              size="small"
              onClick={() =>
                modal.confirm({
                  title: `撤回公告「${record.title}」？`,
                  onOk: () => withdraw.mutateAsync(record.id),
                })
              }
            >
              撤回
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              onClick={() =>
                modal.confirm({
                  title: `立即发布「${record.title}」？`,
                  content: record.scope === 'PUBLIC' ? '公开公告将对未登录访问者可见。' : '站内公告对所有登录用户可见。',
                  onOk: () => publish.mutateAsync(record.id),
                })
              }
            >
              发布
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="公告管理"
        description="公告先保存为草稿，再发布或撤回。公开公告通过公开接口提供，站内公告需要登录。"
        extra={
          <Space>
            <Button icon={<RefreshCw size={16} />} onClick={() => void list.refetch()}>
              刷新
            </Button>
            <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
              新建公告
            </Button>
          </Space>
        }
      />

      <Table<AnnouncementRecord>
        rowKey="id"
        columns={columns}
        dataSource={list.data?.items ?? []}
        loading={list.isLoading}
        locale={{ emptyText: list.error ? getErrorMessage(list.error) : '暂无公告' }}
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

      <FormDrawer<AnnouncementFormValues>
        open={open}
        title={editing ? `编辑公告：${editing.title}` : '新建公告草稿'}
        form={form}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onFinish={async (values) => { await save.mutateAsync(values); }}
        submitting={save.isPending}
        error={save.error}
        width={600}
      >
        <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
          <Input maxLength={120} showCount />
        </Form.Item>
        <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
          <Input.TextArea rows={8} maxLength={4000} showCount />
        </Form.Item>
        <Form.Item name="scope" label="可见范围" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'INTERNAL', label: '站内公告（需登录）' },
              { value: 'PUBLIC', label: '公开公告（无需登录）' },
            ]}
          />
        </Form.Item>
        <Form.Item name="expiresAt" label="有效期至">
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Typography.Text type="secondary">
          已发布的公告不能直接修改，请先撤回后再编辑。
        </Typography.Text>
      </FormDrawer>

      <DetailDrawer
        open={detail !== null}
        title={detail?.title ?? '公告详情'}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space size={8} wrap>
              <Tag>{detail.scope === 'PUBLIC' ? '公开' : '站内'}</Tag>
              <Tag color={STATUS_COLOR[detail.status] ?? 'default'}>
                {announcementStatusMeta[detail.status]?.label ?? detail.status}
              </Tag>
              <Typography.Text type="secondary">{formatDateTime(detail.createTime)}</Typography.Text>
            </Space>
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{detail.content}</Typography.Paragraph>
            {detail.expiresAt && (
              <Typography.Text type="secondary">
                有效期至 {formatDateTime(detail.expiresAt)}
              </Typography.Text>
            )}
          </Space>
        )}
      </DetailDrawer>
    </div>
  );
}
