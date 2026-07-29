import { X } from "lucide-react";
import { createPortal } from "react-dom";
import type { UseFormReturn } from "react-hook-form";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DictSelectOption } from "@/constants/dicts";
import type { ApiStatus, SystemDictTypeRecord } from "@/types";
import type { DictTypeFormValues, FormMode } from "./schema";

type DictTypeFormDialogProps = {
  open: boolean;
  mode: FormMode;
  form: UseFormReturn<DictTypeFormValues>;
  loading: boolean;
  editingType: SystemDictTypeRecord | null;
  statusOptions: DictSelectOption<ApiStatus>[];
  onCancel: () => void;
  onSubmit: (values: DictTypeFormValues) => void | Promise<void>;
};

export function DictTypeFormDialog({
  open,
  mode,
  form,
  loading,
  editingType,
  statusOptions,
  onCancel,
  onSubmit,
}: DictTypeFormDialogProps) {
  if (!open || typeof document === "undefined") return null;

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = form;
  const isBuiltin = mode === "edit" && editingType?.isBuiltin === 1;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6">
      <section
        className="max-h-[calc(100vh-48px)] w-full max-w-[640px] overflow-hidden rounded-admin border border-border bg-surface shadow-admin"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dict-type-form-title"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2
              id="dict-type-form-title"
              className="text-base font-semibold text-text-primary"
            >
              {mode === "edit" ? "编辑字典类型" : "新建字典类型"}
            </h2>
            <p className="mt-1 text-[13px] text-text-tertiary">
              内置字典的字典编码不可修改。
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            disabled={loading}
            onClick={onCancel}
            aria-label="关闭字典类型表单"
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
              label="字典名称"
              htmlFor="dictName"
              required
              error={errors.dictName?.message}
            >
              <Input
                id="dictName"
                disabled={loading}
                placeholder="例如：性别"
                {...register("dictName")}
              />
            </Field>

            <Field
              label="字典编码"
              htmlFor="dictCode"
              required
              error={errors.dictCode?.message}
              help={isBuiltin ? "内置字典编码由系统维护。" : undefined}
            >
              <Input
                id="dictCode"
                disabled={loading}
                readOnly={isBuiltin}
                className={isBuiltin ? "bg-slate-50 text-text-tertiary" : undefined}
                placeholder="例如：gender"
                {...register("dictCode")}
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
                placeholder="补充字典用途或维护说明"
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
