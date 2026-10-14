import { useState } from "react";
import { createRoot } from "react-dom/client";
import { DetailDialog } from "@/components/common/detail-dialog";
import { FormDialog } from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import "@/styles/globals.css";

type FixtureName = "detail" | "form" | "document-detail" | "document-form" | "loading-form";

export function DocumentDialogFixture() {
  const [open, setOpen] = useState<FixtureName | null>(null);
  const close = () => setOpen(null);

  return (
    <>
      <Button data-testid="open-detail" onClick={() => setOpen("detail")}>普通详情</Button>
      <Button data-testid="open-form" onClick={() => setOpen("form")}>普通表单</Button>
      <Button data-testid="open-document-detail" onClick={() => setOpen("document-detail")}>单据详情</Button>
      <Button data-testid="open-document-form" onClick={() => setOpen("document-form")}>单据确认</Button>
      <Button data-testid="open-loading-form" onClick={() => setOpen("loading-form")}>提交中的表单</Button>

      {/* 未启用单据布局：尺寸与关闭策略必须与既有调用一致。 */}
      <DetailDialog open={open === "detail"} title="普通详情弹窗" onCancel={close}>
        <p data-testid="plain-detail-content">普通详情内容</p>
      </DetailDialog>

      <FormDialog open={open === "form"} title="普通表单弹窗" onCancel={close} onSubmit={close}>
        <input aria-label="普通字段" />
      </FormDialog>

      <FormDialog open={open === "loading-form"} title="提交中的表单弹窗" loading onCancel={close} onSubmit={close}>
        <input aria-label="提交中的字段" />
      </FormDialog>

      {/* 启用单据布局：固定头尾、正文独立滚动、折叠区可键盘到达。 */}
      <DetailDialog
        documentLayout
        fixedFooter
        open={open === "document-detail"}
        title="单据详情弹窗"
        onCancel={close}
        footer={<Button data-testid="document-detail-close" onClick={close}>关闭</Button>}
      >
        <details data-testid="document-disclosure">
          <summary>折叠辅助信息</summary>
          <p>折叠内容</p>
        </details>
        <div style={{ height: 1600 }} data-testid="document-detail-tall">长内容</div>
      </DetailDialog>

      <FormDialog documentLayout open={open === "document-form"} title="单据确认弹窗" onCancel={close} onSubmit={close}>
        <div style={{ height: 1600 }}>长内容</div>
      </FormDialog>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<DocumentDialogFixture />);
