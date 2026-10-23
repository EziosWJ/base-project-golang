import { useState } from 'react';
import { App, Button, Descriptions, Input, Select, Space, Typography } from 'antd';
import { Eraser, RefreshCw } from 'lucide-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { FilterBar } from '../../components/admin/FilterBar';
import { DetailDrawer } from '../../components/admin/DetailDrawer';
import { DataTable, type DataTableColumns } from '../../components/DataTable/DataTable';
import { LogStatusTag } from '../../components/StatusTag/StatusTag';
import { loginStatusOptions } from '../../config/options';
import { queryKeys } from '../../lib/query/keys';
import { getErrorMessage } from '../../lib/api/errors';
import { formatDateTime } from '../../utils/format';
import { useListState } from '../../hooks/useListState';
import {
  clearLoginLogs,
  getLoginLogDetail,
  getLoginLogPage,
} from '../../features/system/api';
import type { LoginLogRecord } from '../../types/system';

const FILTER_KEYS = ['username', 'loginIp', 'loginStatus'] as const;

export default function LoginLogsPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const listState = useListState({ filterKeys: FILTER_KEYS });

  const [usernameDraft, setUsernameDraft] = useState(listState.filters.username ?? '');
  const [ipDraft, setIpDraft] = useState(listState.filters.loginIp ?? '');
  const [detailId, setDetailId] = useState<number | null>(null);

  const list = useQuery({
    queryKey: queryKeys.loginLogs.list(listState.query),
    queryFn: () => getLoginLogPage(listState.query),
    placeholderData: keepPreviousData,
  });

  const detail = useQuery({
    queryKey: queryKeys.loginLogs.detail(detailId ?? 0),
    queryFn: () => getLoginLogDetail(detailId as number),
    enabled: detailId !== null,
  });

  const clearMutation = useMutation({
    mutationFn: clearLoginLogs,
    onSuccess: () => {
      message.success('登录日志已清空');
      void queryClient.invalidateQueries({ queryKey: queryKeys.loginLogs.all });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns: DataTableColumns<LoginLogRecord> = [
    { title: '用户名', dataIndex: 'username', width: 140 },
    {
      title: '结果',
      dataIndex: 'loginStatus',
      width: 100,
      render: (value: string) => <LogStatusTag value={value} />,
    },
    {
      title: 'IP / 位置',
      dataIndex: 'loginIp',
      width: 180,
      render: (value: string, record) => (
        <Space direction="vertical" size={0}>
          <span>{value || '—'}</span>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.loginLocation || ''}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '浏览器 / 系统',
      dataIndex: 'browser',
      width: 180,
      render: (value: string, record) => `${value || '—'} / ${record.os || '—'}`,
    },
    { title: '消息', dataIndex: 'message', ellipsis: true, render: (value: string) => value || '—' },
    {
      title: '登录时间',
      dataIndex: 'loginTime',
      width: 160,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 90,
      hideInSettings: true,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => setDetailId(record.id)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="登录日志"
        description="记录登录成功与失败。清空能力由系统配置 system.log-clear-enabled 控制。"
        extra={
          <Button
            danger
            icon={<Eraser size={16} />}
            onClick={() =>
              modal.confirm({
                title: '清空全部登录日志？',
                content: '该操作不可撤销，且可能因服务端配置关闭而失败。',
                okButtonProps: { danger: true },
                onOk: () => clearMutation.mutateAsync(),
              })
            }
          >
            清空日志
          </Button>
        }
      />

      <FilterBar
        onSearch={() =>
          listState.setFilters({ username: usernameDraft.trim(), loginIp: ipDraft.trim() })
        }
        onReset={() => {
          setUsernameDraft('');
          setIpDraft('');
          listState.reset();
        }}
        loading={list.isFetching}
        summary={<Typography.Text type="secondary">共 {list.data?.total ?? 0} 条记录</Typography.Text>}
      >
        <Input
          allowClear
          placeholder="用户名"
          value={usernameDraft}
          onChange={(event) => setUsernameDraft(event.target.value)}
          style={{ width: 150 }}
        />
        <Input
          allowClear
          placeholder="登录 IP"
          value={ipDraft}
          onChange={(event) => setIpDraft(event.target.value)}
          style={{ width: 150 }}
        />
        <Select
          allowClear
          placeholder="结果"
          style={{ width: 110 }}
          value={listState.filters.loginStatus || undefined}
          onChange={(value) => listState.setFilter('loginStatus', value)}
          options={loginStatusOptions}
        />
      </FilterBar>

      <DataTable<LoginLogRecord>
        tableId="system-login-logs"
        tableLabel="登录日志列表"
        rowKey="id"
        columns={columns}
        dataSource={list.data?.items ?? []}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        pagination={{
          current: listState.page,
          pageSize: listState.pageSize,
          total: list.data?.total ?? 0,
          onChange: (page, pageSize) =>
            pageSize !== listState.pageSize
              ? listState.setPageSize(pageSize)
              : listState.setPage(page),
        }}
        toolbar={
          <Button icon={<RefreshCw size={15} />} onClick={() => void list.refetch()}>
            刷新
          </Button>
        }
      />

      <DetailDrawer
        open={detailId !== null}
        title="登录日志详情"
        onClose={() => setDetailId(null)}
        loading={detail.isLoading}
        error={detail.error}
      >
        {detail.data && (
          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label="用户名">{detail.data.username}</Descriptions.Item>
            <Descriptions.Item label="结果">
              <LogStatusTag value={detail.data.loginStatus} />
            </Descriptions.Item>
            <Descriptions.Item label="IP">{detail.data.loginIp || '—'}</Descriptions.Item>
            <Descriptions.Item label="位置">{detail.data.loginLocation || '—'}</Descriptions.Item>
            <Descriptions.Item label="浏览器">{detail.data.browser || '—'}</Descriptions.Item>
            <Descriptions.Item label="操作系统">{detail.data.os || '—'}</Descriptions.Item>
            <Descriptions.Item label="消息">{detail.data.message || '—'}</Descriptions.Item>
            <Descriptions.Item label="User-Agent">
              <Typography.Text className="mono">{detail.data.userAgent || '—'}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="登录时间">
              {formatDateTime(detail.data.loginTime)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </DetailDrawer>
    </div>
  );
}
