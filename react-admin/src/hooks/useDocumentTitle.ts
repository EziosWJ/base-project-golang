import { useEffect } from 'react';
import { appConfig } from '../config/app.config';

export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    if (!title) return;
    document.title = `${title} · ${appConfig.name}`;
  }, [title]);
}
