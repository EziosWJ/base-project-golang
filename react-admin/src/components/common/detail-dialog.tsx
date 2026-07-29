import { X } from "lucide-react";
import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

type DetailDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  loading?: boolean;
  onCancel: () => void;
  children: ReactNode;
};

export function DetailDialog({
  open,
  title,
  description,
  loading = false,
  onCancel,
  children,
}: DetailDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const hasDescription = description !== undefined && description !== null;

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <section
        className="max-h-[calc(100vh-48px)] w-full max-w-[860px] overflow-hidden rounded-admin border border-border bg-surface shadow-admin"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={hasDescription ? descriptionId : undefined}
        aria-busy={loading || undefined}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-base font-semibold text-text-primary"
            >
              {title}
            </h2>
            {hasDescription && (
              <div
                id={descriptionId}
                className="mt-1 text-[13px] text-text-tertiary"
              >
                {description}
              </div>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={onCancel}
            aria-label="关闭详情弹窗"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </header>

        <div className="max-h-[calc(100vh-150px)] overflow-y-auto px-5 py-5">
          {children}
        </div>
      </section>
    </div>,
    document.body,
  );
}
