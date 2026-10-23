import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../features/auth/store';
import { connectMessageStreams } from '../../features/notifications/stream';
import { queryKeys } from '../../lib/query/keys';

/**
 * Keeps notification and announcement caches fresh over SSE. Mounted by the
 * authenticated layout; the connection is closed on logout/unmount/pagehide.
 */
export function MessageStreams() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;
    return connectMessageStreams(token, (event) => {
      if (event.type === 'notification' || event.type === 'read' || event.type === 'ready') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      }
      if (event.type === 'announcement' || event.type === 'ready') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
      }
    });
  }, [token, queryClient]);

  return null;
}
