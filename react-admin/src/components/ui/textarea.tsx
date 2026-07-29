import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-24 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-tertiary hover:border-slate-300 focus:border-primary disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-text-tertiary",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
