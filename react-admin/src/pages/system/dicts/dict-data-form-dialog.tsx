import { X } from "lucide-react";
import { createPortal } from "react-dom";
import type { UseFormReturn } from "react-hook-form";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SystemDictTypeRecord } from "@/types";
import type { DictDataFormValues, FormMode } from "./schema";

type DictDataFormDialogProps = {
  open: boolean;
  mode: FormMode;
  form: UseFormReturn<DictDataFormValues>;
  loading: boolean;
  dictType?: SystemDictTypeRecord | null;
  onCancel: () => void;
  onSubmit: (values: DictDataFormValues) => void | Promise<void>;
};

export function DictDataFormDialog({
  open,
  mode,
  form,
  loading,
  dictType,
  onCancel,
  onSubmit,
}: DictDataFormDialogProps) {
  if (!open || typeof document === "undefined") return null;

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = form;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6">
      <section
        className="max-h-[calc(100vh-48px)] w-full max-w-[640px] overflow-hidden rounded-admin border border-border bg-surface shadow-admin"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dict-data-form-title"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2
              id="dict-data-form-title"
              className="text-base font-semibold text-text-primary"
            >
              {mode === "edit" ? "编辑字典项" : "新建字典项"}
            </h2>
            <p className="mt-1 text-[13px] text-text-tertiary">
              {dictType
                ? `${dictType.dictName} / ${dictType.dictCode}`
                : "未选择字典类型"}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            disabled={loading}
            onClick={onCancel}
            aria-label="关闭字典项表单"
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
              label="字典项名称"
              htmlFor="dictLabel"
              required
              error={errors.dictLabel?.message}
            >
              <Input
                id="dictLabel"
                disabled={loading}
                placeholder="例如：男"
                {...register("dictLabel")}
              />
            </Field>

            <Field
              label="字典项值"
              htmlFor="dictValue"
              required
              error={errors.dictValue?.message}
            >
              <Input
                id="dictValue"
                disabled={loading}
                placeholder="例如：MALE"
                {...register("dictValue")}
              />
            </Field>

            <Field
              label="排序"
              htmlFor="dataSortOrder"
              error={errors.sortOrder?.message}
            >
              <Input
                id="dataSortOrder"
                type="number"
                min={0}
                inputMode="numeric"
                disabled={loading}
                {...register("sortOrder")}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field
              label="备注"
              htmlFor="dataRemark"
              error={errors.remark?.message}
            >
              <Textarea
                id="dataRemark"
                disabled={loading}
                placeholder="补充字典项说明"
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
