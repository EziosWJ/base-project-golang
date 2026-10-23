import { useCallback, useEffect, useMemo, useRef, useState, type Key, type ReactNode } from 'react';
import {
  Button,
  Checkbox,
  Popover,
  Segmented,
  Space,
  Table,
  Typography,
  type TableColumnsType,
  type TableProps,
} from 'antd';
import { Columns3, X } from 'lucide-react';
import { PAGE_SIZE_OPTIONS } from '../../config/options';
import { copy } from '../../config/copy';
import { EmptyState, ErrorState } from '../AsyncState/AsyncState';
import styles from './DataTable.module.css';

export type DataTableColumn<T> = NonNullable<TableColumnsType<T>[number]> & {
  /** Kept visible in the column visibility panel, e.g. the actions column. */
  hideInSettings?: boolean;
};

export type DataTableColumns<T> = DataTableColumn<T>[];

export interface DataTableSelection<T> {
  selectedRowKeys: Key[];
  onChange: (keys: Key[], rows: T[]) => void;
  /** Set by DataTable while pruning page-scoped selections. */
  mode?: 'page' | 'all';
}

export interface DataTableBatchContext<T> {
  selectedRows: T[];
  selectedRowKeys: Key[];
  clear: () => void;
}

export interface DataTablePagination {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
}

export interface DataTableProps<T extends object> {
  tableId: string;
  tableLabel: string;
  rowKey: keyof T | ((record: T) => Key);
  columns: DataTableColumns<T>;
  dataSource: T[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  pagination: DataTablePagination;
  rowSelection?: DataTableSelection<T>;
  batchActions?: (context: DataTableBatchContext<T>) => ReactNode;
  toolbar?: ReactNode;
  sortState?: { field?: string; order?: 'asc' | 'desc' };
  onSortChange?: (field: string | undefined, order: 'asc' | 'desc' | undefined) => void;
  defaultDensity?: 'large' | 'middle' | 'small';
  defaultSelectionMode?: 'page' | 'all';
  scrollX?: number | string;
}

function columnKey<T>(column: DataTableColumn<T>): string | undefined {
  if (column.key !== undefined) return String(column.key);
  const dataIndex = (column as { dataIndex?: unknown }).dataIndex;
  if (Array.isArray(dataIndex)) return dataIndex.join('.');
  if (typeof dataIndex === 'string') return dataIndex;
  return undefined;
}

function columnLabel<T>(column: DataTableColumn<T>): string {
  const title = (column as { title?: ReactNode }).title;
  if (typeof title === 'string' || typeof title === 'number') return String(title);
  return columnKey(column) ?? copy.table.unnamedColumn;
}

export function DataTable<T extends object>({
  tableId,
  tableLabel,
  rowKey,
  columns,
  dataSource,
  loading,
  error,
  onRetry,
  emptyTitle = copy.common.noData,
  emptyDescription,
  emptyAction,
  pagination,
  rowSelection,
  batchActions,
  toolbar,
  sortState,
  onSortChange,
  defaultDensity = 'middle',
  defaultSelectionMode = 'page',
  scrollX = 'max-content',
}: DataTableProps<T>) {
  const [density, setDensity] = useState(defaultDensity);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnPanelRef = useRef<HTMLDivElement>(null);
  const [selectionMode, setSelectionMode] = useState<'page' | 'all'>(defaultSelectionMode);
  const recordCache = useRef(new Map<Key, T>());

  const focusFirstColumnToggle = () => {
    columnPanelRef.current?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.focus();
  };

  const getRowKey = useCallback(
    (record: T): Key => (typeof rowKey === 'function' ? rowKey(record) : (record[rowKey] as Key)),
    [rowKey],
  );

  const toggleableColumns = useMemo(
    () =>
      columns
        .map((column) => ({ column, key: columnKey(column) }))
        .filter((entry): entry is { column: DataTableColumn<T>; key: string } => Boolean(entry.key))
        .filter((entry) => !entry.column.hideInSettings),
    [columns],
  );

  const visibleColumns = useMemo(() => {
    return columns
      .filter((column) => {
        const key = columnKey(column);
        return !key || !hiddenKeys.has(key);
      })
      .map((column) => {
        const key = columnKey(column);
        if (!sortState || !key) return column;
        const sortOrder =
          sortState.field === key ? (sortState.order === 'asc' ? 'ascend' : 'descend') : null;
        return { ...column, sortOrder } as DataTableColumn<T>;
      });
  }, [columns, hiddenKeys, sortState]);

  const selectedKeys = useMemo(
    () => rowSelection?.selectedRowKeys ?? [],
    [rowSelection?.selectedRowKeys],
  );

  const selectedRows = useMemo(() => {
    // Prefer the freshest row visible in the current dataSource; fall back to
    // the cache for rows selected on other pages (cross-page selection).
    const visible = new Map<Key, T>(dataSource.map((row) => [getRowKey(row), row]));
    return selectedKeys
      .map((key) => visible.get(key) ?? recordCache.current.get(key))
      .filter((row): row is T => Boolean(row));
  }, [dataSource, getRowKey, selectedKeys]);

  const clearSelection = useCallback(() => {
    recordCache.current.clear();
    rowSelection?.onChange([], []);
  }, [rowSelection]);

  const syncSelection = useCallback(
    (keys: Key[], rows: T[]) => {
      if (!rowSelection) return;
      for (const row of rows) recordCache.current.set(getRowKey(row), row);
      const keySet = new Set(keys);
      for (const key of [...recordCache.current.keys()]) {
        if (!keySet.has(key)) recordCache.current.delete(key);
      }
      rowSelection.onChange(keys, Array.from(recordCache.current.values()));
    },
    [getRowKey, rowSelection],
  );

  // Page-scoped selection must drop rows that leave the current page.
  useEffect(() => {
    if (!rowSelection || selectionMode !== 'page' || selectedKeys.length === 0) return;
    const visibleKeys = new Set(dataSource.map(getRowKey));
    const kept = selectedKeys.filter((key) => visibleKeys.has(key));
    if (kept.length !== selectedKeys.length) {
      for (const key of [...recordCache.current.keys()]) {
        if (!kept.includes(key)) recordCache.current.delete(key);
      }
      rowSelection.onChange(kept, Array.from(recordCache.current.values()));
    }
  }, [dataSource, getRowKey, rowSelection, selectedKeys, selectionMode]);

  const changeSelectionMode = (mode: 'page' | 'all') => {
    setSelectionMode(mode);
    if (!rowSelection) return;
    if (mode === 'page') {
      const pageKeys = new Set(dataSource.map(getRowKey));
      const kept = rowSelection.selectedRowKeys.filter((key) => pageKeys.has(key));
      for (const key of [...recordCache.current.keys()]) {
        if (!kept.includes(key)) recordCache.current.delete(key);
      }
      rowSelection.onChange(kept, Array.from(recordCache.current.values()));
    }
  };

  const handleTableChange: TableProps<T>['onChange'] = (nextPagination, _filters, sorter) => {
    let sortChanged = false;
    if (onSortChange && !Array.isArray(sorter)) {
      const field = sorter.field ? String(Array.isArray(sorter.field) ? sorter.field.join('.') : sorter.field) : undefined;
      const order =
        sorter.order === 'ascend' ? 'asc' : sorter.order === 'descend' ? 'desc' : undefined;
      // Ant Design reports the current sorter on pagination too; only propagate real changes.
      sortChanged = field !== sortState?.field || order !== sortState?.order;
      if (sortChanged) onSortChange(field, order);
    }
    // Sorting resets to page 1 through onSortChange; emitting pagination too
    // would race two URL updates in the same event.
    if (!sortChanged && nextPagination.current && nextPagination.pageSize) {
      pagination.onChange(nextPagination.current, nextPagination.pageSize);
    }
  };

  const tableRowSelection: TableProps<T>['rowSelection'] | undefined = rowSelection
    ? {
        type: 'checkbox',
        selectedRowKeys: selectedKeys,
        preserveSelectedRowKeys: selectionMode === 'all',
        onChange: (keys, rows) => syncSelection(keys, rows),
        columnWidth: 48,
      }
    : undefined;

  const columnPanel = (
    <div
      className={styles.columnPanel}
      role="dialog"
      aria-label={copy.table.columnPanel}
      ref={columnPanelRef}
    >
      {toggleableColumns.length === 0 ? (
        <Typography.Text type="secondary">{copy.table.noConfigurableColumns}</Typography.Text>
      ) : (
        toggleableColumns.map(({ column, key }) => (
          <Checkbox
            key={key}
            checked={!hiddenKeys.has(key)}
            onChange={(event) => {
              setHiddenKeys((current) => {
                const next = new Set(current);
                if (event.target.checked) next.delete(key);
                else next.add(key);
                return next;
              });
            }}
          >
            {columnLabel(column)}
          </Checkbox>
        ))
      )}
      <Button
        type="link"
        size="small"
        onClick={() => setHiddenKeys(new Set())}
        disabled={hiddenKeys.size === 0}
      >
        {copy.table.showAllColumns}
      </Button>
    </div>
  );

  return (
    <div className={styles.wrapper} data-table-id={tableId}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>{toolbar}</div>
        <Space size={4} wrap className={styles.toolbarControls}>
          <Segmented
            size="small"
            aria-label={copy.table.density}
            value={density}
            onChange={(value) => setDensity(value as typeof density)}
            options={[
              { label: copy.table.densityLoose, value: 'large' },
              { label: copy.table.densityStandard, value: 'middle' },
              { label: copy.table.densityCompact, value: 'small' },
            ]}
          />
          <Popover
            content={columnPanel}
            title={copy.table.showColumns}
            trigger="click"
            placement="bottomRight"
            open={columnsOpen}
            onOpenChange={setColumnsOpen}
            afterOpenChange={(open) => {
              if (open) window.setTimeout(focusFirstColumnToggle, 0);
            }}
          >
            <Button
              size="small"
              icon={<Columns3 size={15} />}
              aria-haspopup="dialog"
              aria-expanded={columnsOpen}
            >
              {copy.table.columnSettings}
            </Button>
          </Popover>
        </Space>
      </div>

      {selectedKeys.length > 0 && (
        <div className={styles.batchBar} role="status" aria-live="polite">
          <Space size={12} wrap>
            <Typography.Text strong>
              {copy.common.selectedCount(selectedKeys.length)}
              {selectionMode === 'all' ? copy.table.selectedScopeAll : copy.table.selectedScopePage}
            </Typography.Text>
            <Segmented
              size="small"
              aria-label={copy.table.selectionScope}
              value={selectionMode}
              onChange={(value) => changeSelectionMode(value as 'page' | 'all')}
              options={[
                { label: copy.table.selectedPage, value: 'page' },
                { label: copy.table.selectedAll, value: 'all' },
              ]}
            />
            {batchActions?.({
              selectedRows,
              selectedRowKeys: selectedKeys,
              clear: clearSelection,
            })}
          </Space>
          <Button type="link" size="small" icon={<X size={14} />} onClick={clearSelection}>
            {copy.table.clearSelection}
          </Button>
        </div>
      )}

      {error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : (
        <div role="region" aria-label={tableLabel} className={styles.tableRegion}>
          <Table<T>
            rowKey={(record) => getRowKey(record)}
            columns={visibleColumns as TableColumnsType<T>}
            dataSource={dataSource}
            loading={loading}
            size={density}
            onChange={handleTableChange}
            rowSelection={tableRowSelection}
            scroll={{ x: scrollX }}
            locale={{
              emptyText: (
                <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
              ),
            }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
              showTotal: (total) => copy.table.total(total),
              responsive: true,
            }}
          />
        </div>
      )}
    </div>
  );
}

