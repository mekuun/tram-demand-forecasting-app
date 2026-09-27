'use client';

import { useMemo } from 'react';
import { type HeatmapMetric, type HeatmapRow } from '../app/data';
import { RouteBadge } from './RouteBadge';

type Props = {
  activeRouteId: string | null;
  hour: number;
  metric: HeatmapMetric;
  onMetricChange: (metric: HeatmapMetric) => void;
  rows: HeatmapRow[];
  onHourChange: (hour: number) => void;
  onRouteSelect: (routeId: string) => void;
};

const metricLabels: Record<HeatmapMetric, string> = {
  relative: 'Относительно пика ветки',
  absolute: 'Абсолютный поток',
};

function heatClass(intensity: number, prediction: number) {
  if (prediction <= 0) return 'empty';
  if (intensity >= 90) return 'critical';
  if (intensity >= 68) return 'warning';
  if (intensity >= 35) return 'normal';
  return 'low';
}

export function HeatmapPanel({ activeRouteId, hour, metric, onMetricChange, rows: apiRows, onHourChange, onRouteSelect }: Props) {
  const rows = useMemo(() => {
    const visibleRows = apiRows.filter((row) => row.routeId !== '5');
    const networkMaximum = Math.max(...visibleRows.flatMap((row) => row.values.map((cell) => cell.prediction)), 0) || 1;
    return visibleRows.map((row) => {
      const routePeak = Math.max(...row.values.map((cell) => cell.prediction), 0) || 1;
      return {
        ...row,
        values: row.values.map((cell) => {
          const intensity = metric === 'absolute'
            ? (cell.prediction / networkMaximum) * 100
            : (cell.prediction / routePeak) * 100;
          const label = metric === 'absolute'
            ? `${Math.round(cell.prediction)} пасс./ч`
            : `${Math.round(intensity)}% от пика ветки`;
          return { ...cell, intensity, label };
        }),
      };
    });
  }, [apiRows, metric]);

  function selectCell(routeId: string, selectedHour: number) {
    onRouteSelect(routeId);
    onHourChange(selectedHour);
  }

  return (
    <section className="surface heatmap-panel" id="heatmap-panel" aria-labelledby="heatmap-title">
      <header className="surface-header heatmap-header">
        <div><p className="kicker">Сеть по часам</p><h2 className="section-title" id="heatmap-title">Тепловая карта маршрутов</h2></div>
        <div className="heatmap-metrics" role="group" aria-label="Метрика тепловой карты">
          {(Object.keys(metricLabels) as HeatmapMetric[]).map((key) => <button className={metric === key ? 'active' : ''} key={key} type="button" aria-pressed={metric === key} onClick={() => onMetricChange(key)}>{metricLabels[key]}</button>)}
        </div>
      </header>
      <div className="heatmap-explainer"><span>Нажмите на ячейку, чтобы выбрать маршрут и час</span><span><i className="heatmap-legend low" />Низкая</span><span><i className="heatmap-legend normal" />Обычная</span><span><i className="heatmap-legend warning" />Высокая</span><span><i className="heatmap-legend critical" />Пиковая</span></div>
      <div className="heatmap-scroll">
        <div className="heatmap-grid" role="grid" aria-label={`Тепловая карта: ${metricLabels[metric]}`}>
          <div className="heatmap-corner" aria-hidden="true">Маршрут</div>
          {Array.from({ length: 24 }, (_, columnHour) => <button className={`heatmap-hour${columnHour === hour ? ' selected' : ''}`} key={columnHour} type="button" aria-label={`Выбрать ${String(columnHour).padStart(2, '0')}:00`} aria-pressed={columnHour === hour} onClick={() => onHourChange(columnHour)}>{String(columnHour).padStart(2, '0')}</button>)}
          {rows.map((row) => (
            <div className={`heatmap-row${row.routeId === activeRouteId ? ' selected' : ''}`} role="row" key={row.routeId}>
              <button className="heatmap-route" type="button" title={row.routeName} onClick={() => onRouteSelect(row.routeId)}><RouteBadge number={row.routeId} color={row.routeColor} small /><span>{row.routeName}</span></button>
              {row.values.map((cell) => {
                const state = heatClass(cell.intensity, cell.prediction);
                const value = metric === 'absolute'
                  ? cell.prediction >= 1000 ? `${(cell.prediction / 1000).toFixed(1)}к` : Math.round(cell.prediction)
                  : Math.round(cell.intensity);
                return <button className={`heatmap-cell ${state}${cell.hour === hour ? ' selected-hour' : ''}`} key={cell.hour} type="button" role="gridcell" title={`№ ${row.routeId} · ${String(cell.hour).padStart(2, '0')}:00 · ${cell.label}`} aria-label={`Маршрут ${row.routeId}, ${String(cell.hour).padStart(2, '0')}:00, ${cell.label}`} onClick={() => selectCell(row.routeId, cell.hour)}><span>{state === 'empty' ? '—' : value}</span></button>;
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
