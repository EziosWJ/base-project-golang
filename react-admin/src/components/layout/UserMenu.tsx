import { App, Avatar, Button, Dropdown, Space, Typography, type MenuProps } from 'antd';
import { LogOut, ShieldCheck, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store';

export function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const { message } = App.useApp();

  const handleLogout = async () => {
    await logout();
    message.success('已退出登录');
    navigate('/login', { replace: true });
  };

  const items: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserCog size={14} />,
      label: '个人中心',
      onClick: () => navigate('/account/profile'),
    },
    {
      key: 'password',
      icon: <ShieldCheck size={14} />,
      label: '修改密码',
      onClick: () => navigate('/account/change-password'),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogOut size={14} />,
      label: '退出登录',
      onClick: () => void handleLogout(),
    },
  ];

  const roleNames = user?.roles.map((role) => role.roleName).join(' / ');

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <Button type="text" style={{ height: 38, paddingInline: 6 }}>
        <Space size={8}>
          <Avatar size={28} style={{ background: 'var(--ant-color-primary)' }}>
            {(user?.nickname || user?.username || '?').slice(0, 1)}
          </Avatar>
          <span className="user-menu-name" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
            <Typography.Text strong style={{ fontSize: 13 }}>
              {user?.nickname || user?.username || '未登录'}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {roleNames || user?.dept?.deptName || '账号'}
            </Typography.Text>
          </span>
        </Space>
      </Button>
    </Dropdown>
  );
}
