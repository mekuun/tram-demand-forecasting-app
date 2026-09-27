'use client';

import { Download } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { BottomNavigation } from '../components/BottomNavigation';
import { ChartPanel } from '../components/ChartPanel';
import { ForecastSearch } from '../components/ForecastSearch';
import { Header } from '../components/Header';
import { HeatmapPanel } from '../components/HeatmapPanel';
import { MapPanel } from '../components/MapPanel';
import { OperationalSummary } from '../components/OperationalSummary';
import { RouteCard } from '../components/RouteCard';
import { RouteBadge } from '../components/RouteBadge';
import { RouteEvents } from '../components/RouteEvents';
import { RouteStops } from '../components/RouteStops';
import { getDashboard, getDayExportUrl } from './api';
import { availableForecastRouteIds, forecastData, getForecastData, getOperationalSummary, getRouteForecast, routes, tramRoutes, type RouteId } from './data';
import type { DashboardResponse } from './data';

const defaultRouteId = availableForecastRouteIds.includes('17') ? '17' : (availableForecastRouteIds[0] ?? '17');

export default function Home() {
  const [selectedRouteId, setSelectedRouteId] = useState<RouteId>(defaultRouteId);
  const [activeMapRouteId, setActiveMapRouteId] = useState<RouteId | null>(null);
  const [draftDate, setDraftDate] = useState(forecastData.day.inputValue);
  const [appliedDate, setAppliedDate] = useState(forecastData.day.inputValue);
  const [hour, setHour] = useState(18);
  const [toast, setToast] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  const route = routes[selectedRouteId] ?? routes[defaultRouteId];
  const fallbackData = getForecastData('day', selectedRouteId, appliedDate);
  const data = dashboard ? {
    ...fallbackData,
    context: dashboard.forecast.context,
    labels: dashboard.forecast.labels,
    rawValues: dashboard.forecast.rawValues,
    values: dashboard.forecast.values,
    metrics: [new Intl.NumberFormat('ru-RU').format(Math.round(dashboard.forecast.total)), `${String(dashboard.forecast.peakHour).padStart(2, '0')}:00`, `${new Intl.NumberFormat('ru-RU').format(Math.round(dashboard.forecast.peak))} пасс./ч`, `${dashboard.forecast.points} точек`],
    metricNotes: ['ответ backend', 'максимум маршрута', 'готовый прогноз', 'из API'],
  } : fallbackData;
  const fallbackOperationalSummary = useMemo(() => getOperationalSummary(appliedDate), [appliedDate]);
  const operationalSummary = dashboard?.summary ?? fallbackOperationalSummary;
  const referenceDate = appliedDate;
  const fallbackRouteForecasts = useMemo(() => availableForecastRouteIds.map((routeId) => getRouteForecast(routeId, referenceDate, hour)), [hour, referenceDate]);
  const routeForecasts = dashboard?.routeForecasts ?? fallbackRouteForecasts;
  const selectedForecast = routeForecasts.find((forecast) => forecast.routeId === selectedRouteId) ?? getRouteForecast(selectedRouteId, referenceDate, hour);
  const selectedRoute = tramRoutes.find((tramRoute) => tramRoute.number === selectedRouteId) ?? tramRoutes[0];

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setDashboard(null);
      setApiLoading(true);
      setApiError(null);
      try {
        const result = await getDashboard(appliedDate, selectedRouteId, hour);
        if (!cancelled) setDashboard(result);
      } catch (error: unknown) {
        if (!cancelled) {
          setDashboard(null);
          setApiError(error instanceof Error ? error.message : 'Backend недоступен');
        }
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [appliedDate, hour, selectedRouteId]);

  function changeDate(value: string) {
    setDraftDate(value);
    setAppliedDate(value);
  }

  function selectRouteFromMap(routeId: RouteId) {
    if (!routes[routeId] || !availableForecastRouteIds.includes(routeId)) return;
    setSelectedRouteId(routeId);
    setActiveMapRouteId(routeId);
  }

  function exportCsv() {
    if (dashboard) {
      const link = document.createElement('a');
      link.href = getDayExportUrl(appliedDate, selectedRouteId);
      link.download = `forecast-route-${selectedRouteId}-day.csv`;
      link.click();
      setToast(true);
      window.setTimeout(() => setToast(false), 2400);
      return;
    }
    const rows = ['маршрут,период,метка,прогноз_пассажиров_в_час', ...data.labels.map((label, index) => `${selectedRouteId},day,${label},${data.rawValues[index] ?? 0}`)];
    const blob = new Blob([`\uFEFF${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `forecast-route-${selectedRouteId}-day.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setToast(true);
    window.setTimeout(() => setToast(false), 2400);
  }

  return (
    <main className="app-shell" style={{ '--blue': route.color } as CSSProperties}>
      <a className="skip-link" href="#dashboard">Перейти к прогнозу</a>
      <Header />
      <div id="dashboard">
        <ForecastSearch dateValue={draftDate} onDateChange={changeDate} />
        {apiLoading && <div className="content-width api-status" role="status">Обновляем данные из backend…</div>}
        {apiError && <div className="content-width api-status api-status-error" role="alert">Backend недоступен — показаны локальные данные. {apiError}</div>}
        <section className="dashboard-section content-width data-content" aria-live="polite">
          <OperationalSummary dateLabel={data.context} summary={operationalSummary} />
          <MapPanel routeForecasts={routeForecasts} activeRouteId={activeMapRouteId} hour={hour} showTimeline={data.timeline} onHourChange={setHour} onRouteSelect={selectRouteFromMap} />
          <HeatmapPanel date={appliedDate} activeRouteId={selectedRouteId} hour={hour} rows={dashboard?.heatmap} onHourChange={setHour} onRouteSelect={selectRouteFromMap} />
          <section className="selected-route-section" aria-labelledby="selected-route-section-title">
            <header className="selected-route-heading">
              <div className="selected-route-heading-main"><RouteBadge number={selectedRoute.number} color={selectedRoute.color} small /><div><p className="kicker">Выбранная ветка · {data.context}</p><h2 id="selected-route-section-title">{selectedRoute.name}</h2></div></div>
              <button className="button button-secondary" type="button" onClick={exportCsv}><Download size={18} aria-hidden="true" />Скачать CSV</button>
            </header>
            <RouteEvents routeId={selectedRoute.number} date={appliedDate} events={dashboard?.events} />
            <RouteStops route={selectedRoute} />
            <ChartPanel title={data.chartTitle} labels={data.labels} values={data.values} />
            <RouteCard route={selectedRoute} forecast={selectedForecast} hour={hour} onHourChange={setHour} />
          </section>
        </section>
      </div>
      <footer className="site-footer"><div className="content-width"><span>Поток · Сервис прогноза трамвайных маршрутов</span></div></footer>
      <BottomNavigation />
      <div className={`toast ${toast ? 'visible' : ''}`} role="status" aria-live="polite">Файл CSV скачан</div>
    </main>
  );
}
