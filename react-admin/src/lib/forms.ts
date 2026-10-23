import type { FormInstance } from 'antd';
import { getFieldErrors } from './api/errors';

/**
 * Binds server-side validation details to matching form fields. The API and
 * forms share field names; the cast bridges Ant Design's strict NamePath
 * generic with the runtime-provided keys returned by the server.
 */
export function applyServerFieldErrors<T>(form: FormInstance<T>, error: unknown): boolean {
  const fieldErrors = getFieldErrors(error);
  if (!fieldErrors) return false;
  const fields = Object.entries(fieldErrors).map(([name, message]) => ({
    name,
    errors: [message],
  }));
  form.setFields(fields as never);
  return true;
}
