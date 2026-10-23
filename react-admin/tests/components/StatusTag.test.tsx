import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LogStatusTag, StatusTag } from '../../src/components/StatusTag/StatusTag';

describe('StatusTag', () => {
  it('renders enabled and disabled states', () => {
    const { rerender } = render(<StatusTag status={1} />);
    expect(screen.getByText('启用')).toBeInTheDocument();
    rerender(<StatusTag status={0} />);
    expect(screen.getByText('禁用')).toBeInTheDocument();
  });

  it('renders log result states including unknown values', () => {
    const { rerender } = render(<LogStatusTag value="SUCCESS" />);
    expect(screen.getByText('成功')).toBeInTheDocument();
    rerender(<LogStatusTag value="FAIL" />);
    expect(screen.getByText('失败')).toBeInTheDocument();
    rerender(<LogStatusTag value="LEGACY" />);
    expect(screen.getByText('LEGACY')).toBeInTheDocument();
  });
});
