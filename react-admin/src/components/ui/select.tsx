import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition-colors hover:border-slate-300 focus:border-primary disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-text-tertiary",
          className,
        )}
        {...props}
      />
    );
  },
);

Select.displayName = "Select";
