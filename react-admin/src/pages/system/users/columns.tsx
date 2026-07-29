import { KeyRound, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { StatusTag } from "@/components/common/status-tag";
import { Button } from "@/components/ui/button";
import { formatDateOnly, formatDateTime } from "@/lib/datetime";
import type { ApiStatus, DataTableColumn, UserRecord } from "@/types";
import { getRoleNames } from "./utils";

const statusMeta: Record<
  ApiStatus,
  { label: string; tone: "success" | "neutral" }
> = {
  1: { label: "启用", tone: "success" },
  0: { label: "禁用", tone: "neutral" },
};

type UserColumnActions = {
  onEdit: (user: UserRecord) => void;
  onAssignRoles: (user: UserRecord) => void;
  onChangeStatus: (user: UserRecord, status: ApiStatus) => void;
  onResetPassword: (user: UserRecord) => void;
  onDelete: (user: UserRecord) => void;
};

export function createUserColumns({
  onEdit,
  onAssignRoles,
  onChangeStatus,
  onResetPassword,
  onDelete,
}: UserColumnActions): DataTableColumn<UserRecord>[] {
  return [
    {
      title: "用户",
      key: "user",
      width: 220,
      render: (_, user) => (
        <div>
          <div className="font-medium text-text-primary">
            {user.nickname || user.username}
          </div>
          <div className="text-xs text-text-tertiary">
            {user.username} · ID {user.id}
          </div>
        </div>
      ),
    },
    {
      title: "联系方式",
      key: "contact",
      width: 220,
      render: (_, user) => (
        <div className="space-y-0.5 text-sm">
          <div>{user.phone || "-"}</div>
          <div className="text-xs text-text-tertiary">{user.email || "-"}</div>
        </div>
      ),
    },
    {
      title: "部门",
      dataIndex: "deptName",
      render: (value) => String(value || "-"),
    },
    {
      title: "角色",
      key: "roles",
      width: 220,
      render: (_, user) => (
        <span className="line-clamp-2 text-sm">{getRoleNames(user)}</span>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 96,
      render: (value) => {
        const status = value as ApiStatus;
        const meta = statusMeta[status];
        return <StatusTag tone={meta.tone}>{meta.label}</StatusTag>;
      },
    },
    {
      title: "最近登录",
      dataIndex: "lastLoginTime",
      width: 180,
      render: (value) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatDateTime(
            typeof value === "string" ? value : value ? String(value) : "",
          )}
        </span>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      width: 180,
      render: (value) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatDateOnly(
            typeof value === "string" ? value : value ? String(value) : "",
          )}
        </span>
      ),
    },
    {
      title: "操作",
      key: "actions",
      align: "center",
      width: 340,
      render: (_, user) => (
        <div className="inline-flex flex-wrap items-center justify-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => onEdit(user)}>
            <Pencil className="h-4 w-4" aria-hidden />
            编辑
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAssignRoles(user)}>
            <ShieldCheck className="h-4 w-4" aria-hidden />
            角色
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChangeStatus(user, user.status === 1 ? 0 : 1)}
          >
            {user.status === 1 ? "禁用" : "启用"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onResetPassword(user)}
          >
            <KeyRound className="h-4 w-4" aria-hidden />
            重置
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-error hover:text-error"
            onClick={() => onDelete(user)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            删除
          </Button>
        </div>
      ),
    },
  ];
}
