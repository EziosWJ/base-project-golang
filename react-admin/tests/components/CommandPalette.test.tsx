import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommandPalette, type CommandItem } from '../../src/components/CommandPalette/CommandPalette';
import { renderWithProviders } from '../testUtils';

// Deliberately interleaved groups: keyboard order must follow grouped visual
// order (业务管理: 客户/订单, 快捷操作: 新建客户, 系统管理: 用户), not this array.
const items: CommandItem[] = [
  { key: '/customers', label: '客户管理', title: '客户管理', group: '业务管理', path: '/customers' },
  { key: '/customers/new', label: '新建客户', title: '新建客户', group: '快捷操作', path: '/customers/new' },
  { key: '/orders', label: '订单管理', title: '订单管理', group: '业务管理', path: '/orders' },
  { key: '/users', label: '用户管理', title: '用户管理', group: '系统管理', path: '/users' },
];

describe('CommandPalette', () => {
  it('focuses the input, filters results and navigates with the keyboard', async () => {
    const user = userEvent.setup({ delay: null });
    const onSelect = vi.fn();
    renderWithProviders(
      <CommandPalette open items={items} onClose={vi.fn()} onSelect={onSelect} />,
    );

    const input = screen.getByRole('combobox', { name: '搜索页面或导航入口' });
    await waitFor(() => expect(input).toHaveFocus());

    await user.type(input, '订单');
    expect(screen.getByRole('option', { name: /订单管理/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /用户管理/ })).not.toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ path: '/orders' }));
  });

  it('supports arrow navigation and keyboard selection', async () => {
    const user = userEvent.setup({ delay: null });
    const onSelect = vi.fn();
    renderWithProviders(
      <CommandPalette open items={items} onClose={vi.fn()} onSelect={onSelect} />,
    );

    const input = screen.getByRole('combobox', { name: '搜索页面或导航入口' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    // Visual (grouped) order: 客户管理, 订单管理, 新建客户, 用户管理.
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ path: '/customers/new' }));

    await user.click(screen.getByRole('option', { name: /新建客户/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ path: '/customers/new' }));
  });

  it('closes on Escape and shows an empty state', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = vi.fn();
    renderWithProviders(
      <CommandPalette open items={items} onClose={onClose} onSelect={vi.fn()} />,
    );

    const input = screen.getByRole('combobox', { name: '搜索页面或导航入口' });
    await user.type(input, '不存在的页面');
    expect(screen.getByText('没有匹配的页面或操作')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
