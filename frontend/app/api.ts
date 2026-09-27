import type { DashboardResponse } from './data';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '');

export async function getDashboard(date: string, routeId: string, hour: number): Promise<DashboardResponse> {
  const params = new URLSearchParams({ date, route_id: routeId, hour: String(hour) });
  const response = await fetch(`${API_URL}/dashboard?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Backend вернул HTTP ${response.status}`);
  }
  return response.json() as Promise<DashboardResponse>;
}

export function getDayExportUrl(date: string, routeId: string) {
  const params = new URLSearchParams({ date, route_id: routeId });
  return `${API_URL}/export/day.csv?${params.toString()}`;
}
