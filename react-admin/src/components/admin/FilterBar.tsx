import type { FormEvent, ReactNode } from 'react';
import { Button, Space } from 'antd';
import { RotateCcw, Search } from 'lucide-react';

export interface FilterBarProps {
  children: ReactNode;
  onSearch: () => void;
  onReset: () => void;
  loading?: boolean;
  actions?: ReactNode;
  summary?: ReactNode;
}

/** Shared filter toolbar: Enter or 查询 submits, 重置 restores the URL state. */
export function FilterBar({ children, onSearch, onReset, loading, actions, summary }: FilterBarProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch();
  };

  return (
    <div className="admin-filter-bar">
      <form onSubmit={submit} style={{ display: 'contents' }}>
        <Space wrap size={8}>
          {children}
          <Button type="primary" htmlType="submit" loading={loading} icon={<Search size={15} />}>
            查询
          </Button>
          <Button onClick={onReset} icon={<RotateCcw size={15} />}>
            重置
          </Button>
        </Space>
        {actions && <Space wrap>{actions}</Space>}
      </form>
      {summary && <div style={{ flexBasis: '100%' }}>{summary}</div>}
    </div>
  );
}
