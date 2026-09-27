'use client';

type Props = {
  id: string;
  value: number;
  onChange: (value: number) => void;
};

export function MlWeightControl({ id, value, onChange }: Props) {
  return (
    <section className="surface ml-weight-control" aria-labelledby={`${id}-title`}>
      <div className="ml-weight-heading">
        <div><p className="kicker">Настройка прогноза</p><h3 id={`${id}-title`}>Коэффициент ML-поправки</h3><small>Итог = статистический прогноз + коэффициент × ML-поправка</small></div>
        <output htmlFor={id}>{value.toFixed(2).replace('.', ',')}</output>
      </div>
      <input id={id} type="range" min="0" max="1" step="0.05" value={value} aria-label="Коэффициент ML-поправки" aria-valuetext={`${Math.round(value * 100)}% ML-поправки`} onChange={(event) => onChange(Number(event.target.value))} />
      <div className="ml-weight-scale"><span>0 · Статистический прогноз</span><span>1 · ML-прогноз</span></div>
    </section>
  );
}
