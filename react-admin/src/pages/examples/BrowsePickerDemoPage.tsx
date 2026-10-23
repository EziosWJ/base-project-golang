import { useMemo, useState } from 'react';
import { Button, Card, Input, Modal, Space, Table, Tag, Typography, type TableColumnsType } from 'antd';
import { PageHeader } from '../../components/PageHeader/PageHeader';

interface OptionRow {
  id: number;
  name: string;
  category: string;
  enabled: boolean;
}

const OPTIONS: OptionRow[] = Array.from({ length: 18 }, (_, index) => ({
  id: index + 1,
  name: `可选资源 ${String(index + 1).padStart(2, '0')}`,
  category: ['合同', '项目', '客户'][index % 3],
  enabled: index % 4 !== 0,
}));

export default function BrowsePickerDemoPage() {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<OptionRow[]>([]);

  const filtered = useMemo(
    () => OPTIONS.filter((item) => item.name.includes(keyword) || item.category.includes(keyword)),
    [keyword],
  );

  const columns: TableColumnsType<OptionRow> = [
    { title: '名称', dataIndex: 'name' },
    { title: '分类', dataIndex: 'category', width: 100 },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 90,
      render: (value: boolean) => (
        <Tag color={value ? 'success' : 'default'}>{value ? '可用' : '停用'}</Tag>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="浏览选择 Demo"
        description="演示在弹窗中搜索、浏览并选择多条记录。示例数据仅用于界面演示。"
        extra={
          <Button type="primary" onClick={() => setOpen(true)}>
            浏览选择
          </Button>
        }
      />
      <Card title="已选择">
        {selected.length === 0 ? (
          <Typography.Text type="secondary">尚未选择任何资源。</Typography.Text>
        ) : (
          <Space wrap>
            {selected.map((item) => (
              <Tag
                key={item.id}
                closable
                onClose={() => setSelected((current) => current.filter((row) => row.id !== item.id))}
              >
                {item.name}
              </Tag>
            ))}
          </Space>
        )}
      </Card>

      <Modal
        open={open}
        title="选择资源"
        width={680}
        okText="确定选择"
        cancelText="取消"
        onCancel={() => setOpen(false)}
        onOk={() => {
          setOpen(false);
        }}
        destroyOnHidden
      >
        <Input.Search
          allowClear
          placeholder="搜索名称或分类"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          style={{ marginBottom: 12 }}
        />
        <Table<OptionRow>
          size="small"
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 6, showSizeChanger: false }}
          rowSelection={{
            selectedRowKeys: selected.map((item) => item.id),
            onChange: (keys, rows) =>
              setSelected(rows.filter((row) => keys.includes(row.id))),
          }}
        />
        <Typography.Text type="secondary">
          已选择 {selected.length} 项；关闭弹窗后选择仍保留在页面中。
        </Typography.Text>
      </Modal>
    </div>
  );
}
