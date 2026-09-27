import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { formatForecastNumber, getRoutePlanningProfile, hasForecastRoute, loadState, type RouteForecast, type TramRoute } from '../app/data';

type Props = {
  route: TramRoute;
  forecast: RouteForecast;
  hour: number;
  onHourChange: (hour: number) => void;
};

function hourLabel(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function RouteCard({ route, forecast, hour, onHourChange }: Props) {
  const state = loadState(forecast.peakShare);
  const hasForecast = hasForecastRoute(route.number);
  const profile = getRoutePlanningProfile(route.number);
  const recommendedVehicles = profile && forecast.peak > 0 ? Math.ceil(forecast.peak / profile.boardingsPerVehicleMean) : null;
  const situation = !hasForecast ? 'Нет прогноза по ветке' : forecast.currentVsAverage >= 115 ? 'Выше обычной нагрузки' : forecast.currentVsAverage <= 85 ? 'Ниже обычной нагрузки' : 'В пределах обычной нагрузки';
  const recommendation = !hasForecast ? 'Выберите ветку с готовым прогнозом для оценки нагрузки.' : state === 'critical' ? 'Подготовить дополнительный выпуск на пиковый час.' : state === 'warning' ? 'Контролировать интервал движения.' : 'Сохранить текущий выпуск вагонов.';

  return (
    <aside className="surface route-details" id="stops-table" aria-label={`Подробности ветки ${route.number}: ${route.name}`}>
      <div className="route-hour-picker">
        <div className="route-hour-picker-copy"><span>Час прогноза</span><strong>{hourLabel(hour)}</strong></div>
        <button type="button" aria-label="Предыдущий час" disabled={hour <= 0} onClick={() => onHourChange(hour - 1)}><ChevronLeft size={20} aria-hidden="true" /></button>
        <input type="range" min="0" max="23" value={hour} aria-label="Час прогноза для выбранной ветки" aria-valuetext={hourLabel(hour)} onChange={(event) => onHourChange(Number(event.target.value))} />
        <button type="button" aria-label="Следующий час" disabled={hour >= 23} onClick={() => onHourChange(hour + 1)}><ChevronRight size={20} aria-hidden="true" /></button>
      </div>
      <div className="route-stats">
        <div><span>Прогноз на сутки</span><strong>{hasForecast ? formatForecastNumber(forecast.dayTotal) : '—'}</strong><small>сумма 24 почасовых предиктов</small></div>
        <div><span>Выбранный час · {hourLabel(hour)}</span><strong>{hasForecast ? `${formatForecastNumber(forecast.current)} пасс./ч` : '—'}</strong><small>{hasForecast ? `${forecast.currentVsAverage}% от среднего в этот час` : 'нет данных'}</small></div>
        <div><span>Пик</span><strong>{hasForecast ? `${formatForecastNumber(forecast.peak)} пасс./ч` : '—'}</strong><small>{hasForecast ? hourLabel(forecast.peakHour) : 'нет данных'}</small></div>
      </div>
      <div className={`route-situation route-situation-${state}`}>
        {state === 'normal' ? <CheckCircle2 size={20} aria-hidden="true" /> : <AlertTriangle size={20} aria-hidden="true" />}
        <div><strong>{situation}</strong><p>{recommendation}</p></div>
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
            <strong>{recommendedVehicles !== null ? `${recommendedVehicles} ваг.` : '—'}</strong>
            <small>{profile && hasForecast ? `${formatForecastNumber(forecast.peak)} ÷ ${formatForecastNumber(profile.boardingsPerVehicleMean)} посадок на активный вагон-час, округлено вверх.` : 'Недостаточно данных для расчёта.'}</small>
          </div>
        </div>
        <p className="route-history-note">Это диспетчерский ориентир по фактической работе вагонов в сентябре–октябре 2025 года, а не норматив вместимости салона.</p>
      </section>
    </aside>
  );
}
