export type RouteId = string;
export type HeatmapMetric = 'relative' | 'absolute';

export type TramStop = { id: string; name: string; lat: number; lon: number };

export type TramRoute = {
  id: string;
  number: string;
  name: string;
  color: string;
  directions: { headsign: string; stopIds: string[] }[];
};

export type StopData = TramStop & { load: number };

export type RoutePlanningProfile = {
  hourlyMean: number;
  hourlyP95: number;
  boardingsPerVehicleMean: number;
  boardingsPerVehicleP90: number;
  activeVehiclesP95: number;
  vehicleModel?: string | null;
  capacityClass?: string | null;
};

export type RouteEvent = {
  start: string;
  end: string;
  routes: string[];
  name: string;
  venue: string;
  time: string;
  popularity: number;
  popularityLabel: string;
  citywide?: boolean;
};

export type RouteForecast = {
  routeId: string;
  dayTotal: number;
  current: number;
  hourAverage: number;
  currentVsAverage: number;
  peak: number;
  peakHour: number;
  minimum: number;
  minimumHour: number;
  peakShare: number;
  loadState: 'critical' | 'warning' | 'normal' | 'low';
  loadLabel: string;
  recommendation: string;
  recommendedVehicles: number | null;
};

export type HeatmapRow = {
  routeId: string;
  routeName: string;
  routeColor: string;
  values: { hour: number; prediction: number; intensity: number; label: string }[];
};

export type OperationalSummary = {
  total: number;
  peakHour: number;
  peakTotal: number;
  routesAboveP95: number;
  recommendedVehicles: number;
  coveredRoutes: number;
};

export type ApiForecast = {
  routeId: string;
  date: string;
  context: string;
  labels: string[];
  rawValues: number[];
  values: number[];
  total: number;
  peak: number;
  peakHour: number;
  points: number;
};

export type DashboardResponse = {
  forecast: ApiForecast;
  routeForecasts: RouteForecast[];
  summary: OperationalSummary;
  heatmap: HeatmapRow[];
  events: RouteEvent[];
  planningProfiles: Record<string, RoutePlanningProfile>;
};

export type ApiMeta = {
  routes: TramRoute[];
  stops: TramStop[];
  geometries: Record<string, { directions: [number, number][][] }>;
  forecastRoutes: string[];
  planningProfiles: Record<string, RoutePlanningProfile>;
  dateMin: string | null;
  dateMax: string | null;
  defaultDate: string | null;
};
export function formatForecastNumber(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(value));
}
