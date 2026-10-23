import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../../src/pages/LoginPage';
import { useAuthStore } from '../../src/features/auth/store';
import { TestProviders } from '../testUtils';

const loginByPassword = vi.fn();
const getCurrentUser = vi.fn();
const getCurrentUserMenus = vi.fn();

vi.mock('../../src/features/auth/api', () => ({
  loginByPassword: (...args: unknown[]) => loginByPassword(...args),
  getCurrentUser: () => getCurrentUser(),
  getCurrentUserMenus: () => getCurrentUserMenus(),
  logoutCurrentUser: vi.fn(),
}));

function renderLogin() {
  return TestProviders({
    children: (
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>工作台测试页</div>} />
        </Routes>
      </MemoryRouter>
    ),
  });
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      token: null,
      user: null,
      menus: [],
      status: 'anonymous',
    });
  });

  it('shows the server message when credentials are rejected', async () => {
    loginByPassword.mockRejectedValue(
      Object.assign(new Error('用户名或密码错误'), { name: 'ApiError' }),
    );
    const user = userEvent.setup({ delay: null });
    render(renderLogin());

    await user.type(screen.getByLabelText('用户名'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'wrong');
    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByText('用户名或密码错误')).toBeInTheDocument();
  });

  it('restores session data and redirects after a successful login', async () => {
    loginByPassword.mockResolvedValue({
      tokenName: 'Bearer',
      tokenValue: 'token-123',
      expiresIn: 3600,
    });
    getCurrentUser.mockResolvedValue({
      id: 1,
      username: 'admin',
      nickname: '管理员',
      roles: [{ id: 1, roleName: '超级管理员', roleCode: 'ADMIN' }],
    });
    getCurrentUserMenus.mockResolvedValue([]);

    const user = userEvent.setup({ delay: null });
    render(renderLogin());

    await user.type(screen.getByLabelText('用户名'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'admin123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => expect(screen.getByText('工作台测试页')).toBeInTheDocument());
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().token).toBe('token-123');
  });
});
