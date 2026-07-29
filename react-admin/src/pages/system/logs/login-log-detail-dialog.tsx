import { X } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { StatusTag } from "@/components/common/status-tag";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/datetime";
import type { LoginLogRecord } from "@/types";
import { getStatusMeta } from "./utils";

type LoginLogDetailDialogProps = {
  open: boolean;
  detail: LoginLogRecord | null;
  loading: boolean;
  onCancel: () => void;
};

export function LoginLogDetailDialog({
  open,
  detail,
  loading,
  onCancel,
}: LoginLogDetailDialogProps) {
  if (!open || typeof document === "undefined") return null;

  const statusMeta = getStatusMeta(detail?.loginStatus ?? "");

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6">
      <section
        className="w-full max-w-[720px] overflow-hidden rounded-admin border border-border bg-surface shadow-admin"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-log-detail-title"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2
              id="login-log-detail-title"
              className="text-base font-semibold text-text-primary"
            >
              登录日志详情
            </h2>
            <p className="mt-1 text-[13px] text-text-tertiary">
              {loading ? "详情加载中" : `记录 ID：${detail?.id ?? "-"}`}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={onCancel}
            aria-label="关闭登录日志详情"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </header>
        <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
          <DetailItem label="用户名" value={detail?.username} />
          <DetailItem
            label="登录状态"
            value={<StatusTag tone={statusMeta.tone}>{statusMeta.label}</StatusTag>}
          />
          <DetailItem label="登录 IP" value={detail?.loginIp} />
          <DetailItem label="浏览器" value={detail?.browser} />
          <DetailItem label="操作系统" value={detail?.os} />
          <DetailItem
            label="登录时间"
            value={
              <span className="whitespace-nowrap tabular-nums">
                {formatDateTime(detail?.loginTime)}
              </span>
            }
          />
          <DetailItem
            label="消息"
            value={detail?.message}
            className="md:col-span-2"
          />
        </div>
      </section>
    </div>,
    document.body,
  );
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string;
  value?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[13px] text-text-tertiary">{label}</div>
      <div className="mt-1 break-words text-sm text-text-primary">
        {value || "-"}
      </div>
    </div>
  );
}
