import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppLayout from '../../src/layouts/AppLayout';
import { useAuthStore } from '../../src/features/auth/store';
import type { CurrentUserMenu } from '../../src/types/auth';
import { TestProviders } from '../testUtils';

vi.mock('../../src/features/notifications/api', () => ({
  getUnreadNotificationCount: vi.fn().mockResolvedValue(0),
  getNotifications: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 5 }),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
}));

const menus: CurrentUserMenu[] = [
  {
    id: 1,
    parentId: 0,
    menuName: '系统管理',
    menuType: 'DIR',
    path: '/system',
    icon: 'Settings',
    permissionCode: 'system',
    sortOrder: 1,
    visible: 1,
    children: [
      {
        id: 2,
        parentId: 1,
        menuName: '用户管理',
        menuType: 'MENU',
        path: '/system/user',
        icon: 'User',
        permissionCode: 'system:user',
        sortOrder: 1,
        visible: 1,
        children: [],
      },
    ],
  },
];

function renderLayout() {
  return TestProviders({
    children: (
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<div>工作台内容</div>} />
            <Route path="system/user" element={<div>用户页面内容</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    ),
  });
}

describe('AppLayout', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'token',
      status: 'authenticated',
      user: {
        id: 1,
        username: 'admin',
        nickname: '管理员',
        roles: [{ id: 1, roleName: '超级管理员', roleCode: 'ADMIN' }],
      },
      menus,
    });
  });

  it('renders backend-driven top navigation and account tools', async () => {
    render(renderLayout());
    expect(await screen.findByText('系统管理')).toBeInTheDocument();
    expect(screen.getByText('工作台内容')).toBeInTheDocument();
    expect(screen.getByLabelText('站内通知')).toBeInTheDocument();
    expect(screen.getByText('管理员')).toBeInTheDocument();
  });

  it('opens the command palette with Ctrl+K and navigates with Enter', async () => {
    const user = userEvent.setup({ delay: null });
    render(renderLayout());

    await user.keyboard('{Control>}k{/Control}');
    const input = await screen.findByRole('combobox', { name: '搜索页面或导航入口' });
    await user.type(input, '用户');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.getByText('用户页面内容')).toBeInTheDocument());
  });
});
