import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ContentCardProps = PropsWithChildren<{
  title?: string;
  description?: string;
  extra?: ReactNode;
  className?: string;
  bodyClassName?: string;
}>;

export function ContentCard({
  title,
  description,
  extra,
  className,
  bodyClassName,
  children,
}: ContentCardProps) {
  return (
    <section
      className={cn(
        "rounded-admin border border-border bg-surface shadow-admin",
        className,
      )}
    >
      {(title || description || extra) && (
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && (
              <p className="mt-1 text-[13px] text-text-tertiary">
                {description}
              </p>
            )}
          </div>
          {extra}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

