export function MetricGrid({ labels, metrics, notes }: { labels: string[]; metrics: string[]; notes: string[] }) {
  return <div className="metrics" aria-label="Ключевые показатели">{labels.map((label, index) => <article key={label}><span>{label}</span><strong className={index === 2 ? 'metric-alert' : ''}>{metrics[index]}</strong><small>{notes[index]}</small></article>)}</div>;
}
