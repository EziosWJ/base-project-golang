import { useState } from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, type DataTableColumns } from '../../src/components/DataTable/DataTable';
import { renderWithProviders } from '../testUtils';

interface Row {
  id: string;
  name: string;
  email: string;
}

const rows: Row[] = Array.from({ length: 12 }, (_, index) => ({
  id: `row-${index + 1}`,
  name: `成员 ${index + 1}`,
  email: `member${index + 1}@example.com`,
}));

const columns: DataTableColumns<Row> = [
  { title: '名称', dataIndex: 'name', key: 'name', sorter: true },
  { title: '邮箱', dataIndex: 'email', key: 'email' },
];

function Harness({
  onPageChange = vi.fn(),
  onSortChange = vi.fn(),
  initialSort,
}: {
  onPageChange?: (page: number, size: number) => void;
  onSortChange?: (field: string | undefined, order: 'asc' | 'desc' | undefined) => void;
  initialSort?: { field: string; order: 'asc' | 'desc' };
}) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <DataTable<Row>
      tableId="test-table"
      tableLabel="测试表格"
      rowKey="id"
      columns={columns}
      dataSource={rows}
      pagination={{ current: 1, pageSize: 10, total: rows.length, onChange: onPageChange }}
      rowSelection={{
        selectedRowKeys: selected,
        onChange: (keys) => setSelected(keys.map(String)),
      }}
      sortState={initialSort}
      onSortChange={onSortChange}
      batchActions={({ selectedRows, clear }) => (
        <button type="button" onClick={clear}>
          批量处理 {selectedRows.length}
        </button>
      )}
      toolbar={<span>工具栏</span>}
    />
  );
}

describe('DataTable', () => {
  it('renders rows, toolbar, total and three densities', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderWithProviders(<Harness />);

    expect(screen.getByText('工具栏')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '测试表格' })).toBeInTheDocument();
    expect(screen.getByText('成员 1')).toBeInTheDocument();
    expect(screen.getByText('共 12 条')).toBeInTheDocument();

    await user.click(screen.getByText('紧凑'));
    expect(container.querySelector('.ant-table-small')).not.toBeNull();

    await user.click(screen.getByText('宽松'));
    expect(container.querySelector('.ant-table-small')).toBeNull();
  });

  it('toggles column visibility', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<Harness />);

    expect(screen.getByRole('columnheader', { name: '邮箱' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /列设置/ }));
    await user.click(screen.getByRole('checkbox', { name: '邮箱' }));
    expect(screen.queryByRole('columnheader', { name: '邮箱' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '显示全部列' }));
    expect(screen.getByRole('columnheader', { name: '邮箱' })).toBeInTheDocument();
  });

  it('opens column settings from the keyboard and moves focus into the panel', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<Harness />);

    const trigger = screen.getByRole('button', { name: /列设置/ });
    trigger.focus();
    await user.keyboard('{Enter}');

    const panel = await screen.findByRole('dialog', { name: '显示列设置' });
    const nameToggle = within(panel).getByRole('checkbox', { name: '名称' });
    await waitFor(() => expect(nameToggle).toHaveFocus());
    await user.keyboard(' ');
    expect(screen.queryByRole('columnheader', { name: '名称' })).not.toBeInTheDocument();
  });

  it('supports row selection, batch actions and clearing', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<Harness />);

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    expect(screen.getByText(/已选择 1 项/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /批量处理 1/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /取消选择/ }));
    expect(screen.queryByText(/已选择 1 项/)).not.toBeInTheDocument();
  });

  it('switches between current-page and cross-page selection modes', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<Harness />);

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    expect(screen.getByText(/已选择 1 项（当前页）/)).toBeInTheDocument();
    await user.click(screen.getByText('跨分页'));
    expect(screen.getByText(/已选择 1 项（跨分页）/)).toBeInTheDocument();
  });

  it('reports sort changes and does not reset sorting on pagination', async () => {
    const onPageChange = vi.fn();
    const onSortChange = vi.fn();
    const { rerender } = renderWithProviders(
      <Harness onPageChange={onPageChange} onSortChange={onSortChange} />,
    );

    fireEvent.click(screen.getByRole('columnheader', { name: /名称/ }));
    expect(onSortChange).toHaveBeenCalledWith('name', 'asc');
    onSortChange.mockClear();

    rerender(<Harness onPageChange={onPageChange} onSortChange={onSortChange} initialSort={{ field: 'name', order: 'asc' }} />);
    const pageTwo = screen.getByRole('listitem', { name: '2' });
    fireEvent.click(within(pageTwo).getByText('2'));
    expect(onPageChange).toHaveBeenCalledWith(2, 10);
    expect(onSortChange).not.toHaveBeenCalled();
  });

  it('refreshes selected-row snapshots when the dataSource changes', async () => {
    const user = userEvent.setup({ delay: null });
    const onRename = vi.fn();

    function EditableHarness() {
      const [data, setData] = useState(rows);
      const [selected, setSelected] = useState<string[]>([]);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setData((current) =>
                current.map((row) => (row.id === 'row-1' ? { ...row, name: '更新后的名称' } : row)),
              );
              onRename();
            }}
          >
            更新首行
          </button>
          <DataTable<Row>
            tableId="editable-table"
            tableLabel="可更新表格"
            rowKey="id"
            columns={columns}
            dataSource={data}
            pagination={{ current: 1, pageSize: 10, total: data.length, onChange: vi.fn() }}
            rowSelection={{ selectedRowKeys: selected, onChange: (keys) => setSelected(keys.map(String)) }}
            batchActions={({ selectedRows }) => (
              <span>已选名称：{selectedRows[0]?.name ?? '无'}</span>
            )}
          />
        </>
      );
    }

    renderWithProviders(<EditableHarness />);
    await user.click(screen.getAllByRole('checkbox')[1]);
    expect(screen.getByText('已选名称：成员 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '更新首行' }));
    expect(screen.getByText('已选名称：更新后的名称')).toBeInTheDocument();
    expect(onRename).toHaveBeenCalled();
  });

  it('renders error and retry states instead of the table', async () => {
    const user = userEvent.setup({ delay: null });
    const onRetry = vi.fn();
    renderWithProviders(
      <DataTable<Row>
        tableId="error-table"
        tableLabel="错误表格"
        rowKey="id"
        columns={columns}
        dataSource={[]}
        error={new Error('服务器错误')}
        onRetry={onRetry}
        pagination={{ current: 1, pageSize: 10, total: 0, onChange: vi.fn() }}
      />,
    );

    expect(screen.getByText('服务器错误')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '错误表格' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /重新加载/ }));
    expect(onRetry).toHaveBeenCalled();
  });
});
