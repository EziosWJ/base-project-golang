import type { ReactNode } from 'react';
import { Alert, Button, Drawer, Form, Space, Typography, type FormInstance } from 'antd';
import { getErrorMessage } from '../../lib/api/errors';
import { copy } from '../../config/copy';
import styles from './FormDrawer.module.css';

export interface FormDrawerProps<T> {
  open: boolean;
  title: string;
  description?: string;
  form: FormInstance<T>;
  onClose: () => void;
  onFinish: (values: T) => void | Promise<void>;
  submitting?: boolean;
  error?: unknown;
  children: ReactNode;
  submitText?: string;
  width?: number;
}

export function FormDrawer<T>({
  open,
  title,
  description,
  form,
  onClose,
  onFinish,
  submitting,
  error,
  children,
  submitText = copy.form.save,
  width = 540,
}: FormDrawerProps<T>) {
  return (
    <Drawer
      open={open}
      title={
        <div>
          <Typography.Text strong>{title}</Typography.Text>
          {description && (
            <Typography.Paragraph type="secondary" className={styles.description}>
              {description}
            </Typography.Paragraph>
          )}
        </div>
      }
      size={width}
      styles={{ wrapper: { maxWidth: '100vw' } }}
      onClose={onClose}
      closable={!submitting}
      maskClosable={!submitting}
      destroyOnHidden
      footer={
        <Space className={styles.footer}>
          <Button onClick={onClose} disabled={submitting}>
            {copy.form.cancel}
          </Button>
          <Button type="primary" loading={submitting} onClick={() => form.submit()}>
            {submitText}
          </Button>
        </Space>
      }
    >
      {error !== undefined && error !== null && (
        <Alert type="error" showIcon title={copy.common.saveFailed} description={getErrorMessage(error)} className={styles.alert} />
      )}
      <Form<T> form={form} layout="vertical" onFinish={onFinish} scrollToFirstError requiredMark>
        {children}
      </Form>
    </Drawer>
  );
}
