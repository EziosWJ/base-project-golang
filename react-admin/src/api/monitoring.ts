import { API_PREFIX, http } from "@/lib/http";
import type { MonitorHistory, MonitorResource, MonitorSnapshot } from "@/types/monitoring";

const BASE = `${API_PREFIX}/monitoring`;
export const getMonitorSnapshot = (signal: AbortSignal) => http.get<MonitorSnapshot>(`${BASE}/overview`, { signal });
export const getMonitorHistory = (resource: MonitorResource, device: string, signal: AbortSignal) => http.get<MonitorHistory>(`${BASE}/history`, { query: { resource, device }, signal });
