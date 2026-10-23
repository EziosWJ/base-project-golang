import { App, Button, Card, Form, Input, Space, Typography } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { changeCurrentPassword } from '../../features/system/api';
import { getErrorMessage } from '../../lib/api/errors';

interface PasswordFormValues {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ChangePasswordPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<PasswordFormValues>();

  const change = useMutation({
    mutationFn: (values: PasswordFormValues) =>
      changeCurrentPassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      message.success('密码已修改，请使用新密码登录');
      form.resetFields();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  return (
    <div>
      <PageHeader
        title="修改密码"
        description="修改成功后，已签发的会话仍按后端 JWT 策略处理；如发现异常请重新登录。"
      />

      <Card style={{ maxWidth: 520 }}>
        <Form<PasswordFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => change.mutate(values)}
        >
          <Form.Item
            name="oldPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, max: 50, message: '密码长度为 6-50 个字符' },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator: (_, value: string) =>
                  !value || getFieldValue('newPassword') === value
                    ? Promise.resolve()
                    : Promise.reject(new Error('两次输入的密码不一致')),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={change.isPending}>
              保存修改
            </Button>
            <Button onClick={() => form.resetFields()}>重置</Button>
          </Space>
        </Form>
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
          服务端要求新密码长度为 6-50 个字符；修改时会校验当前密码。
        </Typography.Text>
      </Card>
    </div>
  );
}
