import type { ReactNode } from 'react';
import { Alert, Button, Empty, Skeleton, Space, Typography } from 'antd';
import { CircleAlert, RefreshCw } from 'lucide-react';
import { getErrorMessage } from '../../lib/api/errors';
import { copy } from '../../config/copy';
import styles from './AsyncState.module.css';

export function LoadingState({ label = copy.common.loading, rows = 4 }: { label?: string; rows?: number }) {
  return (
    <div className={styles.loading} role="status" aria-live="polite" aria-label={label}>
      <Skeleton active paragraph={{ rows }} title />
      <span className={styles.visuallyHidden}>{label}</span>
    </div>
  );
}

export function ErrorState({
  error,
  title = copy.common.loadFailed,
  onRetry,
}: {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}) {
  return (
    <Alert
      type="error"
      showIcon
      icon={<CircleAlert size={18} />}
      title={title}
      description={
        <Space orientation="vertical" size={10}>
          <Typography.Text>{getErrorMessage(error)}</Typography.Text>
          {onRetry && (
            <Button size="small" icon={<RefreshCw size={14} />} onClick={onRetry}>
              {copy.common.reload}
            </Button>
          )}
        </Space>
      }
      className={styles.alert}
    />
  );
}

export function EmptyState({
  title = copy.async.emptyTitle,
  description,
  action,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <Space orientation="vertical" size={4}>
          <Typography.Text strong>{title}</Typography.Text>
          {description && <Typography.Text type="secondary">{description}</Typography.Text>}
        </Space>
      }
    >
      {action}
    </Empty>
  );
}
