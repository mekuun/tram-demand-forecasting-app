function chartLoadState(value: number) {
  if (value >= 90) return 'critical';
  if (value >= 68) return 'warning';
  if (value >= 35) return 'normal';
  return 'low';
}

export function ChartPanel({ title, labels, values }: { title: string; labels: string[]; values: number[] }) {
  return (
    <section className="surface chart-panel" id="chart-panel" aria-labelledby="chart-title">
      <header className="surface-header"><div><p className="kicker">Динамика</p><h3 id="chart-title">{title}</h3></div><p className="chart-unit">Относительная интенсивность, %</p></header>
      <div className="chart-area"><div className="chart-scale" aria-hidden="true"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div className="chart" role="img" aria-label="График прогнозного пассажиропотока">{values.map((value, index) => <div className="bar-column" key={`${labels[index]}-${index}`}><button type="button" className={`bar ${chartLoadState(value)}`} style={{ height: `${value}%` }} data-value={`${value}%`} aria-label={`${labels[index]}: ${value}% от пикового значения`} /><span className="bar-label">{labels[index]}</span></div>)}</div></div>
    </section>
  );
}
