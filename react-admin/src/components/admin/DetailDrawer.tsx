import type { ReactNode } from 'react';
import { Alert, Drawer, Skeleton } from 'antd';
import { getErrorMessage } from '../../lib/api/errors';

export interface DetailDrawerProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  loading?: boolean;
  error?: unknown;
  width?: number;
  extra?: ReactNode;
}

export function DetailDrawer({
  open,
  title,
  onClose,
  children,
  loading,
  error,
  width = 680,
  extra,
}: DetailDrawerProps) {
  return (
    <Drawer
      open={open}
      title={title}
      onClose={onClose}
      size={width}
      styles={{ wrapper: { maxWidth: '100vw' } }}
      destroyOnHidden
      extra={extra}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : error ? (
        <Alert type="error" showIcon title="加载失败" description={getErrorMessage(error)} />
      ) : (
        children
      )}
    </Drawer>
  );
}
