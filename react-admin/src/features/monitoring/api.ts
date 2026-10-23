import { api } from '../../lib/api/client';
import type { MonitorHistory, MonitorResource, MonitorSnapshot } from '../../types/monitoring';

export function getMonitorSnapshot(signal?: AbortSignal): Promise<MonitorSnapshot> {
  return api.get<MonitorSnapshot>('/monitoring/overview', { signal });
}

export function getMonitorHistory(
  resource: MonitorResource,
  device: string,
  signal?: AbortSignal,
): Promise<MonitorHistory> {
  return api.get<MonitorHistory>('/monitoring/history', {
    params: { resource, device },
    signal,
  });
}
