import { useEffect, useState } from 'react';
import { getErrorMessage } from '../lib/api/errors';
import { getFileBlob, getFileLink } from '../features/system/api';

type AuthenticatedFileUrl = {
  url: string;
  loading: boolean;
  error: string;
  onError: () => void;
};

function fileIdFromViewPath(path: string): number | null {
  if (/^(data:|blob:)/i.test(path)) return null;

  try {
    const resolved = new URL(path, window.location.origin);
    const match = /^\/api\/v1\/system\/file\/(\d+)\/view$/.exec(resolved.pathname);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Resolve a file access URL for display. Signed object URLs are used directly by
 * the image element; local files are fetched with the API token and exposed as
 * an object URL that is released when the path changes.
 */
export function useAuthenticatedFileUrl(path: string | null | undefined): AuthenticatedFileUrl {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!path) {
      setUrl('');
      setLoading(false);
      setError('');
      return;
    }

    const fileId = fileIdFromViewPath(path);
    if (fileId === null) {
      setUrl(path);
      setLoading(false);
      setError('');
      return;
    }

    const controller = new AbortController();
    let objectUrl = '';
    setUrl('');
    setLoading(true);
    setError('');

    getFileLink(fileId, 'inline', controller.signal)
      .then(async (link) => {
        if (controller.signal.aborted) return;
        if (link.direct) {
          setUrl(link.url);
          setLoading(false);
          return;
        }
        const blob = await getFileBlob(link.url, controller.signal);
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setLoading(false);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setUrl('');
        setError(getErrorMessage(requestError));
        setLoading(false);
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  function onError() {
    setUrl('');
    setLoading(false);
    setError('文件加载失败，请重试');
  }

  return { url, loading, error, onError };
}
