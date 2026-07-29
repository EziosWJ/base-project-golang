import type { PropsWithChildren } from "react";

type FieldProps = PropsWithChildren<{
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  help?: string;
}>;

export function Field({
  label,
  htmlFor,
  required,
  error,
  help,
  children,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-text-primary"
      >
        {label}
        {required && <span className="ml-1 text-error">*</span>}
      </label>
      {children}
      <p className="min-h-[18px] text-xs text-text-tertiary">
        {error ? <span className="text-error">{error}</span> : help}
      </p>
    </div>
  );
}
