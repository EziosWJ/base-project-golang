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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(0,240px))] [&>*]:min-w-0 [&>form>*]:min-w-0">
          {children}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
      </div>
    </ContentCard>
  );
}
