import { useMemo } from 'react';

export function useIsMac(): boolean {
  return useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
  }, []);
}
