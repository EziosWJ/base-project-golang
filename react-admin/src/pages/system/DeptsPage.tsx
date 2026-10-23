import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tag,
  TreeSelect,
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
import { statusOptions } from '../../config/options';
import { queryKeys } from '../../lib/query/keys';
import { getErrorMessage } from '../../lib/api/errors';
import { applyServerFieldErrors } from '../../lib/forms';
import { formatDateTime } from '../../utils/format';
import { useListState } from '../../hooks/useListState';
import {
  batchDeleteDepts,
  createDept,
  deleteDept,
  getDeptPage,
  getDeptTree,
  updateDept,
  updateDeptStatus,
} from '../../features/system/api';
import type { DeptInput, DeptRecord } from '../../types/system';

interface DeptFormValues {
  parentId: number;
  deptName: string;
  deptCode: string;
  leader?: string;
  phone?: string;
  email?: string;
  sortOrder: number;
  status: 0 | 1;
  remark?: string;
}

const FILTER_KEYS = ['deptName', 'deptCode', 'status'] as const;

export default function DeptsPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<DeptFormValues>();
  const listState = useListState({ filterKeys: FILTER_KEYS });

  const [nameDraft, setNameDraft] = useState(listState.filters.deptName ?? '');
  const [codeDraft, setCodeDraft] = useState(listState.filters.deptCode ?? '');
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [editing, setEditing] = useState<DeptRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const list = useQuery({
    queryKey: queryKeys.depts.list(listState.query),
    queryFn: () => getDeptPage(listState.query),
    placeholderData: keepPreviousData,
  });

  const tree = useQuery({
    queryKey: queryKeys.depts.options(),
    queryFn: getDeptTree,
    staleTime: 30_000,
  });

  const parentTree = useMemo(() => {
    const mapNodes = (nodes: DeptRecord[]): Array<Record<string, unknown>> =>
      nodes.map((node) => ({
        id: node.id,
        deptName: node.deptName,
        disabled: node.id === editing?.id,
        children: node.children?.length ? mapNodes(node.children) : undefined,
      }));
    return [{ id: 0, deptName: '根部门', children: mapNodes(tree.data ?? []) }];
  }, [tree.data, editing?.id]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.depts.all });
  };

  const saveMutation = useMutation({
    mutationFn: (values: DeptFormValues) =>
      editing ? updateDept(editing.id, values as DeptInput) : createDept(values as DeptInput),
    onSuccess: () => {
      message.success(editing ? '部门已更新' : '部门已创建');
      setFormOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (error) => { applyServerFieldErrors(form, error); }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDept,
    onSuccess: () => {
      message.success('部门已删除');
      invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const batchDeleteMutation = useMutation({
    mutationFn: batchDeleteDepts,
    onSuccess: () => {
      message.success('已批量删除');
      setSelectedRowKeys([]);
      invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 0 | 1 }) => updateDeptStatus(id, status),
    onSuccess: () => {
      message.success('状态已更新');
      invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ parentId: 0, sortOrder: 1, status: 1 });
    setFormOpen(true);
  };

  const openEdit = (record: DeptRecord) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({
      parentId: record.parentId,
      deptName: record.deptName,
      deptCode: record.deptCode,
      leader: record.leader ?? undefined,
      phone: record.phone ?? undefined,
      email: record.email ?? undefined,
      sortOrder: record.sortOrder,
      status: record.status,
      remark: record.remark ?? undefined,
    });
    setFormOpen(true);
  };

  const columns: DataTableColumns<DeptRecord> = [
    {
      title: '部门名称',
      dataIndex: 'deptName',
      width: 220,
      render: (value: string, record) => (
        <Space size={6}>
          <Typography.Text strong>{value}</Typography.Text>
          {record.isBuiltin === 1 && <Tag color="gold">内置</Tag>}
        </Space>
      ),
    },
    {
      title: '部门编码',
      dataIndex: 'deptCode',
      width: 150,
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
    },
    { title: '负责人', dataIndex: 'leader', width: 120, render: (value: string | null) => value || '—' },
    { title: '排序', dataIndex: 'sortOrder', width: 70 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 130,
      render: (value: 0 | 1, record) => (
        <Space size={6}>
          <Switch
            size="small"
            checked={value === 1}
            disabled={record.isBuiltin === 1}
            onChange={(checked) => statusMutation.mutate({ id: record.id, status: checked ? 1 : 0 })}
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
      width: 140,
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
                title: `删除部门「${record.deptName}」？`,
                content: '存在子部门或关联用户时，服务端会拒绝删除。',
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
        title="部门管理"
        description="维护组织架构。删除受子部门与关联用户约束。"
        extra={
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
            新建部门
          </Button>
        }
      />

      <FilterBar
        onSearch={() =>
          listState.setFilters({ deptName: nameDraft.trim(), deptCode: codeDraft.trim() })
        }
        onReset={() => {
          setNameDraft('');
          setCodeDraft('');
          listState.reset();
        }}
        loading={list.isFetching}
        summary={<Typography.Text type="secondary">共 {list.data?.total ?? 0} 个部门</Typography.Text>}
      >
        <Input
          allowClear
          placeholder="部门名称"
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          style={{ width: 170 }}
        />
        <Input
          allowClear
          placeholder="部门编码"
          value={codeDraft}
          onChange={(event) => setCodeDraft(event.target.value)}
          style={{ width: 170 }}
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

      <DataTable<DeptRecord>
        tableId="system-depts"
        tableLabel="部门列表"
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
                title: `删除选中的 ${selectedRowKeys.length} 个部门？`,
                content: '根部门与仍有子节点/用户的部门会被服务端拒绝。',
                okButtonProps: { danger: true },
                onOk: async () => {
                  const builtin = new Set(
                    (list.data?.items ?? []).filter((item) => item.isBuiltin === 1).map((item) => item.id),
                  );
                  const ids = selectedRowKeys.map(Number).filter((id) => !builtin.has(id));
                  if (ids.length === 0) {
                    message.warning('没有可删除的部门');
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

      <FormDrawer<DeptFormValues>
        open={formOpen}
        title={editing ? `编辑部门：${editing.deptName}` : '新建部门'}
        form={form}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onFinish={(values) => saveMutation.mutateAsync(values)}
        submitting={saveMutation.isPending}
        error={saveMutation.error}
      >
        <Form.Item name="parentId" label="上级部门" rules={[{ required: true }]}>
          <TreeSelect
            treeData={parentTree}
            fieldNames={{ label: 'deptName', value: 'id', children: 'children' }}
            treeDefaultExpandAll
          />
        </Form.Item>
        <Form.Item name="deptName" label="部门名称" rules={[{ required: true, message: '请输入部门名称' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="deptCode" label="部门编码" rules={[{ required: true, message: '请输入部门编码' }]}>
          <Input placeholder="例如：RD" />
        </Form.Item>
        <Form.Item name="leader" label="负责人">
          <Input />
        </Form.Item>
        <Form.Item name="phone" label="联系电话">
          <Input />
        </Form.Item>
        <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="sortOrder" label="排序" rules={[{ required: true }]}>
          <InputNumber min={0} max={9999} style={{ width: '100%' }} />
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
