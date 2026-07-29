import type { PropsWithChildren, ReactNode } from "react";
import { ContentCard } from "@/components/common/content-card";
import { cn } from "@/lib/utils";

type SearchFilterBarProps = PropsWithChildren<{
  actions?: ReactNode;
  className?: string;
}>;

export function SearchFilterBar({
  actions,
  className,
  children,
}: SearchFilterBarProps) {
  return (
    <ContentCard className={cn("mb-4", className)} bodyClassName="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-[minmax(240px,1fr)_180px]">
          {children}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </ContentCard>
  );
}

