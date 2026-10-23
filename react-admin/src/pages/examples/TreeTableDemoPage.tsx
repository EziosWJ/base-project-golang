import { useMemo, useState } from 'react';
import { Card, Col, Row, Table, Tree, Typography, type TableColumnsType, type TreeDataNode } from 'antd';
import { PageHeader } from '../../components/PageHeader/PageHeader';

interface DeptRow {
  id: number;
  name: string;
  leader: string;
  headcount: number;
  parent: string;
}

const ROWS: DeptRow[] = [
  { id: 1, name: '前端组', leader: '张伟', headcount: 12, parent: '产品研发' },
  { id: 2, name: '后端组', leader: '李娜', headcount: 16, parent: '产品研发' },
  { id: 3, name: '测试组', leader: '王强', headcount: 8, parent: '产品研发' },
  { id: 4, name: '销售部', leader: '陈静', headcount: 22, parent: '业务部门' },
  { id: 5, name: '客户成功', leader: '刘洋', headcount: 10, parent: '业务部门' },
  { id: 6, name: '财务部', leader: '赵敏', headcount: 6, parent: '财务' },
];

const TREE: TreeDataNode[] = [
  {
    title: '产品研发',
    key: '产品研发',
    children: [
      { title: '前端组', key: '前端组' },
      { title: '后端组', key: '后端组' },
      { title: '测试组', key: '测试组' },
    ],
  },
  {
    title: '业务部门',
    key: '业务部门',
    children: [
      { title: '销售部', key: '销售部' },
      { title: '客户成功', key: '客户成功' },
    ],
  },
  { title: '财务', key: '财务' },
];

const COLUMNS: TableColumnsType<DeptRow> = [
  { title: '部门', dataIndex: 'name' },
  { title: '负责人', dataIndex: 'leader', width: 110 },
  { title: '人数', dataIndex: 'headcount', width: 90 },
  { title: '上级', dataIndex: 'parent', width: 130 },
];

export default function TreeTableDemoPage() {
  const [selected, setSelected] = useState<string>('产品研发');

  const rows = useMemo(
    () =>
      ROWS.filter(
        (row) => row.parent === selected || row.name === selected,
      ),
    [selected],
  );

  return (
    <div>
      <PageHeader
        title="左树右表 Demo"
        description="演示树形导航联动右侧列表。示例数据仅用于界面演示。"
      />
      <Row gutter={16}>
        <Col xs={24} md={7}>
          <Card title="组织树">
            <Tree
              defaultExpandAll
              treeData={TREE}
              selectedKeys={[selected]}
              onSelect={(keys) => setSelected((keys[0] as string) ?? '')}
            />
          </Card>
        </Col>
        <Col xs={24} md={17}>
          <Card title={selected ? `${selected} · 部门列表` : '部门列表'}>
            <Table<DeptRow>
              size="small"
              rowKey="id"
              columns={COLUMNS}
              dataSource={rows}
              pagination={false}
              locale={{ emptyText: <Typography.Text type="secondary">该节点暂无直接下属部门</Typography.Text> }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
