import { loadState, loadText, type StopData } from '../app/data';
import { RouteBadge } from './RouteBadge';

export function StopsTable({ stops, routeId, routeColor }: { stops: StopData[]; routeId: string; routeColor: string }) {
  return (
    <section className="surface table-panel" id="stops-table" aria-labelledby="table-title">
      <header className="surface-header"><div><p className="kicker">Детализация</p><h3 id="table-title">Остановки маршрута</h3></div></header>
      <div className="table-scroll"><table><thead><tr><th>Остановка</th><th>Интенсивность</th><th>Статус</th><th>Рекомендация</th></tr></thead><tbody>{stops.map((stop) => { const state = loadState(stop.load); const advice = state === 'critical' ? 'Добавить вагон' : state === 'warning' ? 'Контроль интервала' : 'Без изменений'; return <tr key={stop.id}><td><span className="table-stop"><RouteBadge number={routeId} color={routeColor} small />{stop.name}</span></td><td><span className="load-value">{stop.load}%</span></td><td><span className="inline-status"><i className={`status-mark status-${state}`} />{loadText(stop.load)}</span></td><td>{advice}</td></tr>; })}</tbody></table></div>
    </section>
  );
}
