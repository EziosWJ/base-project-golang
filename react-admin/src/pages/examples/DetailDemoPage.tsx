import { Card, Descriptions, Space, Tag, Timeline, Typography } from 'antd';
import { PageHeader } from '../../components/PageHeader/PageHeader';

export default function DetailDemoPage() {
  return (
    <div>
      <PageHeader
        title="详情页 Demo"
        description="演示详情字段、状态标签与时间线布局。示例数据仅用于界面演示。"
        extra={<Tag color="processing">示例单据</Tag>}
      />
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, md: 2 }} bordered>
          <Descriptions.Item label="单据编号">DEMO-20261023-001</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color="success">已完成</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="申请人">张伟</Descriptions.Item>
          <Descriptions.Item label="所属部门">产品研发 / 前端组</Descriptions.Item>
          <Descriptions.Item label="申请日期">2026-10-20</Descriptions.Item>
          <Descriptions.Item label="金额">￥ 12,800.00</Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>
            用于演示详情页字段排布；真实业务应以接口返回为准。
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="处理流程">
        <Timeline
          items={[
            {
              color: 'green',
              content: (
                <Space direction="vertical" size={0}>
                  <Typography.Text strong>审批完成</Typography.Text>
                  <Typography.Text type="secondary">2026-10-21 09:30 · 李娜</Typography.Text>
                </Space>
              ),
            },
            {
              color: 'blue',
              content: (
                <Space direction="vertical" size={0}>
                  <Typography.Text strong>部门审核通过</Typography.Text>
                  <Typography.Text type="secondary">2026-10-20 16:12 · 王强</Typography.Text>
                </Space>
              ),
            },
            {
              color: 'gray',
              content: (
                <Space direction="vertical" size={0}>
                  <Typography.Text strong>提交申请</Typography.Text>
                  <Typography.Text type="secondary">2026-10-20 10:05 · 张伟</Typography.Text>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
