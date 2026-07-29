import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FormDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  loading?: boolean;
  submitText?: string;
  cancelText?: string;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
  children: ReactNode;
};

export function FormDialog({
  open,
  title,
  description,
  loading = false,
  submitText = "保存",
  cancelText = "取消",
  onCancel,
  onSubmit,
  children,
}: FormDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onCancel();
        return;
      }

      if (event.key === "Tab" && containerRef.current) {
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [loading, onCancel, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!loading) {
      void onSubmit();
    }
  };

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <section
        className="max-h-[calc(100vh-48px)] w-full max-w-[760px] overflow-hidden rounded-admin border border-border bg-surface shadow-admin"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-base font-semibold text-text-primary"
            >
              {title}
            </h2>
            {description && (
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
            disabled={loading}
            onClick={onCancel}
            aria-label="关闭表单弹窗"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[calc(100vh-184px)] overflow-y-auto px-5 py-4">
            {children}
          </div>
          <footer className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <Button variant="secondary" disabled={loading} onClick={onCancel}>
              {cancelText}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className={cn(loading && "cursor-wait")}
            >
              {loading ? "提交中..." : submitText}
            </Button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
