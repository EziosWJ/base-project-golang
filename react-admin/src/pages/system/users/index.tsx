import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, RefreshCw, RotateCcw, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  assignUserRoles,
  createUser,
  deleteUser,
  getAssignableRoles,
  getUserDetail,
  getUserPage,
  resetUserPassword,
  updateUser,
  updateUserStatus,
} from "@/api/user";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { SearchFilterBar } from "@/components/common/search-filter-bar";
import { StatusTag } from "@/components/common/status-tag";
import { TableToolbar } from "@/components/common/table-toolbar";
import { toast } from "@/components/common/toast-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  API_STATUS_VALUES,
  COMMON_STATUS_OPTIONS,
  DICT_CODES,
  USER_GENDER_OPTIONS,
  USER_GENDER_VALUES,
} from "@/constants/dicts";
import { useDictOptions } from "@/hooks/use-dict-options";
import { useListPage } from "@/hooks/use-list-page";
import { getErrorMessage, isApiError } from "@/lib/api-error";
import type { ApiStatus, AssignableRole, UserGender, UserRecord } from "@/types";
import { createUserColumns } from "./columns";
import { PasswordResultDialog } from "./password-result-dialog";
import { RoleAssignDialog } from "./role-assign-dialog";
import {
  buildQuery,
  buildUserPayload,
  DEFAULT_FILTERS,
  toFormValues,
  userFormSchema,
  type FilterState,
  type UserFormMode,
  type UserFormValues,
} from "./schema";
import { UserFormDialog } from "./user-form-dialog";

type ConfirmAction =
  | { type: "delete"; user: UserRecord }
  | { type: "status"; user: UserRecord; status: ApiStatus }
  | { type: "resetPassword"; user: UserRecord };

export function UsersPage() {
  const {
    data: users,
    total,
    loading,
    error,
    page,
    pageSize,
    setPage,
    setPageSize,
    filters,
    setFilter,
    submitFilters,
    resetFilters,
    reload: loadUsers,
  } = useListPage<FilterState, UserRecord>({
    fetch: getUserPage,
    defaultFilters: DEFAULT_FILTERS,
    toQuery: (f, p, ps) => buildQuery(f, p, ps),
    onError: (err) =>
      toast.error({
        title: "加载失败",
        description: getErrorMessage(err, "用户列表加载失败"),
      }),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<UserFormMode>("create");
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [roleDialogUser, setRoleDialogUser] = useState<UserRecord | null>(null);
  const [roleOptions, setRoleOptions] = useState<AssignableRole[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState<{
    user: UserRecord;
    password: string;
  } | null>(null);

  const editRequestId = useRef(0);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: toFormValues(),
  });
  const statusDict = useDictOptions<ApiStatus>(DICT_CODES.COMMON_STATUS, {
    fallback: COMMON_STATUS_OPTIONS,
    allowedValues: API_STATUS_VALUES,
    valueType: "number",
    showErrorToast: true,
    errorTitle: "用户状态字典加载失败",
  });
  const genderDict = useDictOptions<UserGender>(DICT_CODES.USER_GENDER, {
    fallback: USER_GENDER_OPTIONS,
    allowedValues: USER_GENDER_VALUES,
    showErrorToast: true,
    errorTitle: "用户性别字典加载失败",
  });

  const openCreateForm = () => {
    setFormMode("create");
    setEditingUser(null);
    form.reset(toFormValues());
    setFormOpen(true);
  };

  const openEditForm = async (user: UserRecord) => {
    const requestId = ++editRequestId.current;
    setFormMode("edit");
    setEditingUser(user);
    form.reset(toFormValues(user));
    setFormOpen(true);

    try {
      const detail = await getUserDetail(user.id);
      if (editRequestId.current !== requestId) return;
      setEditingUser(detail);
      form.reset(toFormValues(detail));
    } catch (detailError) {
      if (editRequestId.current !== requestId) return;
      toast.error({
        title: "用户详情加载失败",
        description: getErrorMessage(detailError, "无法获取用户详情"),
      });
    }
  };

  const submitUserForm = async (values: UserFormValues) => {
    setFormSubmitting(true);

    try {
      if (formMode === "edit" && editingUser) {
        await updateUser(editingUser.id, buildUserPayload(values));
        toast.success("用户已更新");
      } else {
        await createUser(buildUserPayload(values));
        toast.success("用户已创建，默认密码为 admin123");
      }

      setFormOpen(false);
      await loadUsers();
    } catch (submitError) {
      if (isApiError(submitError) && submitError.fieldErrors) {
        Object.entries(submitError.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof UserFormValues, { message });
        });
      }

      toast.error({
        title: formMode === "edit" ? "更新失败" : "创建失败",
        description: getErrorMessage(submitError, "请检查表单后重试"),
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const openRoleDialog = async (user: UserRecord) => {
    setRoleDialogUser(user);
    setSelectedRoleIds(user.roles?.map((role) => role.id) ?? []);
    setRoleLoading(true);

    try {
      const [detail, roles] = await Promise.all([
        getUserDetail(user.id),
        getAssignableRoles(),
      ]);
      setRoleDialogUser(detail);
      setSelectedRoleIds(detail.roles?.map((role) => role.id) ?? []);
      setRoleOptions(roles);
    } catch (roleError) {
      toast.error({
        title: "角色数据加载失败",
        description: getErrorMessage(roleError, "无法获取角色列表"),
      });
    } finally {
      setRoleLoading(false);
    }
  };

  const submitRoles = async () => {
    if (!roleDialogUser) return;

    setRoleSubmitting(true);
    try {
      await assignUserRoles(roleDialogUser.id, { roleIds: selectedRoleIds });
      toast.success("角色分配已保存");
      setRoleDialogUser(null);
      await loadUsers();
    } catch (roleError) {
      toast.error({
        title: "角色分配失败",
        description: getErrorMessage(roleError, "请稍后重试"),
      });
    } finally {
      setRoleSubmitting(false);
    }
  };

  const runConfirmAction = async () => {
    if (!confirmAction) return;

    setConfirmLoading(true);
    try {
      if (confirmAction.type === "delete") {
        await deleteUser(confirmAction.user.id);
        toast.success("用户已删除");
      }

      if (confirmAction.type === "status") {
        await updateUserStatus(confirmAction.user.id, {
          status: confirmAction.status,
        });
        toast.success(
          confirmAction.status === 1 ? "用户已启用" : "用户已禁用",
        );
      }

      if (confirmAction.type === "resetPassword") {
        const password = await resetUserPassword(confirmAction.user.id);
        setResetPasswordResult({ user: confirmAction.user, password });
        toast.success("密码已重置");
      }

      setConfirmAction(null);
      await loadUsers();
    } catch (actionError) {
      toast.error({
        title: "操作失败",
        description: getErrorMessage(actionError, "请稍后重试"),
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  const confirmMeta = useMemo(() => {
    if (!confirmAction) return null;

    if (confirmAction.type === "delete") {
      return {
        title: "删除用户",
        description: `确认删除用户「${confirmAction.user.nickname || confirmAction.user.username}」吗？此操作不可恢复。`,
        confirmText: "删除",
        danger: true,
      };
    }

    if (confirmAction.type === "status") {
      const enabled = confirmAction.status === 1;
      return {
        title: enabled ? "启用用户" : "禁用用户",
        description: `确认${enabled ? "启用" : "禁用"}用户「${confirmAction.user.nickname || confirmAction.user.username}」吗？`,
        confirmText: enabled ? "启用" : "禁用",
        danger: !enabled,
      };
    }

    return {
      title: "重置密码",
      description: `确认重置用户「${confirmAction.user.nickname || confirmAction.user.username}」的密码吗？新密码将返回给管理员。`,
      confirmText: "重置密码",
      danger: false,
    };
  }, [confirmAction]);

  const columns = createUserColumns({
    onEdit: (user) => void openEditForm(user),
    onAssignRoles: (user) => void openRoleDialog(user),
    onChangeStatus: (user, status) =>
      setConfirmAction({ type: "status", user, status }),
    onResetPassword: (user) =>
      setConfirmAction({ type: "resetPassword", user }),
    onDelete: (user) => setConfirmAction({ type: "delete", user }),
  });

  return (
    <>
      <PageHeader
        title="用户管理"
        description="管理后台用户、状态、角色和密码重置。"
        actions={
          <Button variant="primary" onClick={openCreateForm}>
            <Plus className="h-4 w-4" aria-hidden />
            新建用户
          </Button>
        }
      />

      <SearchFilterBar
        actions={
          <>
            <Button variant="secondary" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              重置
            </Button>
            <Button variant="primary" onClick={() => submitFilters()}>
              <Search className="h-4 w-4" aria-hidden />
              查询
            </Button>
          </>
        }
      >
        <form className="contents" onSubmit={(event) => { event.preventDefault(); submitFilters(); }}>
          <Input
            value={filters.username}
            onChange={(event) => setFilter("username", event.target.value)}
            placeholder="用户名"
          />
          <Input
            value={filters.nickname}
            onChange={(event) => setFilter("nickname", event.target.value)}
            placeholder="昵称"
          />
          <Input
            value={filters.phone}
            onChange={(event) => setFilter("phone", event.target.value)}
            placeholder="手机号"
          />
          <Input
            value={filters.email}
            onChange={(event) => setFilter("email", event.target.value)}
            placeholder="邮箱"
          />
          <Input
            value={filters.deptId}
            onChange={(event) => setFilter("deptId", event.target.value)}
            placeholder="部门 ID"
            inputMode="numeric"
          />
          <Select
            value={String(filters.status)}
            onChange={(event) =>
              setFilter(
                "status",
                event.target.value === "all"
                  ? "all"
                  : (Number(event.target.value) as ApiStatus),
              )
            }
            aria-label="筛选状态"
          >
            <option value="all">全部状态</option>
            {statusDict.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </form>
      </SearchFilterBar>

      <section className="rounded-admin border border-border bg-surface shadow-admin">
        <TableToolbar
          title="用户列表"
          description={`共 ${total} 条数据，当前显示 ${users.length} 条。`}
          actions={
            <>
              <StatusTag tone={loading ? "warning" : error ? "error" : "info"}>
                {loading ? "加载中" : error ? "加载失败" : "已同步"}
              </StatusTag>
              <Button size="sm" variant="secondary" onClick={loadUsers}>
                <RefreshCw className="h-4 w-4" aria-hidden />
                刷新
              </Button>
            </>
          }
        />
        <DataTable<UserRecord>
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          error={error}
          minWidth={1280}
          empty={
            <EmptyState
              title="暂无用户数据"
              description="调整筛选条件后重新查询。"
              actionText="重置筛选"
              onAction={resetFilters}
            />
          }
        />
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          disabled={loading}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </section>

      <UserFormDialog
        open={formOpen}
        mode={formMode}
        form={form}
        loading={formSubmitting}
        genderOptions={genderDict.options}
        statusOptions={statusDict.options}
        onCancel={() => setFormOpen(false)}
        onSubmit={submitUserForm}
      />

      <RoleAssignDialog
        user={roleDialogUser}
        roles={roleOptions}
        selectedRoleIds={selectedRoleIds}
        loading={roleLoading}
        submitting={roleSubmitting}
        onToggle={(roleId, checked) => {
          setSelectedRoleIds((current) =>
            checked
              ? Array.from(new Set([...current, roleId]))
              : current.filter((id) => id !== roleId),
          );
        }}
        onCancel={() => setRoleDialogUser(null)}
        onSubmit={submitRoles}
      />

      <PasswordResultDialog
        result={resetPasswordResult}
        onClose={() => setResetPasswordResult(null)}
      />

      {confirmMeta && (
        <ConfirmDialog
          open={!!confirmAction}
          title={confirmMeta.title}
          description={confirmMeta.description}
          confirmText={confirmMeta.confirmText}
          danger={confirmMeta.danger}
          loading={confirmLoading}
          onConfirm={runConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}
