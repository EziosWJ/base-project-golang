import { X } from "lucide-react";
import { createPortal } from "react-dom";
import type { UseFormReturn } from "react-hook-form";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DictSelectOption } from "@/constants/dicts";
import type { ApiStatus, RoleListRecord } from "@/types";
import type { RoleFormMode, RoleFormValues } from "./schema";

type RoleFormDialogProps = {
  open: boolean;
  mode: RoleFormMode;
  form: UseFormReturn<RoleFormValues>;
  loading: boolean;
  editingRole: RoleListRecord | null;
  statusOptions: DictSelectOption<ApiStatus>[];
  onCancel: () => void;
  onSubmit: (values: RoleFormValues) => void;
};

export function RoleFormDialog({
  open,
  mode,
  form,
  loading,
  editingRole,
  statusOptions,
  onCancel,
  onSubmit,
}: RoleFormDialogProps) {
  if (!open || typeof document === "undefined") return null;

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = form;
  const isBuiltin = mode === "edit" && editingRole?.isBuiltin === 1;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6">
      <section
        className="max-h-[calc(100vh-48px)] w-full max-w-[640px] overflow-hidden rounded-admin border border-border bg-surface shadow-admin"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-form-title"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2
              id="role-form-title"
              className="text-base font-semibold text-text-primary"
            >
              {mode === "edit" ? "编辑角色" : "新建角色"}
            </h2>
            <p className="mt-1 text-[13px] text-text-tertiary">
              内置角色的角色编码不可修改。
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            disabled={loading}
            onClick={onCancel}
            aria-label="关闭角色表单"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </header>

        <form
          className="max-h-[calc(100vh-150px)] overflow-y-auto px-5 py-5"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="角色名称"
              htmlFor="roleName"
              required
              error={errors.roleName?.message}
            >
              <Input
                id="roleName"
                disabled={loading}
                placeholder="例如：运营管理员"
                {...register("roleName")}
              />
            </Field>

            <Field
              label="角色编码"
              htmlFor="roleCode"
              required
              error={errors.roleCode?.message}
              help={isBuiltin ? "内置角色编码由系统维护。" : undefined}
            >
              <Input
                id="roleCode"
                disabled={loading}
                readOnly={isBuiltin}
                className={isBuiltin ? "bg-slate-50 text-text-tertiary" : undefined}
                placeholder="例如：operation_admin"
                {...register("roleCode")}
              />
            </Field>

            <Field label="状态" htmlFor="status" error={errors.status?.message}>
              <Select id="status" disabled={loading} {...register("status")}>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="排序"
              htmlFor="sortOrder"
              error={errors.sortOrder?.message}
            >
              <Input
                id="sortOrder"
                type="number"
                min={0}
                inputMode="numeric"
                disabled={loading}
                {...register("sortOrder")}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="备注" htmlFor="remark" error={errors.remark?.message}>
              <Textarea
                id="remark"
                disabled={loading}
                placeholder="补充角色用途或管理说明"
                {...register("remark")}
              />
            </Field>
          </div>

          <footer className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" disabled={loading} onClick={onCancel}>
              取消
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "保存中..." : "保存"}
            </Button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
