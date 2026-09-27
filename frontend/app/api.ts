import type { ApiMeta, DashboardResponse } from './data';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '');

export async function getMeta(): Promise<ApiMeta> {
  const response = await fetch(`${API_URL}/meta`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Backend не вернул метаданные');
  return response.json() as Promise<ApiMeta>;
}

export async function getDashboard(
  date: string,
  routeId: string,
  hour: number,
  seasonStrength: number,
  weatherStrength: number,
  eventStrength: number,
): Promise<DashboardResponse> {
  const params = new URLSearchParams({
    date,
    route_id: routeId,
    hour: String(hour),
    season_strength: String(seasonStrength),
    weather_strength: String(weatherStrength),
    event_strength: String(eventStrength),
  });
  const response = await fetch(`${API_URL}/dashboard?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Backend вернул HTTP ${response.status}`);
  }
  return response.json() as Promise<DashboardResponse>;
}

export function getDayExportUrl(
  date: string,
  routeId: string,
  seasonStrength: number,
  weatherStrength: number,
  eventStrength: number,
) {
  const params = new URLSearchParams({
    date,
    route_id: routeId,
    season_strength: String(seasonStrength),
    weather_strength: String(weatherStrength),
    event_strength: String(eventStrength),
  });
  return `${API_URL}/export/day.csv?${params.toString()}`;
}
