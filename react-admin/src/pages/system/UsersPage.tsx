import { useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Tag,
  TreeSelect,
  Typography,
} from 'antd';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Key } from 'react';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { FilterBar } from '../../components/admin/FilterBar';
import { DetailDrawer } from '../../components/admin/DetailDrawer';
import { DataTable, type DataTableColumns } from '../../components/DataTable/DataTable';
import { FormDrawer } from '../../components/FormDrawer/FormDrawer';
import { StatusTag } from '../../components/StatusTag/StatusTag';
import { genderMeta, genderOptions, statusOptions } from '../../config/options';
import { queryKeys } from '../../lib/query/keys';
import { getErrorMessage } from '../../lib/api/errors';
import { applyServerFieldErrors } from '../../lib/forms';
import { formatDateTime } from '../../utils/format';
import { useListState } from '../../hooks/useListState';
import {
  assignUserRoles,
  batchDeleteUsers,
  createUser,
  deleteUser,
  getAssignableRoles,
  getDeptOptions,
  getUserDetail,
  getUserPage,
  resetUserPassword,
  updateUser,
  updateUserStatus,
} from '../../features/system/api';
import type { UserInput, UserRecord } from '../../types/system';
import { useAuthStore } from '../../features/auth/store';

interface UserFormValues {
  username?: string;
  nickname: string;
  phone?: string;
  email?: string;
  gender: UserInput['gender'];
  deptId?: number | null;
  status: 0 | 1;
  remark?: string;
}

const FILTER_KEYS = ['username', 'nickname', 'status', 'deptId'] as const;

export default function UsersPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [form] = Form.useForm<UserFormValues>();
  const listState = useListState({ filterKeys: FILTER_KEYS });

  const [usernameDraft, setUsernameDraft] = useState(listState.filters.username ?? '');
  const [nicknameDraft, setNicknameDraft] = useState(listState.filters.nickname ?? '');
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [roleTarget, setRoleTarget] = useState<UserRecord | null>(null);
  const [roleIds, setRoleIds] = useState<number[]>([]);

  useEffect(() => {
    setUsernameDraft(listState.filters.username ?? '');
    setNicknameDraft(listState.filters.nickname ?? '');
  }, [listState.filters.username, listState.filters.nickname]);

  const list = useQuery({
    queryKey: queryKeys.users.list(listState.query),
    queryFn: () => getUserPage(listState.query),
    placeholderData: keepPreviousData,
  });

  const deptOptions = useQuery({
    queryKey: queryKeys.depts.options(),
    queryFn: getDeptOptions,
    staleTime: 60_000,
  });

  const detail = useQuery({
    queryKey: queryKeys.users.detail(detailId ?? 0),
    queryFn: () => getUserDetail(detailId as number),
    enabled: detailId !== null,
  });

  const roleOptions = useQuery({
    queryKey: queryKeys.users.roleOptions(),
    queryFn: getAssignableRoles,
    enabled: roleTarget !== null,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

  const saveMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      if (editing) {
        const rest: UserFormValues = { ...values };
        delete rest.username;
        return updateUser(editing.id, rest);
      }
      return createUser({ ...values, username: values.username as string });
    },
    onSuccess: () => {
      message.success(editing ? '用户已更新' : '用户已创建');
      setFormOpen(false);
      setEditing(null);
      void invalidate();
    },
    onError: (error) => { applyServerFieldErrors(form, error); }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      message.success('用户已删除');
      setSelectedRowKeys([]);
      void invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const batchDeleteMutation = useMutation({
    mutationFn: batchDeleteUsers,
    onSuccess: () => {
      message.success('已批量删除');
      setSelectedRowKeys([]);
      void invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 0 | 1 }) => updateUserStatus(id, status),
    onSuccess: () => {
      message.success('状态已更新');
      void invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, ids }: { id: number; ids: number[] }) => assignUserRoles(id, ids),
    onSuccess: () => {
      message.success('角色已更新');
      setRoleTarget(null);
      void invalidate();
      if (detailId) void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(detailId) });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 1, gender: 'UNSPECIFIED' });
    setFormOpen(true);
  };

  const openEdit = (record: UserRecord) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({
      username: record.username,
      nickname: record.nickname,
      phone: record.phone ?? undefined,
      email: record.email ?? undefined,
      gender: record.gender ?? 'UNSPECIFIED',
      deptId: record.deptId ?? undefined,
      status: record.status,
      remark: record.remark ?? undefined,
    });
    setFormOpen(true);
  };

  const confirmDelete = (record: UserRecord) => {
    modal.confirm({
      title: `删除用户「${record.nickname}」？`,
      content: '删除后该账号将无法登录，操作不可撤销。',
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(record.id),
    });
  };

  const confirmReset = (record: UserRecord) => {
    modal.confirm({
      title: `重置「${record.nickname}」的密码？`,
      content: '系统将生成一个新的随机密码，并立即生效。',
      onOk: async () => {
        try {
          const result = await resetUserPassword(record.id);
          const password =
            typeof result === 'string' ? result : (result?.password ?? '');
          modal.info({
            title: '密码已重置',
            content: (
              <Space direction="vertical">
                <Typography.Text>请将新密码安全地交给用户：</Typography.Text>
                <Typography.Text copyable code>
                  {password || '服务端未返回明文密码'}
                </Typography.Text>
              </Space>
            ),
          });
        } catch (error) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

  const deptTreeData = useMemo(() => deptOptions.data ?? [], [deptOptions.data]);

  const columns: DataTableColumns<UserRecord> = [
    {
      title: '用户名',
      dataIndex: 'username',
      width: 140,
      render: (value: string, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{value}</Typography.Text>
          {record.isBuiltin === 1 && <Tag color="gold">内置</Tag>}
        </Space>
      ),
    },
    { title: '昵称', dataIndex: 'nickname', width: 140 },
    {
      title: '部门',
      dataIndex: 'deptName',
      width: 140,
      render: (value: string | null) => value || '—',
    },
    {
      title: '角色',
      dataIndex: 'roles',
      width: 200,
      render: (_: unknown, record) =>
        record.roles?.length
          ? record.roles.map((role) => <Tag key={role.id}>{role.roleName}</Tag>)
          : '—',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: 0 | 1, record) => (
        <Space size={6}>
          <Switch
            size="small"
            checked={value === 1}
            disabled={record.isBuiltin === 1 || record.id === currentUser?.id}
            onChange={(checked) =>
              statusMutation.mutate({ id: record.id, status: checked ? 1 : 0 })
            }
          />
          <StatusTag status={value} />
        </Space>
      ),
    },
    {
      title: '最近登录',
      dataIndex: 'lastLoginTime',
      width: 160,
      render: (value: string | null) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      hideInSettings: true,
      render: (_, record) => (
        <Space size={0} wrap className="table-actions">
          <Button type="link" size="small" onClick={() => setDetailId(record.id)}>
            详情
          </Button>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setRoleTarget(record);
              setRoleIds(record.roles?.map((role) => role.id) ?? []);
            }}
          >
            角色
          </Button>
          <Button type="link" size="small" onClick={() => confirmReset(record)}>
            重置密码
          </Button>
          <Button
            type="link"
            size="small"
            danger
            className="table-action-danger"
            disabled={record.isBuiltin === 1 || record.id === currentUser?.id}
            onClick={() => confirmDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const selectedUsers = (list.data?.items ?? []).filter((item) =>
    selectedRowKeys.includes(item.id),
  );

  return (
    <div>
      <PageHeader
        title="用户管理"
        description="系统账号、部门、角色与登录状态。密码由后端 BCrypt 存储，重置后请安全转交。"
        extra={
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
            新建用户
          </Button>
        }
      />

      <FilterBar
        onSearch={() =>
          listState.setFilters({ username: usernameDraft.trim(), nickname: nicknameDraft.trim() })
        }
        onReset={() => {
          setUsernameDraft('');
          setNicknameDraft('');
          listState.reset();
        }}
        loading={list.isFetching}
        summary={<Typography.Text type="secondary">共 {list.data?.total ?? 0} 个账号</Typography.Text>}
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
          placeholder="昵称"
          value={nicknameDraft}
          onChange={(event) => setNicknameDraft(event.target.value)}
          style={{ width: 150 }}
        />
        <Select
          allowClear
          placeholder="状态"
          style={{ width: 110 }}
          value={listState.filters.status ? Number(listState.filters.status) : undefined}
          onChange={(value) => listState.setFilter('status', value)}
          options={statusOptions}
        />
        <TreeSelect
          allowClear
          placeholder="部门"
          style={{ width: 180 }}
          value={listState.filters.deptId ? Number(listState.filters.deptId) : undefined}
          onChange={(value) => listState.setFilter('deptId', value)}
          treeData={deptTreeData}
          fieldNames={{ label: 'deptName', value: 'id', children: 'children' }}
          treeDefaultExpandAll
        />
      </FilterBar>

      <DataTable<UserRecord>
        tableId="system-users"
        tableLabel="用户列表"
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
          <Space wrap>
            <Button
              icon={<RotateCcw size={15} />}
              onClick={() => void list.refetch()}
              disabled={list.isFetching}
            >
              刷新
            </Button>
          </Space>
        }
        batchActions={({ clear }) => (
          <Button
            danger
            size="small"
            icon={<Trash2 size={14} />}
            disabled={selectedRowKeys.length === 0}
            onClick={() =>
              modal.confirm({
                title: `删除选中的 ${selectedRowKeys.length} 个账号？`,
                content: '内置账号和当前登录账号不会被删除。',
                okButtonProps: { danger: true },
                onOk: async () => {
                  const ids = selectedUsers
                    .filter((item) => item.isBuiltin !== 1 && item.id !== currentUser?.id)
                    .map((item) => item.id);
                  if (ids.length === 0) {
                    message.warning('没有可删除的账号');
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

      <FormDrawer<UserFormValues>
        open={formOpen}
        title={editing ? `编辑用户：${editing.nickname}` : '新建用户'}
        description={editing ? '用户名创建后不可修改。' : '初始密码由后端认证配置决定，请向用户安全转交。'}
        form={form}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onFinish={(values) => saveMutation.mutateAsync(values)}
        submitting={saveMutation.isPending}
        error={saveMutation.error}
      >
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: !editing, message: '请输入用户名' },
            { min: 3, max: 32, message: '用户名长度为 3-32 个字符' },
            { pattern: /^[A-Za-z0-9_.-]+$/, message: '仅支持字母、数字、下划线和点' },
          ]}
        >
          <Input disabled={Boolean(editing)} autoComplete="off" placeholder="登录用户名" />
        </Form.Item>
        <Form.Item name="nickname" label="昵称" rules={[{ required: true, message: '请输入昵称' }]}>
          <Input placeholder="显示名称" />
        </Form.Item>
        <Form.Item name="phone" label="手机号" rules={[{ pattern: /^\d{6,20}$/, message: '手机号格式不正确' }]}>
          <Input placeholder="可选" />
        </Form.Item>
        <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
          <Input placeholder="可选" />
        </Form.Item>
        <Form.Item name="gender" label="性别">
          <Select options={genderOptions} />
        </Form.Item>
        <Form.Item name="deptId" label="所属部门">
          <TreeSelect
            allowClear
            placeholder="可选"
            treeData={deptTreeData}
            fieldNames={{ label: 'deptName', value: 'id', children: 'children' }}
            treeDefaultExpandAll
          />
        </Form.Item>
        <Form.Item name="status" label="状态" rules={[{ required: true }]}>
          <Select options={statusOptions} />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={3} maxLength={200} showCount placeholder="可选" />
        </Form.Item>
      </FormDrawer>

      <DetailDrawer
        open={detailId !== null}
        title="用户详情"
        onClose={() => setDetailId(null)}
        loading={detail.isLoading}
        error={detail.error}
      >
        {detail.data && (
          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label="用户名">{detail.data.username}</Descriptions.Item>
            <Descriptions.Item label="昵称">{detail.data.nickname}</Descriptions.Item>
            <Descriptions.Item label="部门">{detail.data.deptName || '—'}</Descriptions.Item>
            <Descriptions.Item label="角色">
              {detail.data.roles?.length
                ? detail.data.roles.map((role) => <Tag key={role.id}>{role.roleName}</Tag>)
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="性别">
              {genderMeta[detail.data.gender] ?? detail.data.gender}
            </Descriptions.Item>
            <Descriptions.Item label="手机号">{detail.data.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{detail.data.email || '—'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <StatusTag status={detail.data.status} />
            </Descriptions.Item>
            <Descriptions.Item label="最近登录">
              {formatDateTime(detail.data.lastLoginTime)}
            </Descriptions.Item>
            <Descriptions.Item label="登录 IP">{detail.data.lastLoginIp || '—'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {formatDateTime(detail.data.createTime)}
            </Descriptions.Item>
            <Descriptions.Item label="备注">{detail.data.remark || '—'}</Descriptions.Item>
          </Descriptions>
        )}
      </DetailDrawer>

      <Modal
        open={roleTarget !== null}
        title={`分配角色：${roleTarget?.nickname ?? ''}`}
        onCancel={() => setRoleTarget(null)}
        onOk={() => {
          if (roleTarget) roleMutation.mutate({ id: roleTarget.id, ids: roleIds });
        }}
        confirmLoading={roleMutation.isPending}
        okText="保存"
        destroyOnHidden
      >
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="选择角色"
          loading={roleOptions.isLoading}
          value={roleIds}
          onChange={setRoleIds}
          options={(roleOptions.data ?? []).map((role) => ({
            value: role.id,
            label: `${role.roleName}（${role.roleCode}）`,
            disabled: role.status !== 1,
          }))}
        />
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
          角色决定菜单可见范围。服务端接口目前按登录态保护，操作权限仍以后端既有规则为准。
        </Typography.Text>
      </Modal>
    </div>
  );
}
