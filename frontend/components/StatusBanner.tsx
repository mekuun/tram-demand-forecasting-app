import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { loadState } from '../app/data';

export function StatusBanner({ load }: { load: number }) {
  const state = loadState(load);
  const title = state === 'critical' ? 'Возможно переполнение' : state === 'warning' ? 'Интервал требует контроля' : 'Движение по расписанию';
  return <div className={`status-banner status-banner-${state}`}>{state === 'normal' ? <CheckCircle2 size={20} aria-hidden="true" /> : <AlertTriangle size={20} aria-hidden="true" />}<div><strong>{title}</strong><p>Ожидается интенсивность до {load}% от пикового значения.</p></div></div>;
}
