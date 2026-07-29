import type { ReactNode } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "@/types";

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  dataSource: T[];
  rowKey: keyof T | ((record: T) => string | number);
  loading?: boolean;
  error?: ReactNode;
  empty?: ReactNode;
  minWidth?: number;
  className?: string;
  onRowClick?: (record: T) => void;
  rowClassName?: (record: T, index: number) => string | undefined;
};

function getRowKey<T>(
  rowKey: DataTableProps<T>["rowKey"],
  record: T,
): string | number {
  if (typeof rowKey === "function") {
    return rowKey(record);
  }

  return String(record[rowKey]);
}

function getColumnKey<T>(column: DataTableColumn<T>, index: number) {
  return column.key ?? String(column.dataIndex ?? index);
}

export function DataTable<T>({
  columns,
  dataSource,
  rowKey,
  loading = false,
  error,
  empty,
  minWidth = 840,
  className,
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-3 p-5" aria-busy="true" aria-live="polite">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-11 animate-pulse rounded-lg bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5">
        {typeof error === "string" ? (
          <EmptyState title="加载失败" description={error} />
        ) : (
          error
        )}
      </div>
    );
  }

  if (dataSource.length === 0) {
    return (
      <div className="p-5">
        {empty ?? (
          <EmptyState
            title="暂无数据"
            description="当前没有可展示的数据。"
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table
        className="w-full border-separate border-spacing-0 text-left"
        style={{ minWidth }}
      >
        <thead>
          <tr className="bg-slate-50 text-sm text-text-secondary">
            {columns.map((column, index) => (
              <th
                key={getColumnKey(column, index)}
                className={cn(
                  "border-b border-border px-5 py-3 font-medium",
                  column.align === "center" && "text-center",
                  column.align === "right" && "text-right",
                )}
                style={{ width: column.width }}
                scope="col"
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataSource.map((record, rowIndex) => (
            <tr
              key={getRowKey(rowKey, record)}
              className={cn(
                "transition-colors",
                onRowClick && "cursor-pointer hover:bg-slate-50",
                rowClassName?.(record, rowIndex),
              )}
              onClick={(event) => {
                if (!onRowClick) return;

                const target = event.target as HTMLElement | null;
                if (target?.closest("button, a, input, textarea, select, label")) {
                  return;
                }

                onRowClick(record);
              }}
            >
              {columns.map((column, columnIndex) => {
                const value = column.dataIndex
                  ? record[column.dataIndex]
                  : undefined;

                return (
                  <td
                    key={getColumnKey(column, columnIndex)}
                    className={cn(
                      "border-b border-border px-5 py-3 align-middle",
                      column.align === "center" && "text-center",
                      column.align === "right" && "text-right",
                    )}
                  >
                    {column.render
                      ? column.render(value, record, rowIndex)
                      : String(value ?? "")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
