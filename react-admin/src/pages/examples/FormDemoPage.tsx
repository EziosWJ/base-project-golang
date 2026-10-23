import { useState } from 'react';
import { App, Card, DatePicker, Form, Input, InputNumber, Select, Switch, Typography } from 'antd';
import { PageHeader } from '../../components/PageHeader/PageHeader';

interface DemoFormValues {
  name: string;
  category: string;
  amount: number;
  enabled: boolean;
  date?: unknown;
  remark?: string;
}

export default function FormDemoPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<DemoFormValues>();
  const [submitted, setSubmitted] = useState<DemoFormValues | null>(null);

  return (
    <div>
      <PageHeader
        title="标准表单 Demo"
        description="演示 Ant Design 表单布局、校验、开关、日期与提交反馈。数据仅保存在当前页面。"
      />
      <Card style={{ maxWidth: 640 }}>
        <Form<DemoFormValues>
          form={form}
          layout="vertical"
          requiredMark
          initialValues={{ enabled: true, category: 'normal' }}
          onFinish={(values) => {
            setSubmitted(values);
            message.success('表单校验通过（示例数据，未提交到后端）');
          }}
        >
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：季度计划" />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'normal', label: '普通' },
                { value: 'important', label: '重要' },
                { value: 'urgent', label: '紧急' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="amount"
            label="预算金额"
            rules={[{ required: true, message: '请输入金额' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="元" />
          </Form.Item>
          <Form.Item name="date" label="计划日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} maxLength={200} showCount />
          </Form.Item>
          <Form.Item>
            <button type="submit" className="ant-btn ant-btn-primary">
              提交
            </button>
          </Form.Item>
        </Form>
      </Card>

      {submitted && (
        <Card title="提交结果（仅本页）" style={{ marginTop: 16 }}>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(
              { ...submitted, date: String(submitted.date ?? '') },
              null,
              2,
            )}
          </Typography.Paragraph>
        </Card>
      )}
    </div>
  );
}
