'use client';

import { useEffect, useState } from 'react';
import { Github } from 'lucide-react';
import { Header } from '../components/Header';
import { ChartPanel } from '../components/ChartPanel';
import { ForecastSearch } from '../components/ForecastSearch';
import { ForecastWeightsControl } from '../components/ForecastWeightsControl';
import { HeatmapPanel } from '../components/HeatmapPanel';
import { MapPanel } from '../components/MapPanel';
import { OperationalSummary } from '../components/OperationalSummary';
import { RouteCard } from '../components/RouteCard';
import { RouteBadge } from '../components/RouteBadge';
import { RouteEvents } from '../components/RouteEvents';
import { RouteStops } from '../components/RouteStops';
import { getDashboard, getDayExportUrl, getMeta } from './api';
import {
  type ApiMeta,
  type DashboardResponse,
  type HeatmapMetric,
  type RouteId,
  type TramRoute,
} from './data';

const DEFAULT_ROUTE_ID: RouteId = '17';
const EMPTY_ROUTE: TramRoute = { id: '', number: '', name: '', color: '#7d898f', directions: [] };

export default function Home() {
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<RouteId>('');
  const [activeMapRouteId, setActiveMapRouteId] = useState<RouteId | null>(null);
  const [draftDate, setDraftDate] = useState('');
  const [appliedDate, setAppliedDate] = useState('');
  const [hour, setHour] = useState(18);
  const [metric, setMetric] = useState<HeatmapMetric>('relative');
  const [seasonStrength, setSeasonStrength] = useState(1);
  const [weatherStrength, setWeatherStrength] = useState(1);
  const [eventStrength, setEventStrength] = useState(1);
  const [apiError, setApiError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      try {
        const nextMeta = await getMeta();
        if (cancelled) return;

        const defaultRoute = nextMeta.forecastRoutes.includes(DEFAULT_ROUTE_ID)
          ? DEFAULT_ROUTE_ID
          : nextMeta.forecastRoutes[0] ?? '';
        const defaultDate = nextMeta.defaultDate ?? nextMeta.dateMax ?? nextMeta.dateMin ?? '';

        setMeta(nextMeta);
        setSelectedRouteId(defaultRoute);
        setDraftDate(defaultDate);
        setAppliedDate(defaultDate);
        setApiError('');
      } catch (error) {
        if (cancelled) return;
        setApiError(error instanceof Error ? error.message : 'Не удалось получить метаданные');
      }
    }

    void loadMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!meta || !selectedRouteId || !appliedDate) return;

    let cancelled = false;

    async function loadDashboard() {
      try {
        const nextDashboard = await getDashboard(
          appliedDate,
          selectedRouteId,
          hour,
          seasonStrength,
          weatherStrength,
          eventStrength,
        );
        if (cancelled) return;
        setDashboard(nextDashboard);
        setApiError('');
      } catch (error) {
        if (cancelled) return;
        setDashboard(null);
        setApiError(error instanceof Error ? error.message : 'Не удалось получить данные прогноза');
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [appliedDate, eventStrength, hour, meta, seasonStrength, selectedRouteId, weatherStrength]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const apiRoute = meta?.routes.find((item) => item.number === selectedRouteId);
  const route = apiRoute ?? meta?.routes[0] ?? EMPTY_ROUTE;

  const forecast = dashboard?.forecast;
  const selectedForecast = dashboard?.routeForecasts.find((item) => item.routeId === selectedRouteId);
  const planningProfile =
    dashboard?.planningProfiles[selectedRouteId] ?? meta?.planningProfiles[selectedRouteId] ?? null;

  function selectRoute(routeId: RouteId) {
    if (!meta?.forecastRoutes.includes(routeId)) return;
    setSelectedRouteId(routeId);
    setActiveMapRouteId(routeId);
  }

  function exportDay() {
    if (!appliedDate || !selectedRouteId) return;
    window.open(getDayExportUrl(appliedDate, selectedRouteId, seasonStrength, weatherStrength, eventStrength), '_blank');
    setToast('Экспорт прогноза подготовлен');
  }

  return (
    <main className="app-shell">
      <Header />

      <div className="app-content" id="dashboard">
        <ForecastSearch
          dateValue={draftDate}
          minDate={meta?.dateMin ?? ''}
          maxDate={meta?.dateMax ?? ''}
          onDateChange={setDraftDate}
        />

        <ForecastWeightsControl
          id="forecast-weights"
          seasonStrength={seasonStrength}
          weatherStrength={weatherStrength}
          eventStrength={eventStrength}
          onSeasonStrengthChange={setSeasonStrength}
          onWeatherStrengthChange={setWeatherStrength}
          onEventStrengthChange={setEventStrength}
        />

        {apiError && <div className="api-status api-status-error" aria-live="polite">{apiError}</div>}

        {forecast && dashboard && selectedForecast ? (
          <>
            <OperationalSummary dateLabel={forecast.context} summary={dashboard.summary} />

            <section className="dashboard-section dashboard-section--map" id="map">
              <MapPanel
                routes={meta?.routes ?? []}
                stops={meta?.stops ?? []}
                geometries={meta?.geometries ?? {}}
                activeRouteId={activeMapRouteId}
                selectedRouteId={selectedRouteId}
                routeForecasts={dashboard.routeForecasts}
                hour={hour}
                metric={metric}
                showTimeline
                onHourChange={setHour}
                onMetricChange={setMetric}
                onRouteSelect={selectRoute}
              />
            </section>

            <section className="dashboard-section" id="heatmap">
              <HeatmapPanel
                activeRouteId={activeMapRouteId}
                hour={hour}
                metric={metric}
                onMetricChange={setMetric}
                rows={dashboard.heatmap}
                onHourChange={setHour}
                onRouteSelect={selectRoute}
              />
            </section>

            <section className="dashboard-section" id="route-summary">
              <div className="section-heading route-summary-heading">
                <div className="route-summary-title">
                  <RouteBadge number={route.number} color={route.color} />
                  <div>
                    <span className="eyebrow">СВОДКА ПО МАРШРУТУ</span>
                    <h2 className="section-title">Маршрут {route.number}</h2>
                  </div>
                </div>
                <button className="button button-secondary" onClick={exportDay} type="button">
                  Скачать CSV
                </button>
              </div>
              <RouteCard
                forecast={selectedForecast}
                profile={planningProfile}
                hasForecast={Boolean(selectedForecast)}
                route={route}
                hour={hour}
                onHourChange={setHour}
              />
            </section>

            <section className="dashboard-section" id="stops">
              <RouteStops route={route} stops={meta?.stops ?? []} />
            </section>

            <section className="dashboard-section" id="events">
              <RouteEvents events={dashboard.events} />
            </section>

            <section className="dashboard-section" id="chart">
              <ChartPanel
                title="Пассажиропоток по часам"
                context={forecast.context}
                labels={forecast.labels}
                values={forecast.values}
                rawValues={forecast.rawValues}
                metric={metric}
                onMetricChange={setMetric}
              />
            </section>

          </>
        ) : (
          <div className="api-empty-state">
            <h2>{apiError ? 'Не удалось загрузить прогноз' : 'Загружаем прогноз'}</h2>
            <p>
              {apiError
                ? 'Проверьте доступность backend и повторите загрузку страницы.'
                : 'Получаем расчёты, события и погодные поправки из backend.'}
            </p>
          </div>
        )}

      <footer className="site-footer">
        <div className="content-width">
          <div className="footer-copy">
            <div className="footer-brandline">
              <strong>Поток · Сервис прогноза трамвайных маршрутов</strong>
            </div>
            <div className="footer-teamline">
              <span className="footer-team-label"><Github size={18} aria-hidden="true" /> Команда на GitHub</span>
              <div className="footer-nicks">
                <a href="https://github.com/s-ovsyannikova" target="_blank" rel="noreferrer"><Github size={15} aria-hidden="true" />s-ovsyannikova</a>
                <a href="https://github.com/larisayaryzheva" target="_blank" rel="noreferrer"><Github size={15} aria-hidden="true" />larisayaryzheva</a>
                <a href="https://github.com/mekkun" target="_blank" rel="noreferrer"><Github size={15} aria-hidden="true" />mekkun</a>
              </div>
            </div>
            <p className="footer-credit">Разработано командой ShrenonInc в рамках Хакатона Московского транспорта 2026</p>
          </div>
        </div>
      </footer>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
