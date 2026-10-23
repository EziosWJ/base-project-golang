import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <Result
      status="403"
      title="没有访问权限"
      subTitle="当前账号未被授予该页面的菜单权限。如需访问，请联系管理员在角色中授权。"
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          返回工作台
        </Button>
      }
    />
  );
}
