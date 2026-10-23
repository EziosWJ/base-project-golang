import { useState } from 'react';
import { App, Button, Descriptions, Input, Select, Space, Typography } from 'antd';
import { Eraser, RefreshCw } from 'lucide-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { FilterBar } from '../../components/admin/FilterBar';
import { DetailDrawer } from '../../components/admin/DetailDrawer';
import { DataTable, type DataTableColumns } from '../../components/DataTable/DataTable';
import { LogStatusTag } from '../../components/StatusTag/StatusTag';
import { loginStatusOptions, operationTypeOptions } from '../../config/options';
import { queryKeys } from '../../lib/query/keys';
import { getErrorMessage } from '../../lib/api/errors';
import { formatDateTime } from '../../utils/format';
import { useListState } from '../../hooks/useListState';
import { clearOperLogs, getOperLogDetail, getOperLogPage } from '../../features/system/api';
import type { OperLogRecord } from '../../types/system';

const FILTER_KEYS = ['moduleName', 'operatorName', 'operationType', 'operationStatus'] as const;

function prettyJson(value: string | undefined): string {
  if (!value) return '—';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default function OperLogsPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const listState = useListState({ filterKeys: FILTER_KEYS });

  const [moduleDraft, setModuleDraft] = useState(listState.filters.moduleName ?? '');
  const [operatorDraft, setOperatorDraft] = useState(listState.filters.operatorName ?? '');
  const [detailId, setDetailId] = useState<number | null>(null);

  const list = useQuery({
    queryKey: queryKeys.operLogs.list(listState.query),
    queryFn: () => getOperLogPage(listState.query),
    placeholderData: keepPreviousData,
  });

  const detail = useQuery({
    queryKey: queryKeys.operLogs.detail(detailId ?? 0),
    queryFn: () => getOperLogDetail(detailId as number),
    enabled: detailId !== null,
  });

  const clearMutation = useMutation({
    mutationFn: clearOperLogs,
    onSuccess: () => {
      message.success('操作日志已清空');
      void queryClient.invalidateQueries({ queryKey: queryKeys.operLogs.all });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns: DataTableColumns<OperLogRecord> = [
    { title: '模块', dataIndex: 'moduleName', width: 140 },
    { title: '操作类型', dataIndex: 'operationType', width: 100 },
    {
      title: '请求',
      dataIndex: 'requestUrl',
      width: 260,
      render: (value: string, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text code>{record.requestMethod}</Typography.Text>
          <Typography.Text ellipsis style={{ maxWidth: 240 }} className="mono">
            {value}
          </Typography.Text>
        </Space>
      ),
    },
    { title: '操作人', dataIndex: 'operatorName', width: 120 },
    { title: 'IP', dataIndex: 'operatorIp', width: 130 },
    {
      title: '结果',
      dataIndex: 'operationStatus',
      width: 100,
      render: (value: string) => <LogStatusTag value={value} />,
    },
    {
      title: '耗时',
      dataIndex: 'costTime',
      width: 90,
      render: (value: number) => `${value} ms`,
    },
    {
      title: '操作时间',
      dataIndex: 'operationTime',
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
        title="操作日志"
        description="记录系统写操作审计。清空能力由系统配置 system.log-clear-enabled 控制。"
        extra={
          <Button
            danger
            icon={<Eraser size={16} />}
            onClick={() =>
              modal.confirm({
                title: '清空全部操作日志？',
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
          listState.setFilters({
            moduleName: moduleDraft.trim(),
            operatorName: operatorDraft.trim(),
          })
        }
        onReset={() => {
          setModuleDraft('');
          setOperatorDraft('');
          listState.reset();
        }}
        loading={list.isFetching}
        summary={<Typography.Text type="secondary">共 {list.data?.total ?? 0} 条记录</Typography.Text>}
      >
        <Input
          allowClear
          placeholder="模块名称"
          value={moduleDraft}
          onChange={(event) => setModuleDraft(event.target.value)}
          style={{ width: 150 }}
        />
        <Input
          allowClear
          placeholder="操作人"
          value={operatorDraft}
          onChange={(event) => setOperatorDraft(event.target.value)}
          style={{ width: 150 }}
        />
        <Select
          allowClear
          placeholder="操作类型"
          style={{ width: 120 }}
          value={listState.filters.operationType || undefined}
          onChange={(value) => listState.setFilter('operationType', value)}
          options={operationTypeOptions}
        />
        <Select
          allowClear
          placeholder="结果"
          style={{ width: 110 }}
          value={listState.filters.operationStatus || undefined}
          onChange={(value) => listState.setFilter('operationStatus', value)}
          options={loginStatusOptions}
        />
      </FilterBar>

      <DataTable<OperLogRecord>
        tableId="system-oper-logs"
        tableLabel="操作日志列表"
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
        scrollX={1200}
        toolbar={
          <Button icon={<RefreshCw size={15} />} onClick={() => void list.refetch()}>
            刷新
          </Button>
        }
      />

      <DetailDrawer
        open={detailId !== null}
        title="操作日志详情"
        onClose={() => setDetailId(null)}
        loading={detail.isLoading}
        error={detail.error}
        width={760}
      >
        {detail.data && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions column={2} bordered size="middle">
              <Descriptions.Item label="模块">{detail.data.moduleName}</Descriptions.Item>
              <Descriptions.Item label="操作类型">{detail.data.operationType}</Descriptions.Item>
              <Descriptions.Item label="请求方法">{detail.data.requestMethod}</Descriptions.Item>
              <Descriptions.Item label="结果">
                <LogStatusTag value={detail.data.operationStatus} />
              </Descriptions.Item>
              <Descriptions.Item label="操作人">{detail.data.operatorName}</Descriptions.Item>
              <Descriptions.Item label="IP">{detail.data.operatorIp}</Descriptions.Item>
              <Descriptions.Item label="耗时">{detail.data.costTime} ms</Descriptions.Item>
              <Descriptions.Item label="操作时间">
                {formatDateTime(detail.data.operationTime)}
              </Descriptions.Item>
              <Descriptions.Item label="请求地址" span={2}>
                <Typography.Text className="mono">{detail.data.requestUrl}</Typography.Text>
              </Descriptions.Item>
            </Descriptions>
            <div>
              <Typography.Title level={5}>请求参数</Typography.Title>
              <div className="json-block">{prettyJson(detail.data.requestParams)}</div>
            </div>
            <div>
              <Typography.Title level={5}>响应结果</Typography.Title>
              <div className="json-block">{prettyJson(detail.data.responseResult)}</div>
            </div>
            {detail.data.errorMessage && (
              <div>
                <Typography.Title level={5}>错误信息</Typography.Title>
                <div className="json-block">{detail.data.errorMessage}</div>
              </div>
            )}
          </Space>
        )}
      </DetailDrawer>
    </div>
  );
}
