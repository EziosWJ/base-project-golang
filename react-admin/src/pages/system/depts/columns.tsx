import { Pencil, Trash2 } from "lucide-react";
import { StatusTag } from "@/components/common/status-tag";
import { Button } from "@/components/ui/button";
import type { ApiStatus, DataTableColumn, DeptRecord } from "@/types";

const statusMeta: Record<
  ApiStatus,
  { label: string; tone: "success" | "neutral" }
> = {
  1: { label: "启用", tone: "success" },
  0: { label: "禁用", tone: "neutral" },
};

type DeptColumnActions = {
  onEdit: (dept: DeptRecord) => void | Promise<void>;
  onChangeStatus: (dept: DeptRecord, status: ApiStatus) => void;
  onDelete: (dept: DeptRecord) => void;
};

export function createDeptColumns({
  onEdit,
  onChangeStatus,
  onDelete,
}: DeptColumnActions): DataTableColumn<DeptRecord>[] {
  return [
    {
      title: "部门",
      key: "dept",
      width: 240,
      render: (_, dept) => (
        <div>
          <div className="font-medium text-text-primary">{dept.deptName}</div>
          <div className="text-xs text-text-tertiary">
            {dept.deptCode} · ID {dept.id}
          </div>
        </div>
      ),
    },
    {
      title: "负责人",
      dataIndex: "leader",
      width: 120,
      render: (value) => String(value || "-"),
    },
    {
      title: "联系方式",
      key: "contact",
      width: 220,
      render: (_, dept) => (
        <div className="space-y-0.5 text-sm">
          <div>{dept.phone || "-"}</div>
          <div className="text-xs text-text-tertiary">{dept.email || "-"}</div>
        </div>
      ),
    },
    {
      title: "排序",
      dataIndex: "sortOrder",
      width: 90,
      render: (value) => (
        <span className="tabular-nums">{String(value ?? 0)}</span>
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
      title: "属性",
      dataIndex: "isBuiltin",
      width: 96,
      render: (value) =>
        value === 1 ? (
          <StatusTag tone="info">内置</StatusTag>
        ) : (
          <StatusTag tone="neutral">普通</StatusTag>
        ),
    },
    {
      title: "操作",
      key: "actions",
      align: "center",
      width: 260,
      render: (_, dept) => (
        <div className="inline-flex flex-wrap items-center justify-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => void onEdit(dept)}>
            <Pencil className="h-4 w-4" aria-hidden />
            编辑
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChangeStatus(dept, dept.status === 1 ? 0 : 1)}
          >
            {dept.status === 1 ? "禁用" : "启用"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-error hover:text-error"
            disabled={dept.isBuiltin === 1}
            title={dept.isBuiltin === 1 ? "内置部门不允许删除" : undefined}
            onClick={() => onDelete(dept)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            删除
          </Button>
        </div>
      ),
    },
  ];
}
