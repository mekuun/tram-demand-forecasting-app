import forecastCsv from '../ui_forecasts.csv?raw';
import tramData from './tram-routes.json';

export type Period = 'day' | 'month' | 'year';

export type TramStop = { id: string; name: string; lat: number; lon: number };

export type TramRoute = {
  id: string;
  number: string;
  name: string;
  color: string;
  directions: { headsign: string; stopIds: string[] }[];
};

export type StopData = TramStop & { load: number };

type ForecastRow = { route: string; date: string; hour: number; prediction: number };
type PredictionRow = { route: string; date: string; hour: number; prediction: number };

export type ForecastMeta = {
  title: string;
  chartTitle: string;
  dateLabel: string;
  inputType: 'date' | 'month' | 'number';
  inputValue: string;
  min: string;
  max: string;
  timeline: boolean;
};

export type ForecastView = ForecastMeta & {
  context: string;
  labels: string[];
  values: number[];
  rawValues: number[];
  metrics: string[];
  metricLabels: string[];
  metricNotes: string[];
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
};

export type HeatmapMetric = 'relative' | 'absolute';

export type HeatmapRow = {
  routeId: string;
  routeName: string;
  routeColor: string;
  values: { hour: number; prediction: number; intensity: number; label: string }[];
};

export type RoutePlanningProfile = {
  hourlyMean: number;
  hourlyP95: number;
  boardingsPerVehicleMean: number;
  boardingsPerVehicleP90: number;
  activeVehiclesP95: number;
  vehicleModel?: string;
  capacityClass?: string;
};

export type RouteEvent = {
  start: string;
  end: string;
  routes: string[];
  name: string;
  venue: string;
  time: string;
  popularity: number;
  citywide?: boolean;
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
};

export const tramStops = tramData.stops as TramStop[];

const referenceRouteColors: Record<string, string> = {
  '1': '#8c574e', '2': '#e6893e', '4': '#397ec0', '5': '#844d95', '6': '#dc4d4c', '7': '#e6893e',
  '10': '#be8ebb', '11': '#8c574e', '12': '#9fa0a1', '13': '#f6cb47', '14': '#844d95', '15': '#db5798',
  '16': '#51b49c', '17': '#eda742', '21': '#65b467', '23': '#b6d059', '25': '#b6d059', '26': '#397ec0',
  '27': '#8c574e', '28': '#9fa0a1', '29': '#58bcee', '30': '#f6cb47', '31': '#e6893e', '32': '#58bcee',
  '36': '#dc4d4c', '38': '#8c574e', '39': '#dc4d4c', '43': '#844d95', '46': '#b6d059', '47': '#58bcee',
  '49': '#be8ebb', '50': '#51b49c',
};

export const tramRoutes = (tramData.routes as TramRoute[])
  .filter((route) => route.number !== '5')
  .map((route) => ({
    ...route,
    color: referenceRouteColors[route.number] ?? route.color,
  }));
export const tramStopById = Object.fromEntries(tramStops.map((stop) => [stop.id, stop])) as Record<string, TramStop>;

function parseForecastCsv(csv: string): ForecastRow[] {
  return csv.trim().split(/\r?\n/).slice(1).flatMap((line) => {
    const [route, date, hour, structuralPrediction, preparedPrediction] = line.split(';');
    const prediction = Number(preparedPrediction ?? structuralPrediction);
    const parsed = { route, date, hour: Number(hour), prediction };
    return route && date && Number.isFinite(parsed.hour) && Number.isFinite(parsed.prediction) ? [parsed] : [];
  });
}

function predictionForRow(row: ForecastRow) {
  return row.prediction;
}

function withPrediction(row: ForecastRow): PredictionRow {
  return { route: row.route, date: row.date, hour: row.hour, prediction: predictionForRow(row) };
}

export const forecastRows = parseForecastCsv(forecastCsv);
export const forecastDates = [...new Set(forecastRows.map((row) => row.date))].sort();
export const forecastRouteIds = [...new Set(forecastRows.map((row) => row.route))].sort((a, b) => Number(a) - Number(b));
export const defaultForecastDate = forecastDates.at(-1) ?? '2025-12-31';
export const forecastDateMin = forecastDates[0] ?? defaultForecastDate;
export const forecastDateMax = forecastDates.at(-1) ?? defaultForecastDate;

export const forecastData: Record<Period, ForecastMeta> = {
  day: {
    title: 'Прогноз пассажиропотока на день',
    chartTitle: 'Пассажиропоток по часам',
    dateLabel: 'Дата', inputType: 'date', inputValue: defaultForecastDate,
    min: forecastDateMin, max: forecastDateMax, timeline: true,
  },
  month: {
    title: 'Прогноз пассажиропотока на месяц',
    chartTitle: 'Пассажиропоток по дням',
    dateLabel: 'Месяц', inputType: 'month', inputValue: defaultForecastDate.slice(0, 7),
    min: forecastDateMin.slice(0, 7), max: forecastDateMax.slice(0, 7), timeline: false,
  },
  year: {
    title: 'Прогноз пассажиропотока на год',
    chartTitle: 'Пассажиропоток по месяцам',
    dateLabel: 'Год', inputType: 'number', inputValue: defaultForecastDate.slice(0, 4),
    min: defaultForecastDate.slice(0, 4), max: defaultForecastDate.slice(0, 4), timeline: false,
  },
};

const tramRouteByNumber = new Map(tramRoutes.map((route) => [route.number, route]));
export const availableForecastRouteIds = forecastRouteIds.filter((routeNumber) => tramRouteByNumber.has(routeNumber));
const forecastRouteSet = new Set(availableForecastRouteIds);

// Historical reference values calculated from the organiser dataset.
// hourlyMean/hourlyP95 use Jan–Oct labels. Vehicle-hour values use Sep–Oct
// raw validations divided by distinct active garage_number values per route/hour.
export const planningProfiles: Record<string, RoutePlanningProfile> = {
  '1': { hourlyMean: 825.6, hourlyP95: 1737.7, boardingsPerVehicleMean: 79.55, boardingsPerVehicleP90: 129.46, activeVehiclesP95: 15, vehicleModel: '71-931М', capacityClass: 'ОБК' },
  '7': { hourlyMean: 983.89, hourlyP95: 2394, boardingsPerVehicleMean: 72.05, boardingsPerVehicleP90: 117.01, activeVehiclesP95: 21 },
  '11': { hourlyMean: 1393.78, hourlyP95: 2921, boardingsPerVehicleMean: 97.57, boardingsPerVehicleP90: 145.38, activeVehiclesP95: 21, vehicleModel: '71-931М', capacityClass: 'ОБК' },
  '12': { hourlyMean: 1408.84, hourlyP95: 3116.6, boardingsPerVehicleMean: 86.82, boardingsPerVehicleP90: 134.66, activeVehiclesP95: 23, vehicleModel: '71-931М', capacityClass: 'ОБК' },
  '17': { hourlyMean: 2111.63, hourlyP95: 4587.4, boardingsPerVehicleMean: 119.15, boardingsPerVehicleP90: 183.9, activeVehiclesP95: 26 },
  '25': { hourlyMean: 336.75, hourlyP95: 742, boardingsPerVehicleMean: 60.75, boardingsPerVehicleP90: 107.71, activeVehiclesP95: 8 },
  '26': { hourlyMean: 740.24, hourlyP95: 1720.9, boardingsPerVehicleMean: 76.41, boardingsPerVehicleP90: 131.77, activeVehiclesP95: 14 },
  '28': { hourlyMean: 453.77, hourlyP95: 978.25, boardingsPerVehicleMean: 75.68, boardingsPerVehicleP90: 138.68, activeVehiclesP95: 8 },
  '50': { hourlyMean: 939.85, hourlyP95: 2410.4, boardingsPerVehicleMean: 73.24, boardingsPerVehicleP90: 135.43, activeVehiclesP95: 19 },
};

const routeEvents: RouteEvent[] = [
  { start: '2025-11-02', end: '2025-11-02', routes: ['12'], name: 'Андрей Бебуришвили — Stand Up', venue: 'МТС Live Холл', time: '19:00', popularity: 0.5 },
  { start: '2025-11-02', end: '2025-11-02', routes: ['12'], name: 'Yanix', venue: 'МТС Live Холл', time: '19:00', popularity: 0.7 },
  { start: '2025-11-22', end: '2025-11-22', routes: ['12'], name: 'Моя Мишель', venue: 'МТС Live Холл', time: '19:00', popularity: 0.7 },
  { start: '2025-11-29', end: '2025-11-29', routes: ['12'], name: 'Танцы! Ёлка! МУЗ-ТВ', venue: 'МТС Live Холл', time: '19:00', popularity: 0.75 },
  { start: '2025-12-04', end: '2025-12-04', routes: ['12'], name: 'Queen — шоу «Богемская рапсодия»', venue: 'МТС Live Холл', time: '19:00', popularity: 0.75 },
  { start: '2025-12-07', end: '2025-12-07', routes: ['12'], name: 'Хаски', venue: 'МТС Live Холл', time: '19:00', popularity: 0.7 },
  { start: '2025-12-07', end: '2025-12-07', routes: ['12'], name: 'Gucci Mane', venue: 'МТС Live Холл', time: '19:00', popularity: 0.7 },
  { start: '2025-11-03', end: '2025-11-04', routes: [], name: '«Ночь искусств»', venue: 'Общегородская программа', time: '18:00', popularity: 0.85, citywide: true },
  { start: '2025-11-03', end: '2025-11-04', routes: ['11', '17', '25'], name: '«Ночь искусств» на ВДНХ', venue: 'ВДНХ', time: '18:00', popularity: 0.7 },
  { start: '2025-12-01', end: '2025-12-31', routes: [], name: 'Проект «Зима в Москве»', venue: 'Общегородская программа', time: '10:00', popularity: 0.8, citywide: true },
  { start: '2025-12-02', end: '2025-12-31', routes: [], name: 'Фестиваль «Усадьбы Москвы»', venue: 'Общегородская программа', time: '12:00', popularity: 0.55, citywide: true },
  { start: '2025-12-12', end: '2025-12-31', routes: [], name: '«Путешествие в Рождество»', venue: 'Общегородская программа', time: '12:00', popularity: 0.9, citywide: true },
  { start: '2025-12-13', end: '2025-12-31', routes: ['11', '17', '25'], name: 'Зимний сезон и каток ВДНХ', venue: 'ВДНХ', time: '10:00', popularity: 0.65 },
  { start: '2025-12-19', end: '2025-12-21', routes: ['11', '17', '25'], name: '«Атомные выходные» на катке ВДНХ', venue: 'ВДНХ', time: '12:00', popularity: 0.7 },
  { start: '2025-12-25', end: '2025-12-31', routes: [], name: 'Кремлёвская ёлка', venue: 'Кремлёвский дворец', time: '10:00', popularity: 0.85, citywide: true },
  { start: '2025-12-25', end: '2025-12-31', routes: ['11', '17', '25'], name: 'Новогодняя ярмарка ВДНХ', venue: 'ВДНХ', time: '11:00', popularity: 0.7 },
  { start: '2025-12-28', end: '2025-12-31', routes: [], name: '«Ёлка Мэра»', venue: 'Гостиный двор', time: '10:00', popularity: 0.85, citywide: true },
  { start: '2025-12-31', end: '2025-12-31', routes: ['11', '17', '25'], name: 'Портал в мир подарков на ВДНХ', venue: 'ВДНХ', time: '21:00', popularity: 0.8 },
];

export const routes: Record<string, { name: string; color: string }> = Object.fromEntries(
  tramRoutes.map((route) => {
    const routeNumber = route.number;
    const routeData = tramRouteByNumber.get(routeNumber);
    return [routeNumber, { name: routeData?.name ?? `Маршрут ${routeNumber}`, color: routeData?.color ?? '#2878c8' }];
  }),
);

export type RouteId = string;

function rowsForPeriod(period: Period, routeId: RouteId, value: string) {
  const routeRows = forecastRows.filter((row) => row.route === routeId);
  if (period === 'day') return routeRows.filter((row) => row.date === value).sort((a, b) => a.hour - b.hour).map(withPrediction);

  const prefix = period === 'month' ? value : `${value}-`;
  const grouped = new Map<string, number>();
  routeRows.filter((row) => row.date.startsWith(prefix)).forEach((row) => {
    const key = period === 'month' ? row.date : row.date.slice(5, 7);
    grouped.set(key, (grouped.get(key) ?? 0) + predictionForRow(row));
  });
  return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, prediction]) => ({
    route: routeId,
    date: period === 'month' ? `${value}-${key}` : `${value}-${key}`,
    hour: 0,
    prediction,
  }));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(value));
}

export function formatForecastNumber(value: number) {
  return formatNumber(value);
}

export function getForecastData(period: Period, routeId: RouteId, value: string): ForecastView {
  const meta = forecastData[period];
  const rows = rowsForPeriod(period, routeId, value);
  const rawValues = period === 'day'
    ? Array.from({ length: 24 }, (_, hour) => rows.find((row) => row.hour === hour)?.prediction ?? 0)
    : rows.map((row) => row.prediction);
  const labels = period === 'day'
    ? rawValues.map((_, hour) => String(hour).padStart(2, '0'))
    : rows.map((row) => period === 'month' ? row.date.slice(8, 10) : row.date.slice(5, 7));
  const total = rawValues.reduce((sum, value) => sum + value, 0);
  const peakValue = Math.max(...rawValues, 0);
  const peakIndex = rawValues.indexOf(peakValue);
  const scale = peakValue || 1;
  const values = rawValues.map((rawValue) => Math.round((rawValue / scale) * 100));
  const peakLabel = period === 'day' ? `${String(peakIndex).padStart(2, '0')}:00` : labels[peakIndex] ?? '—';
  const context = period === 'day'
    ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
    : period === 'month'
      ? new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date(`${value}-01T12:00:00`))
      : `${value} год`;

  return {
    ...meta,
    context,
    labels,
    values,
    rawValues,
    metrics: rows.length ? [formatNumber(total), peakLabel, `${formatNumber(peakValue)} пасс./ч`, `${rows.length} точек`] : ['—', '—', '—', 'нет данных'],
    metricLabels: ['Пассажиров', 'Пиковый час', 'Пик потока', 'Точек модели'],
    metricNotes: [period === 'day' ? 'за выбранный день' : 'за выбранный период', 'максимум маршрута', 'готовый прогноз', 'из ui_forecasts.csv'],
  };
}

export function routeStopData(routeId: RouteId): StopData[] {
  const route = tramRoutes.find((item) => item.number === routeId) ?? tramRoutes[0];
  const ids = route.directions.flatMap((direction) => direction.stopIds).filter((id, index, all) => all.indexOf(id) === index);
  return ids.flatMap((id) => {
    const stop = tramStopById[id];
    return stop ? [{ ...stop, load: 0 }] : [];
  });
}

export const baseStops = routeStopData(availableForecastRouteIds[0] ?? '17');

export function getRouteHourlyPrediction(routeId: RouteId, date: string, hour: number) {
  const row = forecastRows.find((item) => item.route === routeId && item.date === date && item.hour === hour);
  return row ? predictionForRow(row) : 0;
}

export function getReferenceDate(period: Period, value: string) {
  if (period === 'day') return value;
  const prefix = period === 'month' ? value : `${value}-`;
  return forecastDates.filter((date) => date.startsWith(prefix)).at(-1) ?? forecastDateMax;
}

export function getRouteDayPeak(routeId: RouteId, date: string) {
  return Math.max(...forecastRows.filter((row) => row.route === routeId && row.date === date).map(predictionForRow), 0);
}

export function getRouteForecast(routeId: RouteId, date: string, hour: number): RouteForecast {
  const rows = forecastRows.filter((row) => row.route === routeId && row.date === date).sort((left, right) => left.hour - right.hour).map(withPrediction);
  const current = rows.find((row) => row.hour === hour)?.prediction ?? 0;
  const peakRow = rows.reduce((best, row) => row.prediction > best.prediction ? row : best, rows[0] ?? { hour: 0, prediction: 0 });
  const minimumRow = rows.reduce((best, row) => row.prediction < best.prediction ? row : best, rows[0] ?? { hour: 0, prediction: 0 });
  const sameHourRows = forecastRows.filter((row) => row.route === routeId && row.hour === hour).map(predictionForRow);
  const hourAverage = sameHourRows.length ? sameHourRows.reduce((sum, prediction) => sum + prediction, 0) / sameHourRows.length : 0;
  const peak = peakRow.prediction;
  return {
    routeId,
    dayTotal: rows.reduce((sum, row) => sum + row.prediction, 0),
    current,
    hourAverage,
    currentVsAverage: hourAverage > 0 ? Math.round((current / hourAverage) * 100) : 0,
    peak,
    peakHour: peakRow.hour,
    minimum: minimumRow.prediction,
    minimumHour: minimumRow.hour,
    peakShare: peak > 0 ? Math.round((current / peak) * 100) : 0,
  };
}

export function getHeatmapRows(date: string, metric: HeatmapMetric): HeatmapRow[] {
  const dateRows = forecastRows.filter((row) => row.date === date).map(withPrediction);
  const networkMaximum = Math.max(...dateRows.map((row) => row.prediction), 0) || 1;

  return availableForecastRouteIds.map((routeId) => {
    const route = tramRouteByNumber.get(routeId);
    const routeRows = dateRows.filter((row) => row.route === routeId);
    const routePeak = Math.max(...routeRows.map((row) => row.prediction), 0) || 1;
    return {
      routeId,
      routeName: route?.name ?? `Маршрут ${routeId}`,
      routeColor: route?.color ?? '#7d898f',
      values: Array.from({ length: 24 }, (_, hour) => {
        const prediction = routeRows.find((row) => row.hour === hour)?.prediction ?? 0;
        const intensity = metric === 'absolute'
          ? (prediction / networkMaximum) * 100
          : (prediction / routePeak) * 100;
        const label = metric === 'absolute'
          ? `${formatNumber(prediction)} пасс./ч`
          : `${Math.round(intensity)}% от пика ветки`;
        return { hour, prediction, intensity, label };
      }),
    };
  });
}

export function getRoutePlanningProfile(routeId: string) {
  return planningProfiles[routeId] ?? null;
}

export function getRouteEvents(routeId: string, date: string) {
  return routeEvents.filter((event) => date >= event.start && date <= event.end && event.routes.includes(routeId));
}

export function getOperationalSummary(date: string): OperationalSummary {
  const dateRows = forecastRows.filter((row) => row.date === date && row.route !== '5').map(withPrediction);
  const hourlyTotals = Array.from({ length: 24 }, (_, hour) => dateRows
    .filter((row) => row.hour === hour)
    .reduce((sum, row) => sum + row.prediction, 0));
  const peakTotal = Math.max(...hourlyTotals, 0);
  const peakHour = hourlyTotals.indexOf(peakTotal);
  const profileEntries = Object.entries(planningProfiles);
  const routesAboveP95 = profileEntries.filter(([routeId, profile]) => {
    const routePeak = Math.max(...dateRows.filter((row) => row.route === routeId).map((row) => row.prediction), 0);
    return routePeak > profile.hourlyP95;
  }).length;
  const recommendedVehicles = profileEntries.reduce((sum, [routeId, profile]) => {
    const prediction = dateRows.find((row) => row.route === routeId && row.hour === peakHour)?.prediction ?? 0;
    return sum + Math.ceil(prediction / profile.boardingsPerVehicleMean);
  }, 0);

  return {
    total: dateRows.reduce((sum, row) => sum + row.prediction, 0),
    peakHour,
    peakTotal,
    routesAboveP95,
    recommendedVehicles,
    coveredRoutes: profileEntries.length,
  };
}

export function loadState(value: number) {
  return value >= 90 ? 'critical' : value >= 68 ? 'warning' : 'normal';
}

export function loadText(value: number) {
  return value >= 90 ? 'Пиковая' : value >= 68 ? 'Высокая' : 'Нормальная';
}

export function hasForecastRoute(routeId: string) {
  return forecastRouteSet.has(routeId);
}
