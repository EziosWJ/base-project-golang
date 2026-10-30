import { useEffect, useState } from 'react';
import { env } from '../config/env';
import { getFileLink } from '../features/files/api';
import { getApiErrorMessage } from '../lib/api/errors';
import { getAssetBlob } from '../lib/api/client';

type AuthenticatedFileUrl = {
  url: string | null;
  loading: boolean;
  error: string;
  onError: () => void;
};

const MANAGED_FILE_PATH = /^\/api\/v1\/system\/file\/(\d+)\/view$/;

/** 只把后端文件流地址解析为文件 ID，其他 URL 直接交给浏览器。 */
function managedFileId(path: string): number | null {
  try {
    const apiOrigin = env.apiOrigin || window.location.origin;
    const resolved = new URL(path, apiOrigin);
    if (resolved.origin !== apiOrigin) return null;
    const match = MANAGED_FILE_PATH.exec(resolved.pathname);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

export function useAuthenticatedFileUrl(path: string | null | undefined): AuthenticatedFileUrl {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    setUrl(null);
    setError('');
    if (!path) {
      setLoading(false);
      return () => controller.abort();
    }
    const fileId = managedFileId(path);
    if (fileId === null && !path.startsWith('/api/')) {
      setUrl(path);
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    void (async () => {
      try {
        let target = path;
        if (fileId !== null) {
          const link = await getFileLink(fileId, 'inline', controller.signal);
          if (controller.signal.aborted) return;
          if (link.direct) {
            setUrl(link.url);
            setLoading(false);
            return;
          }
          target = link.url;
        }
        const blob = await getAssetBlob(target, controller.signal);
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setLoading(false);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(getApiErrorMessage(loadError));
        setLoading(false);
      }
    })();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  function onError() {
    setUrl(null);
    setLoading(false);
    setError('文件加载失败，请重试');
  }

  return { url, loading, error, onError };
}
