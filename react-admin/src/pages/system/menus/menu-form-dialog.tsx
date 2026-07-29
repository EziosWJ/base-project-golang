import { ExternalLink, X } from "lucide-react";
import { createPortal } from "react-dom";
import type { UseFormReturn } from "react-hook-form";
import { Field } from "@/components/common/field";
import { TreeSelect, type TreeSelectNode } from "@/components/common/tree-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DictSelectOption } from "@/constants/dicts";
import type { ApiStatus, SystemMenuRecord, SystemMenuType } from "@/types";
import type { MenuFormMode, MenuFormValues } from "./schema";

type MenuFormDialogProps = {
  open: boolean;
  mode: MenuFormMode;
  form: UseFormReturn<MenuFormValues>;
  loading: boolean;
  treeLoading: boolean;
  editingMenu: SystemMenuRecord | null;
  parentNodes: TreeSelectNode[];
  menuTypeOptions: DictSelectOption<SystemMenuType>[];
  visibleOptions: DictSelectOption<ApiStatus>[];
  statusOptions: DictSelectOption<ApiStatus>[];
  onCancel: () => void;
  onSubmit: (values: MenuFormValues) => void;
};

export function MenuFormDialog({
  open,
  mode,
  form,
  loading,
  treeLoading,
  editingMenu,
  parentNodes,
  menuTypeOptions,
  visibleOptions,
  statusOptions,
  onCancel,
  onSubmit,
}: MenuFormDialogProps) {
  const menuType = form.watch("menuType");

  if (!open || typeof document === "undefined") return null;

  const {
    formState: { errors },
    handleSubmit,
    register,
    setValue,
    watch,
  } = form;
  const isBuiltin = mode === "edit" && editingMenu?.isBuiltin === 1;
  const parentId = watch("parentId");

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6">
      <section
        className="max-h-[calc(100vh-48px)] w-full max-w-[800px] overflow-hidden rounded-admin border border-border bg-surface shadow-admin"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-form-title"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2
              id="menu-form-title"
              className="text-base font-semibold text-text-primary"
            >
              {mode === "edit" ? "编辑菜单" : "新建菜单"}
            </h2>
            <p className="mt-1 text-[13px] text-text-tertiary">
              菜单类型使用 DIR / MENU / LINK，与后端协议保持一致。
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            disabled={loading}
            onClick={onCancel}
            aria-label="关闭菜单表单"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </header>

        <form
          className="max-h-[calc(100vh-150px)] overflow-y-auto px-5 py-5"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="父级菜单" error={errors.parentId?.message}>
              <TreeSelect
                value={parentId}
                nodes={parentNodes}
                disabled={loading || treeLoading}
                clearable={false}
                placeholder={treeLoading ? "菜单树加载中" : "请选择父级菜单"}
                onChange={(value) => {
                  setValue("parentId", Number(value ?? 0), {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              />
            </Field>

            <Field
              label="菜单名称"
              htmlFor="menuName"
              required
              error={errors.menuName?.message}
            >
              <Input
                id="menuName"
                disabled={loading}
                placeholder="例如：用户管理"
                {...register("menuName")}
              />
            </Field>

            <Field
              label="菜单类型"
              htmlFor="menuType"
              required
              error={errors.menuType?.message}
              help={isBuiltin ? "内置菜单类型不建议修改。" : undefined}
            >
              <Select
                id="menuType"
                disabled={loading || isBuiltin}
                {...register("menuType")}
              >
                {menuTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="路由路径"
              htmlFor="path"
              required={menuType !== "LINK"}
              error={errors.path?.message}
            >
              <Input
                id="path"
                disabled={loading}
                readOnly={isBuiltin}
                className={isBuiltin ? "bg-slate-50 text-text-tertiary" : undefined}
                placeholder="/system/user"
                {...register("path")}
              />
            </Field>

            <Field
              label="组件路径"
              htmlFor="component"
              error={errors.component?.message}
              help={menuType === "LINK" ? "外链菜单可不填写组件路径。" : undefined}
            >
              <Input
                id="component"
                disabled={loading || menuType === "LINK"}
                readOnly={isBuiltin}
                className={isBuiltin ? "bg-slate-50 text-text-tertiary" : undefined}
                placeholder="system/user/index"
                {...register("component")}
              />
            </Field>

            <Field
              label="外链地址"
              htmlFor="externalUrl"
              required={menuType === "LINK"}
              error={errors.externalUrl?.message}
            >
              <div className="relative">
                <ExternalLink
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
                  aria-hidden
                />
                <Input
                  id="externalUrl"
                  disabled={loading || menuType !== "LINK"}
                  placeholder="https://example.com"
                  className="pl-9"
                  {...register("externalUrl")}
                />
              </div>
            </Field>

            <Field
              label="权限标识"
              htmlFor="permissionCode"
              error={errors.permissionCode?.message}
              help="非空时由后端校验唯一性。"
            >
              <Input
                id="permissionCode"
                disabled={loading}
                readOnly={isBuiltin}
                className={isBuiltin ? "bg-slate-50 text-text-tertiary" : undefined}
                placeholder="system:user:list"
                {...register("permissionCode")}
              />
            </Field>

            <Field
              label="图标标识"
              htmlFor="icon"
              error={errors.icon?.message}
              help="例如 setting、user、menu，未匹配时使用默认图标。"
            >
              <Input
                id="icon"
                disabled={loading}
                readOnly={isBuiltin}
                className={isBuiltin ? "bg-slate-50 text-text-tertiary" : undefined}
                placeholder="setting"
                {...register("icon")}
              />
            </Field>

            <Field label="可见性" htmlFor="visible" error={errors.visible?.message}>
              <Select id="visible" disabled={loading} {...register("visible")}>
                {visibleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
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
                placeholder="补充菜单用途或维护说明"
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
