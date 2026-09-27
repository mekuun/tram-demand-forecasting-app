import { formatForecastNumber, type HeatmapMetric } from '../app/data';

function chartLoadState(value: number) {
  if (value >= 90) return 'critical';
  if (value >= 68) return 'warning';
  if (value >= 35) return 'normal';
  return 'low';
}

type Props = {
  title: string;
  labels: string[];
  values: number[];
  rawValues: number[];
  metric: HeatmapMetric;
  onMetricChange: (metric: HeatmapMetric) => void;
};

const metricLabels: Record<HeatmapMetric, string> = {
  relative: 'Относительная интенсивность',
  absolute: 'Абсолютная интенсивность',
};

export function ChartPanel({ title, labels, values, rawValues, metric, onMetricChange }: Props) {
  const displayValues = metric === 'absolute' ? rawValues : values;
  const maximum = Math.max(...displayValues, 0) || 1;
  const barValues = displayValues.map((value) => (value / maximum) * 100);
  const scaleLabels = metric === 'absolute'
    ? [maximum, maximum * 0.75, maximum * 0.5, maximum * 0.25, 0].map((value) => `${formatForecastNumber(value)} пасс./ч`)
    : ['100%', '75%', '50%', '25%', '0%'];

  return (
    <section className="surface chart-panel" id="chart-panel" aria-labelledby="chart-title">
      <header className="surface-header"><div><p className="kicker">Динамика</p><h3 className="section-title" id="chart-title">{title}</h3></div><div className="chart-header-actions"><div className="heatmap-metrics" role="group" aria-label="Метрика графика">{(Object.keys(metricLabels) as HeatmapMetric[]).map((key) => <button className={metric === key ? 'active' : ''} key={key} type="button" aria-pressed={metric === key} onClick={() => onMetricChange(key)}>{metricLabels[key]}</button>)}</div><p className="chart-unit">{metric === 'absolute' ? 'Пассажиров в час' : 'Доля от пикового значения, %'}</p></div></header>
      <div className="chart-area"><div className="chart-scale" aria-hidden="true">{scaleLabels.map((label) => <span key={label}>{label}</span>)}</div><div className="chart" role="img" aria-label={`График прогнозного пассажиропотока: ${metricLabels[metric].toLowerCase()}`}>{barValues.map((barValue, index) => <div className="bar-column" key={`${labels[index]}-${index}`}><div className="bar-track"><button type="button" className={`bar ${chartLoadState(barValue)}`} style={{ height: `${barValue}%` }} data-value={metric === 'absolute' ? `${formatForecastNumber(displayValues[index] ?? 0)} пасс./ч` : `${Math.round(displayValues[index] ?? 0)}%`} aria-label={`${labels[index]}: ${metric === 'absolute' ? `${formatForecastNumber(displayValues[index] ?? 0)} пассажиров в час` : `${Math.round(displayValues[index] ?? 0)}% от пикового значения`}`} /></div><span className="bar-label">{labels[index]}</span></div>)}</div></div>
    </section>
  );
}
