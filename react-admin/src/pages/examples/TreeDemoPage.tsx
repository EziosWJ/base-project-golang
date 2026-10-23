import { useState } from 'react';
import { Card, Space, Tag, Tree, Typography, type TreeDataNode } from 'antd';
import { PageHeader } from '../../components/PageHeader/PageHeader';

const TREE_DATA: TreeDataNode[] = [
  {
    title: '产品研发',
    key: 'rd',
    children: [
      { title: '前端组', key: 'fe' },
      { title: '后端组', key: 'be' },
      { title: '测试组', key: 'qa' },
    ],
  },
  {
    title: '业务部门',
    key: 'biz',
    children: [
      {
        title: '销售',
        key: 'sales',
        children: [
          { title: '华东区', key: 'sales-east' },
          { title: '华南区', key: 'sales-south' },
        ],
      },
      { title: '客户成功', key: 'cs' },
    ],
  },
  { title: '财务', key: 'finance' },
];

export default function TreeDemoPage() {
  const [checked, setChecked] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | undefined>();

  return (
    <div>
      <PageHeader
        title="树形结构 Demo"
        description="演示树形数据展示、展开、勾选与节点选择。示例数据仅用于界面演示。"
      />
      <Card>
        <Space align="start" size={24} wrap>
          <Tree
            checkable
            defaultExpandAll
            treeData={TREE_DATA}
            checkedKeys={checked}
            onCheck={(keys) => setChecked(keys as string[])}
            onSelect={(keys) => setSelected(keys[0] as string | undefined)}
            style={{ minWidth: 280 }}
          />
          <div>
            <Typography.Title level={5}>选择结果</Typography.Title>
            <Typography.Paragraph>
              当前节点：{selected ? <Tag color="processing">{selected}</Tag> : '未选择'}
            </Typography.Paragraph>
            <Typography.Paragraph>
              已勾选：
              {checked.length === 0
                ? '未勾选'
                : checked.map((key) => <Tag key={key}>{key}</Tag>)}
            </Typography.Paragraph>
          </div>
        </Space>
      </Card>
    </div>
  );
}
