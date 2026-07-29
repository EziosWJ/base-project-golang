import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-tertiary hover:border-slate-300 focus:border-primary disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-text-tertiary",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
