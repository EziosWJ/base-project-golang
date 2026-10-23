import { useState } from 'react';
import { Alert, App, Button, Card, Form, Input, Spin, Typography } from 'antd';
import { Lock, UserRound } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { appConfig } from '../config/app.config';
import { useAuthStore } from '../features/auth/store';
import { getErrorMessage } from '../lib/api/errors';
import type { LoginRequest } from '../types/auth';
import styles from './LoginPage.module.css';

function safeRedirect(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  if (value.startsWith('/login')) return '/';
  return value;
}

export default function LoginPage() {
  const [form] = Form.useForm<LoginRequest>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const login = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);
  const token = useAuthStore((state) => state.token);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirect = safeRedirect(searchParams.get('redirect'));

  if (status === 'authenticated') {
    return <Navigate to={redirect} replace />;
  }

  if (token && status === 'booting') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Spin size="large" description="正在恢复登录状态…" />
      </div>
    );
  }

  const handleFinish = async (values: LoginRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      await login(values.username.trim(), values.password);
      message.success('登录成功');
      navigate(redirect, { replace: true });
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-label={appConfig.name}>
        <div>
          <span className={styles.heroMark} aria-hidden="true">
            {appConfig.logoText}
          </span>
          <Typography.Title level={1} className={styles.heroTitle}>
            {appConfig.name}
          </Typography.Title>
          <p className={styles.heroText}>
            Go + React 的企业管理后台脚手架，内置账号、角色、菜单、部门、字典、配置、文件、日志、通知、公告与服务器监控。
            使用真实后端接口，顶部导航布局，可按需裁剪为你的业务系统。
          </p>
        </div>
        <div className={styles.heroFooter}>{appConfig.footerText}</div>
      </section>

      <section className={styles.panel}>
        <Card className={styles.card}>
          <Typography.Title level={2} className={styles.cardTitle}>
            登录
          </Typography.Title>
          <Typography.Text type="secondary">使用系统账号登录管理后台</Typography.Text>

          {error && (
            <Alert
              style={{ margin: '16px 0 0' }}
              type="error"
              showIcon
              title="登录失败"
              description={error}
            />
          )}

          <Form<LoginRequest>
            form={form}
            layout="vertical"
            size="large"
            requiredMark={false}
            style={{ marginTop: 20 }}
            onFinish={(values) => void handleFinish(values)}
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                autoComplete="username"
                prefix={<UserRound size={16} />}
                placeholder="请输入用户名"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                autoComplete="current-password"
                prefix={<Lock size={16} />}
                placeholder="请输入密码"
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={submitting} className={styles.submit}>
                登录
              </Button>
            </Form.Item>
          </Form>

          <Typography.Text type="secondary" className={styles.hint}>
            初始管理员账号由数据库 migration 种子写入（本地开发默认 admin / admin123），部署后请立即修改密码。
          </Typography.Text>
        </Card>
      </section>
    </div>
  );
}
