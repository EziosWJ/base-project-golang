import { Download, X } from "lucide-react";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { getFileViewUrl } from "@/api/file";
import { Button } from "@/components/ui/button";
import type { FileRecord } from "@/types";

type FilePreviewDialogProps = {
  open: boolean;
  record: FileRecord | null;
  onCancel: () => void;
  onDownload: (record: FileRecord) => void;
};

export function FilePreviewDialog({
  open,
  record,
  onCancel,
  onDownload,
}: FilePreviewDialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, open]);

  if (!open || !record || typeof document === "undefined") return null;

  const isImage = record.mimeType.startsWith("image/");
  const isPdf = record.mimeType === "application/pdf";
  const previewUrl = getFileViewUrl(record.id);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <section
        className="flex max-h-[calc(100vh-48px)] w-full max-w-[960px] flex-col overflow-hidden rounded-admin border border-border bg-surface shadow-admin"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
          <h2
            id={titleId}
            className="min-w-0 flex-1 truncate text-base font-semibold text-text-primary"
          >
            {record.originalName}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onDownload(record)}
            >
              <Download className="h-4 w-4" aria-hidden />
              下载
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={onCancel}
              aria-label="关闭预览"
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-100 p-4">
          {isImage && previewUrl && (
            <img
              src={previewUrl}
              alt={record.originalName}
              className="max-h-full max-w-full object-contain"
            />
          )}
          {isPdf && previewUrl && (
            <iframe
              src={previewUrl}
              title={record.originalName}
              className="h-full w-full border-0"
            />
          )}
          {!isImage && !isPdf && (
            <div className="py-12 text-center text-sm text-text-tertiary">
              此文件类型不支持浏览器预览，请下载后查看。
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
