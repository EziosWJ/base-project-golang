import { useState } from 'react';
import {
  App,
  Button,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Key } from 'react';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { FilterBar } from '../../components/admin/FilterBar';
import { DataTable, type DataTableColumns } from '../../components/DataTable/DataTable';
import { FormDrawer } from '../../components/FormDrawer/FormDrawer';
import { StatusTag } from '../../components/StatusTag/StatusTag';
import {
  configTypeMeta,
  configTypeOptions,
  configValueTypeMeta,
  configValueTypeOptions,
  statusOptions,
} from '../../config/options';
import { queryKeys } from '../../lib/query/keys';
import { getErrorMessage } from '../../lib/api/errors';
import { applyServerFieldErrors } from '../../lib/forms';
import { formatDateTime } from '../../utils/format';
import { useListState } from '../../hooks/useListState';
import {
  batchDeleteConfigs,
  createConfig,
  deleteConfig,
  getConfigPage,
  updateConfig,
  updateConfigStatus,
} from '../../features/system/api';
import type { ConfigInput, ConfigRecord, ConfigScope, ConfigValueType } from '../../types/system';

interface ConfigFormValues {
  configName: string;
  configKey: string;
  configValue?: string;
  configType: ConfigScope;
  valueType: ConfigValueType;
  status: 0 | 1;
  remark?: string;
}

const FILTER_KEYS = ['configName', 'configKey', 'configType', 'status'] as const;

export default function ConfigsPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ConfigFormValues>();
  const listState = useListState({ filterKeys: FILTER_KEYS });

  const [nameDraft, setNameDraft] = useState(listState.filters.configName ?? '');
  const [keyDraft, setKeyDraft] = useState(listState.filters.configKey ?? '');
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [editing, setEditing] = useState<ConfigRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const valueType = Form.useWatch('valueType', form) as ConfigValueType | undefined;

  const list = useQuery({
    queryKey: queryKeys.configs.list(listState.query),
    queryFn: () => getConfigPage(listState.query),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.configs.all });

  const saveMutation = useMutation({
    mutationFn: (values: ConfigFormValues) =>
      editing ? updateConfig(editing.id, values as ConfigInput) : createConfig(values as ConfigInput),
    onSuccess: () => {
      message.success(editing ? '配置已更新' : '配置已创建');
      setFormOpen(false);
      setEditing(null);
      void invalidate();
    },
    onError: (error) => { applyServerFieldErrors(form, error); }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteConfig,
    onSuccess: () => {
      message.success('配置已删除');
      void invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const batchDeleteMutation = useMutation({
    mutationFn: batchDeleteConfigs,
    onSuccess: () => {
      message.success('已批量删除');
      setSelectedRowKeys([]);
      void invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 0 | 1 }) => updateConfigStatus(id, status),
    onSuccess: () => {
      message.success('状态已更新');
      void invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ configType: 'CUSTOM', valueType: 'TEXT', status: 1 });
    setFormOpen(true);
  };

  const openEdit = (record: ConfigRecord) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({
      configName: record.configName,
      configKey: record.configKey,
      configValue: record.configValue,
      configType: record.configType,
      valueType: record.valueType,
      status: record.status,
      remark: record.remark ?? undefined,
    });
    setFormOpen(true);
  };

  const columns: DataTableColumns<ConfigRecord> = [
    {
      title: '配置名称',
      dataIndex: 'configName',
      width: 170,
      render: (value: string, record) => (
        <Space size={6}>
          <Typography.Text strong>{value}</Typography.Text>
          {record.isBuiltin === 1 && <Tag color="gold">内置</Tag>}
        </Space>
      ),
    },
    {
      title: '配置键',
      dataIndex: 'configKey',
      width: 220,
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
    },
    {
      title: '配置值',
      dataIndex: 'configValue',
      width: 160,
      ellipsis: true,
      render: (value: string, record) => {
        if (record.valueType === 'BOOLEAN') {
          return value === 'true' ? <Tag color="success">true</Tag> : <Tag>false</Tag>;
        }
        return value || '—';
      },
    },
    {
      title: '归属',
      dataIndex: 'configType',
      width: 120,
      render: (value: string) => configTypeMeta[value] ?? value,
    },
    {
      title: '值类型',
      dataIndex: 'valueType',
      width: 90,
      render: (value: string) => configValueTypeMeta[value] ?? value,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value: 0 | 1, record) => (
        <Space size={6}>
          <Switch
            size="small"
            checked={value === 1}
            disabled={record.isBuiltin === 1}
            onChange={(checked) =>
              statusMutation.mutate({ id: record.id, status: checked ? 1 : 0 })
            }
          />
          <StatusTag status={value} />
        </Space>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      width: 160,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      hideInSettings: true,
      render: (_, record) => (
        <Space size={0} className="table-actions">
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            className="table-action-danger"
            disabled={record.isBuiltin === 1}
            onClick={() =>
              modal.confirm({
                title: `删除配置「${record.configName}」？`,
                content: '内置配置受保护，服务端会拒绝删除。',
                okButtonProps: { danger: true },
                onOk: () => deleteMutation.mutateAsync(record.id),
              })
            }
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="配置管理"
        description="维护运行配置与开关。部分内置配置会直接影响后端功能，请谨慎修改。"
        extra={
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
            新建配置
          </Button>
        }
      />

      <FilterBar
        onSearch={() =>
          listState.setFilters({ configName: nameDraft.trim(), configKey: keyDraft.trim() })
        }
        onReset={() => {
          setNameDraft('');
          setKeyDraft('');
          listState.reset();
        }}
        loading={list.isFetching}
        summary={<Typography.Text type="secondary">共 {list.data?.total ?? 0} 项配置</Typography.Text>}
      >
        <Input
          allowClear
          placeholder="配置名称"
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          style={{ width: 170 }}
        />
        <Input
          allowClear
          placeholder="配置键"
          value={keyDraft}
          onChange={(event) => setKeyDraft(event.target.value)}
          style={{ width: 200 }}
        />
        <Select
          allowClear
          placeholder="归属"
          style={{ width: 130 }}
          value={listState.filters.configType || undefined}
          onChange={(value) => listState.setFilter('configType', value)}
          options={configTypeOptions}
        />
        <Select
          allowClear
          placeholder="状态"
          style={{ width: 110 }}
          value={listState.filters.status ? Number(listState.filters.status) : undefined}
          onChange={(value) => listState.setFilter('status', value)}
          options={statusOptions}
        />
      </FilterBar>

      <DataTable<ConfigRecord>
        tableId="system-configs"
        tableLabel="配置列表"
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
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        toolbar={
          <Button icon={<RefreshCw size={15} />} onClick={() => void list.refetch()}>
            刷新
          </Button>
        }
        batchActions={({ clear }) => (
          <Button
            danger
            size="small"
            icon={<Trash2 size={14} />}
            onClick={() =>
              modal.confirm({
                title: `删除选中的 ${selectedRowKeys.length} 项配置？`,
                okButtonProps: { danger: true },
                onOk: async () => {
                  const builtin = new Set(
                    (list.data?.items ?? []).filter((item) => item.isBuiltin === 1).map((item) => item.id),
                  );
                  const ids = selectedRowKeys.map(Number).filter((id) => !builtin.has(id));
                  if (ids.length === 0) {
                    message.warning('没有可删除的配置');
                    return;
                  }
                  await batchDeleteMutation.mutateAsync(ids);
                  clear();
                },
              })
            }
          >
            批量删除
          </Button>
        )}
      />

      <FormDrawer<ConfigFormValues>
        open={formOpen}
        title={editing ? `编辑配置：${editing.configName}` : '新建配置'}
        form={form}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onFinish={(values) => saveMutation.mutateAsync(values)}
        submitting={saveMutation.isPending}
        error={saveMutation.error}
      >
        <Form.Item name="configName" label="配置名称" rules={[{ required: true, message: '请输入配置名称' }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="configKey"
          label="配置键"
          rules={[
            { required: true, message: '请输入配置键' },
            { pattern: /^[a-zA-Z][a-zA-Z0-9._-]*$/, message: '配置键格式不正确' },
          ]}
        >
          <Input disabled={editing?.isBuiltin === 1} placeholder="system.example-key" />
        </Form.Item>
        <Form.Item name="configType" label="归属" rules={[{ required: true }]}>
          <Select options={configTypeOptions} />
        </Form.Item>
        <Form.Item name="valueType" label="值类型" rules={[{ required: true }]}>
          <Select
            options={configValueTypeOptions}
            onChange={(value: ConfigValueType) => {
              form.setFieldValue('configValue', value === 'BOOLEAN' ? 'false' : '');
            }}
          />
        </Form.Item>
        <Form.Item
          name="configValue"
          label="配置值"
          rules={[
            { required: valueType !== 'TEXT', message: '请输入配置值' },
            {
              validator: (_, value: string | undefined) => {
                if (valueType === 'NUMBER' && value && Number.isNaN(Number(value))) {
                  return Promise.reject(new Error('请输入数字'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          {valueType === 'BOOLEAN' ? (
            <Select
              options={[
                { value: 'true', label: 'true' },
                { value: 'false', label: 'false' },
              ]}
            />
          ) : (
            <Input placeholder={valueType === 'NUMBER' ? '数字' : '文本'} />
          )}
        </Form.Item>
        <Form.Item name="status" label="状态" rules={[{ required: true }]}>
          <Select options={statusOptions} />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} maxLength={200} showCount />
        </Form.Item>
      </FormDrawer>
    </div>
  );
}
