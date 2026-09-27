import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { formatForecastNumber, type RouteForecast, type RoutePlanningProfile, type TramRoute } from '../app/data';

type Props = {
  route: TramRoute;
  forecast: RouteForecast;
  profile: RoutePlanningProfile | null;
  hasForecast: boolean;
  hour: number;
  onHourChange: (hour: number) => void;
};

function hourLabel(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function RouteCard({ route, forecast, profile, hasForecast, hour, onHourChange }: Props) {
  const state = forecast.loadState;
  const loadLabel = hasForecast ? forecast.loadLabel : 'Нет прогноза по ветке';
  const recommendation = hasForecast ? forecast.recommendation : 'Выберите ветку с готовым прогнозом для оценки нагрузки.';

  return (
    <aside className="surface route-details" id="stops-table" aria-label={`Подробности ветки ${route.number}: ${route.name}`}>
      <div className="route-hour-picker">
        <div className="route-hour-picker-copy"><span>Час прогноза</span><strong>{hourLabel(hour)}</strong></div>
        <button type="button" aria-label="Предыдущий час" disabled={hour <= 0} onClick={() => onHourChange(hour - 1)}><ChevronLeft size={20} aria-hidden="true" /></button>
        <input type="range" min="0" max="23" value={hour} aria-label="Час прогноза для выбранной ветки" aria-valuetext={hourLabel(hour)} onChange={(event) => onHourChange(Number(event.target.value))} />
        <button type="button" aria-label="Следующий час" disabled={hour >= 23} onClick={() => onHourChange(hour + 1)}><ChevronRight size={20} aria-hidden="true" /></button>
      </div>
      <div className="route-stats">
        <div className="route-stat-reference"><span>Суммарный поток за дату</span><strong>{hasForecast ? formatForecastNumber(forecast.dayTotal) : '—'}</strong><small>сумма 24 почасовых предиктов · не зависит от выбранного часа</small></div>
        <div className="route-stat-current"><span>Поток в выбранный час</span><strong>{hasForecast ? `${formatForecastNumber(forecast.current)} пасс./ч` : '—'}</strong><small>{hasForecast ? `${hourLabel(hour)} · ${forecast.currentVsAverage}% от среднего в этот час` : 'нет данных'}</small></div>
        <div className="route-stat-reference"><span>Максимум за дату</span><strong>{hasForecast ? `${formatForecastNumber(forecast.peak)} пасс./ч` : '—'}</strong><small>{hasForecast ? `${hourLabel(forecast.peakHour)} · пиковый час маршрута` : 'нет данных'}</small></div>
      </div>
      <div className={`route-situation route-situation-${state}`}>
        {state === 'normal' ? <CheckCircle2 size={20} aria-hidden="true" /> : <AlertTriangle size={20} aria-hidden="true" />}
        <div><strong>{loadLabel}</strong><p>{recommendation}</p></div>
      </div>
      <section className="route-history" aria-labelledby="route-history-title">
        <div className="route-section-heading"><div><p className="kicker">Историческая справка</p><h4 id="route-history-title">Поток и оценка выпуска</h4></div><History size={20} aria-hidden="true" /></div>
        <div className="route-history-grid">
          <div>
            <span>Средний почасовой поток</span>
            <strong>{profile ? `${formatForecastNumber(profile.hourlyMean)} пасс./ч` : '—'}</strong>
            <small>Среднее число успешных валидаций за час на маршруте в январе–октябре 2025 года.</small>
          </div>
          <div>
            <span>Оценка необходимого выпуска</span>
            <strong>{forecast.recommendedVehicles !== null ? `${forecast.recommendedVehicles} ваг.` : '—'}</strong>
            <small>{profile && hasForecast ? `${formatForecastNumber(forecast.peak)} ÷ ${formatForecastNumber(profile.boardingsPerVehicleMean)} посадок на активный вагон-час, округлено вверх.` : 'Недостаточно данных для расчёта.'}</small>
          </div>
        </div>
      </section>
    </aside>
  );
}
