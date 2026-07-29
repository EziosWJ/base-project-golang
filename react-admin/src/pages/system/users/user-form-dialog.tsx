import { X } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DictSelectOption } from "@/constants/dicts";
import type { ApiStatus, UserGender } from "@/types";
import type { UserFormMode, UserFormValues } from "./schema";

type UserFormDialogProps = {
  open: boolean;
  mode: UserFormMode;
  form: UseFormReturn<UserFormValues>;
  loading: boolean;
  genderOptions: DictSelectOption<UserGender>[];
  statusOptions: DictSelectOption<ApiStatus>[];
  onCancel: () => void;
  onSubmit: (values: UserFormValues) => void | Promise<void>;
};

export function UserFormDialog({
  open,
  mode,
  form,
  loading,
  genderOptions,
  statusOptions,
  onCancel,
  onSubmit,
}: UserFormDialogProps) {
  if (!open || typeof document === "undefined") return null;

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = form;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6">
      <section
        className="max-h-[calc(100vh-48px)] w-full max-w-[760px] overflow-hidden rounded-admin border border-border bg-surface shadow-admin"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              {mode === "create" ? "新建用户" : "编辑用户"}
            </h2>
            <p className="mt-1 text-sm text-text-tertiary">
              新增用户默认密码由后端生成，当前部门暂以部门 ID 输入占位。
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            disabled={loading}
            onClick={onCancel}
            aria-label="关闭用户表单"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </header>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid max-h-[calc(100vh-184px)] gap-4 overflow-y-auto px-5 py-4 md:grid-cols-2">
            <FormField label="用户名" error={errors.username?.message} required>
              <Input
                {...register("username")}
                placeholder="请输入用户名"
                disabled={loading}
                autoComplete="username"
              />
            </FormField>
            <FormField label="昵称" error={errors.nickname?.message} required>
              <Input
                {...register("nickname")}
                placeholder="请输入昵称"
                disabled={loading}
              />
            </FormField>
            <FormField label="手机号" error={errors.phone?.message}>
              <Input
                {...register("phone")}
                placeholder="请输入手机号"
                disabled={loading}
                autoComplete="tel"
              />
            </FormField>
            <FormField label="邮箱" error={errors.email?.message}>
              <Input
                {...register("email")}
                placeholder="请输入邮箱"
                disabled={loading}
                autoComplete="email"
              />
            </FormField>
            <FormField label="性别" error={errors.gender?.message}>
              <Select {...register("gender")} disabled={loading}>
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="状态" error={errors.status?.message}>
              <Select
                {...register("status", { valueAsNumber: true })}
                disabled={loading}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="部门 ID" error={errors.deptId?.message}>
              <Input
                {...register("deptId", {
                  setValueAs: (value) =>
                    value === "" ? undefined : Number(value),
                })}
                placeholder="部门模块完成后替换为树选择"
                disabled={loading}
                inputMode="numeric"
              />
            </FormField>
            <FormField
              label="备注"
              error={errors.remark?.message}
              className="md:col-span-2"
            >
              <Textarea
                {...register("remark")}
                placeholder="请输入备注"
                disabled={loading}
              />
            </FormField>
          </div>
          <footer className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <Button variant="secondary" disabled={loading} onClick={onCancel}>
              取消
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className={loading ? "cursor-wait" : undefined}
            >
              {loading ? "提交中..." : "保存"}
            </Button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}

function FormField({
  label,
  error,
  required = false,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="ml-1 text-error">*</span>}
      </span>
      {children}
      <span className="mt-1 block min-h-[18px] text-xs text-error">
        {error ?? ""}
      </span>
    </label>
  );
}
