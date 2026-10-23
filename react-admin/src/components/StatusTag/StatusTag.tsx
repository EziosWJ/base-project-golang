import { Tag } from 'antd';
import { getStatusMeta, logStatusMeta, type StatusTone } from '../../config/options';

const toneColor: Record<StatusTone, string> = {
  success: 'success',
  processing: 'processing',
  warning: 'warning',
  error: 'error',
  default: 'default',
};

/** Enabled/disabled tag sourced from the shared status dictionaries. */
export function StatusTag({ status }: { status: 0 | 1 }) {
  return (
    <Tag color={status === 1 ? toneColor.success : toneColor.default}>
      {status === 1 ? '启用' : '禁用'}
    </Tag>
  );
}

/** Generic status tag for log/announcement-style string states. */
export function LogStatusTag({ value }: { value: string }) {
  const meta = getStatusMeta(logStatusMeta, value);
  return <Tag color={toneColor[meta.tone]}>{meta.label}</Tag>;
}
