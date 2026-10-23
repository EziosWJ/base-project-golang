import { useMemo, useState } from 'react';
import { Card, Input, Select, Space, Tag, Typography } from 'antd';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { DataTable, type DataTableColumns } from '../../components/DataTable/DataTable';

interface DemoRow {
  id: number;
  name: string;
  status: 'active' | 'paused';
  owner: string;
  updatedAt: string;
}

const DEMO_ROWS: DemoRow[] = Array.from({ length: 37 }, (_, index) => ({
  id: index + 1,
  name: `示例任务 ${String(index + 1).padStart(2, '0')}`,
  status: index % 3 === 0 ? 'paused' : 'active',
  owner: ['张伟', '李娜', '王强', '陈静'][index % 4],
  updatedAt: `2026-10-${String((index % 28) + 1).padStart(2, '0')} 10:00`,
}));

export default function ListDemoPage() {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(
    () =>
      DEMO_ROWS.filter((row) => {
        const matchesKeyword = !keyword || row.name.includes(keyword) || row.owner.includes(keyword);
        const matchesStatus = !status || row.status === status;
        return matchesKeyword && matchesStatus;
      }),
    [keyword, status],
  );

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: DataTableColumns<DemoRow> = [
    { title: '编号', dataIndex: 'id', width: 80 },
    { title: '名称', dataIndex: 'name' },
    { title: '负责人', dataIndex: 'owner', width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: DemoRow['status']) => (
        <Tag color={value === 'active' ? 'success' : 'default'}>
          {value === 'active' ? '进行中' : '已暂停'}
        </Tag>
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180 },
  ];

  return (
    <div>
      <PageHeader
        title="列表页 Demo"
        description="演示客户端筛选、分页、列设置与密度切换。示例数据仅保存在页面内，不代表真实业务。"
      />
      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            allowClear
            placeholder="搜索名称或负责人"
            style={{ width: 220 }}
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 130 }}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { value: 'active', label: '进行中' },
              { value: 'paused', label: '已暂停' },
            ]}
          />
          <Typography.Text type="secondary">共 {filtered.length} 条示例数据</Typography.Text>
        </Space>
        <DataTable<DemoRow>
          tableId="demo-list"
          tableLabel="示例任务列表"
          rowKey="id"
          columns={columns}
          dataSource={pageRows}
          pagination={{
            current: page,
            pageSize,
            total: filtered.length,
            onChange: (nextPage, nextSize) => {
              if (nextSize !== pageSize) {
                setPageSize(nextSize);
                setPage(1);
              } else {
                setPage(nextPage);
              }
            },
          }}
        />
      </Card>
    </div>
  );
}
