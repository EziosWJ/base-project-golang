import { X } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { StatusTag } from "@/components/common/status-tag";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/datetime";
import type { OperLogDetail } from "@/types";
import {
  getDetailSummary,
  getOperationTypeLabel,
  getStatusMeta,
} from "./utils";

type OperLogDetailDialogProps = {
  open: boolean;
  detail: OperLogDetail | null;
  loading: boolean;
  onCancel: () => void;
};

export function OperLogDetailDialog({
  open,
  detail,
  loading,
  onCancel,
}: OperLogDetailDialogProps) {
  if (!open || typeof document === "undefined") return null;

  const statusMeta = getStatusMeta(detail?.operationStatus ?? "");
  const requestSummary = getDetailSummary(detail, "requestParams");
  const responseSummary = getDetailSummary(detail, "responseResult");

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6">
      <section
        className="max-h-[calc(100vh-48px)] w-full max-w-[860px] overflow-hidden rounded-admin border border-border bg-surface shadow-admin"
        role="dialog"
        aria-modal="true"
        aria-labelledby="oper-log-detail-title"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2
              id="oper-log-detail-title"
              className="text-base font-semibold text-text-primary"
            >
              操作日志详情
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
            aria-label="关闭操作日志详情"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </header>
        <div className="max-h-[calc(100vh-150px)] overflow-y-auto px-5 py-5">
          <div className="grid gap-4 md:grid-cols-3">
            <DetailItem label="模块" value={detail?.moduleName} />
            <DetailItem
              label="操作类型"
              value={getOperationTypeLabel(detail?.operationType ?? "")}
            />
            <DetailItem
              label="操作状态"
              value={<StatusTag tone={statusMeta.tone}>{statusMeta.label}</StatusTag>}
            />
            <DetailItem label="请求方法" value={detail?.requestMethod} />
            <DetailItem
              label="请求地址"
              value={detail?.requestUrl}
              className="md:col-span-2"
            />
            <DetailItem label="操作人" value={detail?.operatorName} />
            <DetailItem label="操作 IP" value={detail?.operatorIp} />
            <DetailItem label="耗时" value={`${detail?.costTime ?? 0} ms`} />
            <DetailItem
              label="操作时间"
              value={
                <span className="whitespace-nowrap tabular-nums">
                  {formatDateTime(detail?.operationTime)}
                </span>
              }
            />
            <DetailItem
              label="异常信息"
              value={detail?.errorMessage}
              className="md:col-span-2"
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <SummaryBlock title="请求参数摘要" value={requestSummary} />
            <SummaryBlock title="响应结果摘要" value={responseSummary} />
          </div>
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

function SummaryBlock({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <div className="text-[13px] text-text-tertiary">{title}</div>
      <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-border bg-slate-50 p-3 text-[13px] leading-5 text-text-secondary">
        {value}
      </pre>
    </div>
  );
}
