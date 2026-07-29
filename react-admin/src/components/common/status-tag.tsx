import { cn } from "@/lib/utils";

type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

type StatusTagProps = {
  children: string;
  tone?: StatusTone;
};

const tones: Record<StatusTone, string> = {
  success: "border-green-100 bg-green-50 text-success",
  warning: "border-amber-100 bg-amber-50 text-warning",
  error: "border-red-100 bg-red-50 text-error",
  info: "border-cyan-100 bg-cyan-50 text-info",
  neutral: "border-slate-200 bg-slate-50 text-text-secondary",
};

export function StatusTag({ children, tone = "neutral" }: StatusTagProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

