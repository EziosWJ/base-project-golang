import { useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Tag,
  Tree,
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
import { menuTypeMeta, statusOptions } from '../../config/options';
import { queryKeys } from '../../lib/query/keys';
import { getErrorMessage } from '../../lib/api/errors';
import { applyServerFieldErrors } from '../../lib/forms';
import { formatDateTime } from '../../utils/format';
import { useListState } from '../../hooks/useListState';
import {
  assignRoleMenus,
  batchDeleteRoles,
  createRole,
  deleteRole,
  getMenuTree,
  getRoleDetail,
  getRolePage,
  updateRole,
  updateRoleStatus,
} from '../../features/system/api';
import type { RoleInput, RoleRecord, SystemMenuRecord } from '../../types/system';

interface RoleFormValues {
  roleName: string;
  roleCode: string;
  status: 0 | 1;
  sortOrder: number;
  remark?: string;
}

interface MenuTreeNode {
  key: number;
  title: string;
  children?: MenuTreeNode[];
}

const FILTER_KEYS = ['roleName', 'roleCode', 'status'] as const;

function toMenuTree(nodes: SystemMenuRecord[]): MenuTreeNode[] {
  return nodes.map((node) => ({
    key: node.id,
    title: `${node.menuName}（${menuTypeMeta[node.menuType] ?? node.menuType}）`,
    children: node.children?.length ? toMenuTree(node.children) : undefined,
  }));
}

export default function RolesPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<RoleFormValues>();
  const listState = useListState({ filterKeys: FILTER_KEYS });

  const [roleNameDraft, setRoleNameDraft] = useState(listState.filters.roleName ?? '');
  const [roleCodeDraft, setRoleCodeDraft] = useState(listState.filters.roleCode ?? '');
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [editing, setEditing] = useState<RoleRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [menuTarget, setMenuTarget] = useState<RoleRecord | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<Key[]>([]);

  const list = useQuery({
    queryKey: queryKeys.roles.list(listState.query),
    queryFn: () => getRolePage(listState.query),
    placeholderData: keepPreviousData,
  });

  const menuTree = useQuery({
    queryKey: queryKeys.roles.menuTree(),
    queryFn: getMenuTree,
    enabled: menuTarget !== null,
  });

  const roleDetail = useQuery({
    queryKey: queryKeys.roles.detail(menuTarget?.id ?? 0),
    queryFn: () => getRoleDetail(menuTarget?.id as number),
    enabled: menuTarget !== null,
  });

  const treeData = useMemo(() => toMenuTree(menuTree.data ?? []), [menuTree.data]);

  useEffect(() => {
    if (roleDetail.data) setCheckedKeys(roleDetail.data.menuIds);
  }, [roleDetail.data]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });

  const saveMutation = useMutation({
    mutationFn: (values: RoleFormValues) =>
      editing ? updateRole(editing.id, values as RoleInput) : createRole(values as RoleInput),
    onSuccess: () => {
      message.success(editing ? '角色已更新' : '角色已创建');
      setFormOpen(false);
      setEditing(null);
      void invalidate();
    },
    onError: (error) => { applyServerFieldErrors(form, error); }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      message.success('角色已删除');
      void invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const batchDeleteMutation = useMutation({
    mutationFn: batchDeleteRoles,
    onSuccess: () => {
      message.success('已批量删除');
      setSelectedRowKeys([]);
      void invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 0 | 1 }) => updateRoleStatus(id, status),
    onSuccess: () => {
      message.success('状态已更新');
      void invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const menuMutation = useMutation({
    mutationFn: ({ id, ids }: { id: number; ids: number[] }) => assignRoleMenus(id, ids),
    onSuccess: () => {
      message.success('菜单授权已保存');
      setMenuTarget(null);
      void invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 1, sortOrder: 1 });
    setFormOpen(true);
  };

  const openEdit = (record: RoleRecord) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({
      roleName: record.roleName,
      roleCode: record.roleCode,
      status: record.status,
      sortOrder: record.sortOrder,
      remark: record.remark ?? undefined,
    });
    setFormOpen(true);
  };

  const openMenus = (record: RoleRecord) => {
    setMenuTarget(record);
    setCheckedKeys([]);
  };

  const columns: DataTableColumns<RoleRecord> = [
    {
      title: '角色名称',
      dataIndex: 'roleName',
      width: 160,
      render: (value: string, record) => (
        <Space size={6}>
          <Typography.Text strong>{value}</Typography.Text>
          {record.isBuiltin === 1 && <Tag color="gold">内置</Tag>}
        </Space>
      ),
    },
    {
      title: '角色编码',
      dataIndex: 'roleCode',
      width: 160,
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
    },
    { title: '排序', dataIndex: 'sortOrder', width: 80 },
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
            onChange={(checked) =>
              statusMutation.mutate({ id: record.id, status: checked ? 1 : 0 })
            }
          />
          <StatusTag status={value} />
        </Space>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true,
      render: (value: string | null) => value || '—',
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
      width: 210,
      hideInSettings: true,
      render: (_, record) => (
        <Space size={0} className="table-actions">
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => openMenus(record)}>
            菜单授权
          </Button>
          <Button
            type="link"
            size="small"
            danger
            className="table-action-danger"
            disabled={record.isBuiltin === 1}
            onClick={() =>
              modal.confirm({
                title: `删除角色「${record.roleName}」？`,
                content: '已关联用户的角色可能无法删除，请先调整用户角色。',
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
        title="角色管理"
        description="角色决定账号可见的菜单范围；菜单授权与用户角色共同构成现有授权模型。"
        extra={
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
            新建角色
          </Button>
        }
      />

      <FilterBar
        onSearch={() =>
          listState.setFilters({
            roleName: roleNameDraft.trim(),
            roleCode: roleCodeDraft.trim(),
          })
        }
        onReset={() => {
          setRoleNameDraft('');
          setRoleCodeDraft('');
          listState.reset();
        }}
        loading={list.isFetching}
        summary={<Typography.Text type="secondary">共 {list.data?.total ?? 0} 个角色</Typography.Text>}
      >
        <Input
          allowClear
          placeholder="角色名称"
          value={roleNameDraft}
          onChange={(event) => setRoleNameDraft(event.target.value)}
          style={{ width: 160 }}
        />
        <Input
          allowClear
          placeholder="角色编码"
          value={roleCodeDraft}
          onChange={(event) => setRoleCodeDraft(event.target.value)}
          style={{ width: 160 }}
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

      <DataTable<RoleRecord>
        tableId="system-roles"
        tableLabel="角色列表"
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
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        toolbar={
          <Button icon={<RefreshCw size={15} />} onClick={() => void list.refetch()}>
            刷新
          </Button>
        }
        batchActions={() => (
          <Button
            danger
            size="small"
            icon={<Trash2 size={14} />}
            onClick={() =>
              modal.confirm({
                title: `删除选中的 ${selectedRowKeys.length} 个角色？`,
                content: '内置角色不会被删除。',
                okButtonProps: { danger: true },
                onOk: async () => {
                  const builtinIds = new Set(
                    (list.data?.items ?? [])
                      .filter((item) => item.isBuiltin === 1)
                      .map((item) => item.id),
                  );
                  const ids = selectedRowKeys
                    .map(Number)
                    .filter((id) => !builtinIds.has(id));
                  if (ids.length === 0) {
                    message.warning('没有可删除的角色');
                    return;
                  }
                  await batchDeleteMutation.mutateAsync(ids);
                },
              })
            }
          >
            批量删除
          </Button>
        )}
      />

      <FormDrawer<RoleFormValues>
        open={formOpen}
        title={editing ? `编辑角色：${editing.roleName}` : '新建角色'}
        form={form}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onFinish={(values) => saveMutation.mutateAsync(values)}
        submitting={saveMutation.isPending}
        error={saveMutation.error}
      >
        <Form.Item name="roleName" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
          <Input placeholder="例如：运营管理员" />
        </Form.Item>
        <Form.Item
          name="roleCode"
          label="角色编码"
          rules={[
            { required: true, message: '请输入角色编码' },
            { pattern: /^[A-Za-z0-9_:-]+$/, message: '仅支持字母、数字、下划线、冒号和短横线' },
          ]}
        >
          <Input disabled={editing?.isBuiltin === 1} placeholder="例如：OPERATOR" />
        </Form.Item>
        <Form.Item name="status" label="状态" rules={[{ required: true }]}>
          <Select options={statusOptions} />
        </Form.Item>
        <Form.Item name="sortOrder" label="排序" rules={[{ required: true }]}>
          <InputNumber min={0} max={9999} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={3} maxLength={200} showCount />
        </Form.Item>
      </FormDrawer>

      <Modal
        open={menuTarget !== null}
        title={`菜单授权：${menuTarget?.roleName ?? ''}`}
        onCancel={() => setMenuTarget(null)}
        onOk={() => {
          if (!menuTarget) return;
          menuMutation.mutate({ id: menuTarget.id, ids: checkedKeys.map(Number) });
        }}
        confirmLoading={menuMutation.isPending}
        width={620}
        okText="保存授权"
        destroyOnHidden
      >
        {roleDetail.isLoading || menuTree.isLoading ? (
          <Typography.Text type="secondary">加载菜单树…</Typography.Text>
        ) : (
          <>
            <Typography.Paragraph type="secondary">
              勾选后保存即可更新角色可见菜单。父级目录会自动包含已授权的子页面。
            </Typography.Paragraph>
            <Tree
              checkable
              defaultExpandAll
              treeData={treeData}
              checkedKeys={checkedKeys}
              onCheck={(keys, info) => {
                const checked = Array.isArray(keys) ? keys : keys.checked;
                const half = info.halfCheckedKeys ?? [];
                setCheckedKeys([...checked, ...half]);
              }}
            />
          </>
        )}
      </Modal>
    </div>
  );
}
