import { useMemo, useState } from 'react';
import {
  Alert,
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
import { menuTypeMeta, menuTypeOptions, statusOptions, visibleOptions } from '../../config/options';
import { queryKeys } from '../../lib/query/keys';
import { getErrorMessage } from '../../lib/api/errors';
import { applyServerFieldErrors } from '../../lib/forms';
import { useListState } from '../../hooks/useListState';
import {
  batchDeleteMenus,
  createMenu,
  deleteMenu,
  getMenuTree,
  getMenuPage,
  updateMenu,
  updateMenuStatus,
} from '../../features/system/api';
import type { SystemMenuInput, SystemMenuRecord, SystemMenuType } from '../../types/system';

interface MenuFormValues {
  parentId: number;
  menuName: string;
  menuType: SystemMenuType;
  path?: string;
  component?: string;
  externalUrl?: string;
  icon?: string;
  permissionCode?: string;
  sortOrder: number;
  visible: 0 | 1;
  status: 0 | 1;
  remark?: string;
}

const FILTER_KEYS = ['menuName', 'menuType', 'status', 'visible'] as const;

export default function MenusPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<MenuFormValues>();
  const listState = useListState({ filterKeys: FILTER_KEYS });

  const [nameDraft, setNameDraft] = useState(listState.filters.menuName ?? '');
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [editing, setEditing] = useState<SystemMenuRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const menuType = Form.useWatch('menuType', form) as SystemMenuType | undefined;

  const list = useQuery({
    queryKey: queryKeys.menus.list(listState.query),
    queryFn: () => getMenuPage(listState.query),
    placeholderData: keepPreviousData,
  });

  const tree = useQuery({
    queryKey: queryKeys.menus.tree(),
    queryFn: getMenuTree,
    staleTime: 30_000,
  });

  const parentTree = useMemo(() => {
    const mapNodes = (nodes: SystemMenuRecord[]): Array<Record<string, unknown>> =>
      nodes.map((node) => ({
        id: node.id,
        menuName: node.menuName,
        children: node.children?.length ? mapNodes(node.children) : undefined,
      }));
    return [
      {
        id: 0,
        menuName: '根目录',
        children: mapNodes(tree.data ?? []),
      },
    ];
  }, [tree.data]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.menus.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.roles.menuTree() });
  };

  const saveMutation = useMutation({
    mutationFn: (values: MenuFormValues) =>
      editing
        ? updateMenu(editing.id, values as SystemMenuInput)
        : createMenu(values as SystemMenuInput),
    onSuccess: () => {
      message.success(editing ? '菜单已更新' : '菜单已创建');
      setFormOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (error) => { applyServerFieldErrors(form, error); }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMenu,
    onSuccess: () => {
      message.success('菜单已删除');
      invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const batchDeleteMutation = useMutation({
    mutationFn: batchDeleteMenus,
    onSuccess: () => {
      message.success('已批量删除');
      setSelectedRowKeys([]);
      invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 0 | 1 }) => updateMenuStatus(id, status),
    onSuccess: () => {
      message.success('状态已更新');
      invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      parentId: 0,
      menuType: 'MENU',
      sortOrder: 1,
      visible: 1,
      status: 1,
    });
    setFormOpen(true);
  };

  const openEdit = (record: SystemMenuRecord) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({
      parentId: record.parentId,
      menuName: record.menuName,
      menuType: record.menuType,
      path: record.path ?? undefined,
      component: record.component ?? undefined,
      externalUrl: record.externalUrl ?? undefined,
      icon: record.icon ?? undefined,
      permissionCode: record.permissionCode ?? undefined,
      sortOrder: record.sortOrder,
      visible: record.visible,
      status: record.status,
      remark: record.remark ?? undefined,
    });
    setFormOpen(true);
  };

  const columns: DataTableColumns<SystemMenuRecord> = [
    {
      title: '菜单名称',
      dataIndex: 'menuName',
      width: 180,
      render: (value: string, record) => (
        <Space size={6}>
          <Typography.Text strong>{value}</Typography.Text>
          {record.isBuiltin === 1 && <Tag color="gold">内置</Tag>}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'menuType',
      width: 90,
      render: (value: SystemMenuType) => <Tag>{menuTypeMeta[value] ?? value}</Tag>,
    },
    {
      title: '路由路径',
      dataIndex: 'path',
      width: 190,
      render: (value: string | null, record) =>
        record.menuType === 'LINK' && record.externalUrl ? (
          <Typography.Text code>{record.externalUrl}</Typography.Text>
        ) : value ? (
          <Typography.Text code>{value}</Typography.Text>
        ) : (
          '—'
        ),
    },
    {
      title: '权限标识',
      dataIndex: 'permissionCode',
      width: 170,
      render: (value: string | null) => (value ? <Typography.Text code>{value}</Typography.Text> : '—'),
    },
    {
      title: '图标',
      dataIndex: 'icon',
      width: 110,
      render: (value: string | null) => value || '—',
    },
    { title: '排序', dataIndex: 'sortOrder', width: 70 },
    {
      title: '可见',
      dataIndex: 'visible',
      width: 80,
      render: (value: 0 | 1) => <Tag color={value === 1 ? 'processing' : 'default'}>{value === 1 ? '显示' : '隐藏'}</Tag>,
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
            onChange={(checked) => statusMutation.mutate({ id: record.id, status: checked ? 1 : 0 })}
          />
          <StatusTag status={value} />
        </Space>
      ),
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
                title: `删除菜单「${record.menuName}」？`,
                content: '存在子菜单或已授权给角色时，服务端会拒绝删除。',
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
        title="菜单管理"
        description="维护后端导航树、权限标识和可见性。前端页面需在 src/config/routes.tsx 注册后才会显示。"
        extra={
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
            新建菜单
          </Button>
        }
      />

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title="菜单与页面映射"
        description="系统按 permissionCode（优先）或 path 将后端菜单映射到本地页面；未注册的菜单会自动从顶部导航隐藏，避免出现无法打开的入口。"
      />

      <FilterBar
        onSearch={() => listState.setFilters({ menuName: nameDraft.trim() })}
        onReset={() => {
          setNameDraft('');
          listState.reset();
        }}
        loading={list.isFetching}
        summary={<Typography.Text type="secondary">共 {list.data?.total ?? 0} 个菜单</Typography.Text>}
      >
        <Input
          allowClear
          placeholder="菜单名称"
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          style={{ width: 170 }}
        />
        <Select
          allowClear
          placeholder="类型"
          style={{ width: 110 }}
          value={listState.filters.menuType || undefined}
          onChange={(value) => listState.setFilter('menuType', value)}
          options={menuTypeOptions}
        />
        <Select
          allowClear
          placeholder="状态"
          style={{ width: 110 }}
          value={listState.filters.status ? Number(listState.filters.status) : undefined}
          onChange={(value) => listState.setFilter('status', value)}
          options={statusOptions}
        />
        <Select
          allowClear
          placeholder="可见性"
          style={{ width: 110 }}
          value={listState.filters.visible ? Number(listState.filters.visible) : undefined}
          onChange={(value) => listState.setFilter('visible', value)}
          options={visibleOptions}
        />
      </FilterBar>

      <DataTable<SystemMenuRecord>
        tableId="system-menus"
        tableLabel="菜单列表"
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
                title: `删除选中的 ${selectedRowKeys.length} 个菜单？`,
                content: '内置菜单不会被删除。',
                okButtonProps: { danger: true },
                onOk: async () => {
                  const builtin = new Set(
                    (list.data?.items ?? []).filter((item) => item.isBuiltin === 1).map((item) => item.id),
                  );
                  const ids = selectedRowKeys.map(Number).filter((id) => !builtin.has(id));
                  if (ids.length === 0) {
                    message.warning('没有可删除的菜单');
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

      <FormDrawer<MenuFormValues>
        open={formOpen}
        title={editing ? `编辑菜单：${editing.menuName}` : '新建菜单'}
        form={form}
        width={620}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onFinish={(values) => saveMutation.mutateAsync(values)}
        submitting={saveMutation.isPending}
        error={saveMutation.error}
      >
        <Form.Item name="parentId" label="上级菜单" rules={[{ required: true }]}>
          <TreeSelect
            treeData={parentTree}
            fieldNames={{ label: 'menuName', value: 'id', children: 'children' }}
            treeDefaultExpandAll
            placeholder="选择上级目录"
          />
        </Form.Item>
        <Form.Item name="menuName" label="菜单名称" rules={[{ required: true, message: '请输入菜单名称' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="menuType" label="菜单类型" rules={[{ required: true }]}>
          <Select options={menuTypeOptions} />
        </Form.Item>
        {menuType !== 'LINK' && (
          <>
            <Form.Item
              name="path"
              label="路由路径"
              rules={[
                { required: menuType === 'MENU', message: '菜单类型需要路由路径' },
                { pattern: /^\/.*/, message: '路由路径应以 / 开头' },
              ]}
            >
              <Input placeholder="/system/user" />
            </Form.Item>
            <Form.Item name="component" label="组件标识（后端元数据）">
              <Input placeholder="system/user/index" />
            </Form.Item>
          </>
        )}
        {menuType === 'LINK' && (
          <Form.Item
            name="externalUrl"
            label="外链地址"
            rules={[{ required: true, message: '外链菜单需要地址' }]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>
        )}
        <Form.Item name="permissionCode" label="权限标识">
          <Input placeholder="system:user" />
        </Form.Item>
        <Form.Item name="icon" label="图标">
          <Input placeholder="Users / Settings / MonitorCog" />
        </Form.Item>
        <Form.Item name="sortOrder" label="排序" rules={[{ required: true }]}>
          <InputNumber min={0} max={9999} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="visible" label="导航可见" rules={[{ required: true }]}>
          <Select options={visibleOptions} />
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
