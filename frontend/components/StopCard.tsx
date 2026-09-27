import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { loadState, type StopData } from '../app/data';
import { StatusBanner } from './StatusBanner';

export function StopCard({ stop }: { stop: StopData }) {
  const state = loadState(stop.load);
  const recommendation = state === 'critical' ? 'Добавить один вагон на линию в час пик.' : state === 'warning' ? 'Контролировать интервал и подготовить резерв.' : 'Сохранить текущий выпуск вагонов.';
  return (
    <aside className="surface stop-details" aria-labelledby="selected-stop-title">
      <div className="alert-row"><span className={`alert-symbol ${state}`} aria-hidden="true">{state === 'normal' ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}</span><div><p className={`kicker ${state}`}>{state === 'normal' ? 'Движение стабильно' : 'Требует внимания'}</p><h3 id="selected-stop-title">{stop.name}</h3></div></div>
      <dl className="stop-stats"><div><dt>ID остановки</dt><dd>{stop.id}</dd></div><div><dt>Индекс потока</dt><dd className={`large-value ${state}`}>{stop.load}%</dd></div></dl>
      <StatusBanner load={stop.load} />
      <div className="recommendation"><span>Рекомендация</span><p>{recommendation}</p></div>
    </aside>
  );
}
