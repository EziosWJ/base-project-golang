import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-primary bg-primary text-white hover:bg-primary-hover active:bg-primary-hover disabled:border-primary/50 disabled:bg-primary/50",
  secondary:
    "border-border bg-surface text-text-primary hover:bg-slate-50 active:bg-slate-100 disabled:text-text-tertiary",
  ghost:
    "border-transparent bg-transparent text-text-secondary hover:bg-slate-100 hover:text-text-primary active:bg-slate-200 disabled:text-text-tertiary",
  danger:
    "border-error bg-error text-white hover:bg-red-700 active:bg-red-800 disabled:border-error/50 disabled:bg-error/50",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-[13px]",
  md: "h-9 gap-2 px-4 text-sm",
  lg: "h-10 gap-2 px-5 text-sm",
  icon: "h-9 w-9 p-0",
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border font-medium transition-colors disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

