import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import type { UserRecord } from "@/types";

type PasswordResultDialogProps = {
  result: { user: UserRecord; password: string } | null;
  onClose: () => void;
};

export function PasswordResultDialog({
  result,
  onClose,
}: PasswordResultDialogProps) {
  if (!result || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6">
      <section
        className="w-full max-w-[480px] rounded-admin border border-border bg-surface shadow-admin"
        role="dialog"
        aria-modal="true"
      >
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-text-primary">
            密码重置成功
          </h2>
          <p className="mt-1 text-sm text-text-tertiary">
            请将新密码线下通知用户「{result.user.nickname || result.user.username}」。
          </p>
        </header>
        <div className="px-5 py-4">
          <div className="rounded-lg border border-border bg-slate-50 px-4 py-3 font-mono text-lg font-semibold tabular-nums text-text-primary">
            {String(result.password)}
          </div>
        </div>
        <footer className="flex justify-end px-5 py-4">
          <Button variant="primary" onClick={onClose}>
            知道了
          </Button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
