import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { StatusTag } from "@/components/common/status-tag";
import {
  TreeCheckList,
  type TreeCheckNode,
} from "@/components/common/tree-check-list";
import { Button } from "@/components/ui/button";
import type { RoleDetailRecord } from "@/types";

type RoleMenuDialogProps = {
  role: RoleDetailRecord | null;
  nodes: TreeCheckNode[];
  checkedIds: number[];
  loading: boolean;
  submitting: boolean;
  onCheckedChange: (checkedIds: Array<string | number>) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export function RoleMenuDialog({
  role,
  nodes,
  checkedIds,
  loading,
  submitting,
  onCheckedChange,
  onCancel,
  onSubmit,
}: RoleMenuDialogProps) {
  if (!role || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6">
      <section
        className="max-h-[calc(100vh-48px)] w-full max-w-[720px] overflow-hidden rounded-admin border border-border bg-surface shadow-admin"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-menu-title"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2
              id="role-menu-title"
              className="text-base font-semibold text-text-primary"
            >
              分配菜单
            </h2>
            <p className="mt-1 text-[13px] text-text-tertiary">
              {role.roleName} / {role.roleCode}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            disabled={loading || submitting}
            onClick={onCancel}
            aria-label="关闭菜单分配"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </header>

        <div className="max-h-[calc(100vh-180px)] overflow-y-auto px-5 py-5">
          <div className="mb-3 flex items-center justify-between gap-3 text-sm">
            <span className="text-text-secondary">
              已选择{" "}
              <span className="font-medium text-text-primary">
                {checkedIds.length}
              </span>{" "}
              个菜单节点
            </span>
            <StatusTag tone={loading ? "warning" : "info"}>
              {loading ? "加载中" : "菜单树"}
            </StatusTag>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-9 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-9 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-9 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ) : (
            <TreeCheckList
              nodes={nodes}
              checkedIds={checkedIds}
              disabled={submitting}
              cascade
              onCheckedChange={onCheckedChange}
            />
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button
            variant="secondary"
            disabled={loading || submitting}
            onClick={onCancel}
          >
            取消
          </Button>
          <Button
            variant="primary"
            disabled={loading || submitting}
            onClick={onSubmit}
          >
            {submitting ? "保存中..." : "保存"}
          </Button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
