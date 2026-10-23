import { useState } from 'react';
import {
  App,
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Typography,
  type TableColumnsType,
} from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader/PageHeader';

interface DocumentLine {
  key: string;
  name: string;
  quantity: number;
  price: number;
}

export default function DocumentDialogDemoPage() {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<DocumentLine[]>([
    { key: '1', name: '服务器托管', quantity: 1, price: 3200 },
    { key: '2', name: '技术支持', quantity: 2, price: 800 },
  ]);

  const total = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);

  const update = (key: string, patch: Partial<DocumentLine>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const columns: TableColumnsType<DocumentLine> = [
    {
      title: '项目',
      dataIndex: 'name',
      render: (value: string, record) => (
        <Input value={value} onChange={(event) => update(record.key, { name: event.target.value })} />
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 110,
      render: (value: number, record) => (
        <InputNumber
          min={1}
          value={value}
          onChange={(next) => update(record.key, { quantity: Number(next ?? 1) })}
        />
      ),
    },
    {
      title: '单价',
      dataIndex: 'price',
      width: 140,
      render: (value: number, record) => (
        <InputNumber
          min={0}
          value={value}
          onChange={(next) => update(record.key, { price: Number(next ?? 0) })}
          addonAfter="元"
        />
      ),
    },
    {
      title: '小计',
      key: 'subtotal',
      width: 120,
      render: (_, record) => `￥ ${(record.quantity * record.price).toFixed(2)}`,
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, record) => (
        <Button
          type="text"
          danger
          aria-label="删除明细"
          icon={<Trash2 size={14} />}
          onClick={() => setLines((current) => current.filter((line) => line.key !== record.key))}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="单据弹窗 Demo"
        description="演示弹窗内编辑明细行、增删行与合计。示例数据仅用于界面演示。"
        extra={
          <Button type="primary" onClick={() => setOpen(true)}>
            打开单据
          </Button>
        }
      />
      <Card>
        <Typography.Text type="secondary">
          当前示例单据共 {lines.length} 行，合计 ￥ {total.toFixed(2)}。点击右上角按钮打开编辑弹窗。
        </Typography.Text>
      </Card>

      <Modal
        open={open}
        title="单据明细"
        width={820}
        onCancel={() => setOpen(false)}
        onOk={() => {
          setOpen(false);
          message.success('单据已保存（示例交互，未提交后端）');
        }}
        okText="保存"
        destroyOnHidden
      >
        <Table<DocumentLine>
          size="small"
          rowKey="key"
          columns={columns}
          dataSource={lines}
          pagination={false}
        />
        <Space style={{ marginTop: 12, width: '100%', justifyContent: 'space-between' }}>
          <Button
            icon={<Plus size={14} />}
            onClick={() =>
              setLines((current) => [
                ...current,
                { key: String(Date.now()), name: '', quantity: 1, price: 0 },
              ])
            }
          >
            添加明细
          </Button>
          <Typography.Text strong>合计：￥ {total.toFixed(2)}</Typography.Text>
        </Space>
      </Modal>
    </div>
  );
}
