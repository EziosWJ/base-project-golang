import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/AsyncState/AsyncState';
import { renderWithProviders } from '../testUtils';

describe('AsyncState primitives', () => {
  it('announces loading state', () => {
    renderWithProviders(<LoadingState label="正在加载客户…" />);
    expect(screen.getByRole('status', { name: '正在加载客户…' })).toBeInTheDocument();
  });

  it('shows a safe error message and retry action', async () => {
    const user = userEvent.setup({ delay: null });
    const onRetry = vi.fn();
    renderWithProviders(<ErrorState error={new Error('网络连接失败')} onRetry={onRetry} />);
    expect(screen.getByText('加载失败')).toBeInTheDocument();
    expect(screen.getByText('网络连接失败')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /重新加载/ }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('renders empty text and action', () => {
    renderWithProviders(
      <EmptyState title="暂无客户" description="创建第一位客户" action={<button type="button">新建</button>} />,
    );
    expect(screen.getByText('暂无客户')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建' })).toBeInTheDocument();
  });
});
