import { authorizationValue, buildApiUrl } from '../../lib/api/client';

type ChangeEvent = { type: string; id?: number };

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(finish, ms);
    function finish() {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    }
    signal.addEventListener('abort', finish, { once: true });
    if (signal.aborted) finish();
  });
}

/**
 * Connects the authenticated notification/announcement stream. Events are
 * hints to refetch persisted state; message content is never trusted from the
 * stream itself.
 */
function connect(
  path: string,
  token: string,
  onChange: (event: ChangeEvent) => void,
  signal: AbortSignal,
): void {
  void (async () => {
    let attempt = 0;
    while (!signal.aborted) {
      try {
        const response = await fetch(buildApiUrl(path), {
          signal,
          cache: 'no-store',
          headers: {
            Accept: 'text/event-stream',
            Authorization: authorizationValue(token),
          },
        });
        if (signal.aborted) {
          await response.body?.cancel().catch(() => undefined);
          return;
        }
        if (response.status === 401) return;
        if (
          !response.ok ||
          !response.headers.get('Content-Type')?.startsWith('text/event-stream') ||
          !response.body
        ) {
          throw new Error('消息连接暂不可用');
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
          while (!signal.aborted) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
            if (buffer.length > 65_536) throw new Error('消息连接数据异常');
            let end = buffer.indexOf('\n\n');
            while (end !== -1) {
              const frame = buffer.slice(0, end);
              buffer = buffer.slice(end + 2);
              const data = frame
                .split('\n')
                .filter((line) => line.startsWith('data:'))
                .map((line) => line.slice(5).trimStart())
                .join('\n');
              if (data) {
                const event = JSON.parse(data) as ChangeEvent;
                if (event.type !== 'heartbeat') onChange(event);
                if (event.type === 'ready') attempt = 0;
              }
              end = buffer.indexOf('\n\n');
            }
          }
        } finally {
          await reader.cancel().catch(() => undefined);
          reader.releaseLock();
        }
      } catch {
        // Reconnect below; no timer polling of message endpoints.
      }
      if (signal.aborted) break;
      await sleep(Math.min(1000 * 2 ** attempt, 15_000), signal);
      attempt += 1;
    }
  })();
}

/**
 * Opens the authenticated stream and returns a cleanup function. Aborting on
 * pagehide releases the browser connection slot during full page navigations.
 */
export function connectMessageStreams(
  token: string,
  onChange: (event: ChangeEvent) => void,
): () => void {
  const controller = new AbortController();
  const close = () => controller.abort();
  window.addEventListener('pagehide', close);
  connect('/system/notification/events', token, onChange, controller.signal);
  return () => {
    window.removeEventListener('pagehide', close);
    controller.abort();
  };
}
