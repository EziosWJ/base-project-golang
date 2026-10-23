import { useState } from 'react';
import { App, Avatar, Button, Card, Descriptions, Form, Input, Space, Tag, Typography } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { useAuthStore } from '../../features/auth/store';
import { updateCurrentAvatar } from '../../features/system/api';
import { getErrorMessage } from '../../lib/api/errors';
import { formatDateTime } from '../../utils/format';

export default function ProfilePage() {
  const { message } = App.useApp();
  const user = useAuthStore((state) => state.user);
  const [avatar, setAvatar] = useState(user?.avatar ?? '');

  const saveAvatar = useMutation({
    mutationFn: updateCurrentAvatar,
    onSuccess: () => {
      const current = useAuthStore.getState().user;
      if (current) useAuthStore.setState({ user: { ...current, avatar } });
      message.success('头像地址已更新');
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  return (
    <div>
      <PageHeader
        title="个人中心"
        description="当前登录账号的基本资料。账号、部门和角色由管理员维护。"
      />

      <Card>
        <Space align="start" size={20} wrap>
          <Avatar size={72} src={user?.avatar || undefined} style={{ background: 'var(--ant-color-primary)' }}>
            {(user?.nickname || user?.username || '?').slice(0, 1)}
          </Avatar>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {user?.nickname || user?.username || '—'}
            </Typography.Title>
            <Typography.Text type="secondary">
              {user?.dept?.deptName || '未分配部门'} ·{' '}
              {user?.roles.map((role) => role.roleName).join(' / ') || '未分配角色'}
            </Typography.Text>
          </div>
        </Space>

        <Descriptions column={{ xs: 1, md: 2 }} bordered style={{ marginTop: 24 }}>
          <Descriptions.Item label="用户名">{user?.username}</Descriptions.Item>
          <Descriptions.Item label="昵称">{user?.nickname}</Descriptions.Item>
          <Descriptions.Item label="部门">{user?.dept?.deptName || '—'}</Descriptions.Item>
          <Descriptions.Item label="角色">
            {user?.roles.length
              ? user.roles.map((role) => (
                  <Tag key={role.id}>
                    {role.roleName}
                    {role.roleCode ? `（${role.roleCode}）` : ''}
                  </Tag>
                ))
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="手机号">{user?.phone || '—'}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{user?.email || '—'}</Descriptions.Item>
          <Descriptions.Item label="最近登录">{formatDateTime(user?.lastLoginTime)}</Descriptions.Item>
          <Descriptions.Item label="登录 IP">{user?.lastLoginIp || '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="头像地址" style={{ marginTop: 16 }}>
        <Form layout="inline" onFinish={() => saveAvatar.mutate(avatar)}>
          <Form.Item label="头像 URL" style={{ flex: 1, minWidth: 280 }}>
            <Input
              value={avatar}
              onChange={(event) => setAvatar(event.target.value)}
              placeholder="https://example.com/avatar.png"
              allowClear
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saveAvatar.isPending}>
              保存
            </Button>
          </Form.Item>
        </Form>
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          后端仅保存头像地址；如需上传文件，请先到「文件管理」上传并填写文件的访问地址。
        </Typography.Text>
      </Card>
    </div>
  );
}
