import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { AssignableRole, UserRecord } from "@/types";

type RoleAssignDialogProps = {
  user: UserRecord | null;
  roles: AssignableRole[];
  selectedRoleIds: number[];
  loading: boolean;
  submitting: boolean;
  onToggle: (roleId: number, checked: boolean) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export function RoleAssignDialog({
  user,
  roles,
  selectedRoleIds,
  loading,
  submitting,
  onToggle,
  onCancel,
  onSubmit,
}: RoleAssignDialogProps) {
  if (!user || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6">
      <section
        className="w-full max-w-[560px] rounded-admin border border-border bg-surface shadow-admin"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              分配角色
            </h2>
            <p className="mt-1 text-sm text-text-tertiary">
              {user.nickname || user.username}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            disabled={submitting}
            onClick={onCancel}
            aria-label="关闭角色分配"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </header>

        <div className="max-h-[360px] overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-10 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          ) : roles.length === 0 ? (
            <EmptyState
              title="暂无可分配角色"
              description="后端角色列表为空或当前筛选无启用角色。"
            />
          ) : (
            <div className="space-y-2">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 hover:bg-slate-50"
                >
                  <span>
                    <span className="font-medium text-text-primary">
                      {role.roleName}
                    </span>
                    <span className="ml-2 text-xs text-text-tertiary">
                      {role.roleCode}
                    </span>
                  </span>
                  <Checkbox
                    checked={selectedRoleIds.includes(role.id)}
                    disabled={submitting}
                    onChange={(event) => onToggle(role.id, event.target.checked)}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="secondary" disabled={submitting} onClick={onCancel}>
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
