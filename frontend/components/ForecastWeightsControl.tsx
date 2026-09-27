'use client';

type Props = {
  id: string;
  seasonStrength: number;
  weatherStrength: number;
  eventStrength: number;
  onSeasonStrengthChange: (value: number) => void;
  onWeatherStrengthChange: (value: number) => void;
  onEventStrengthChange: (value: number) => void;
};

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function ForecastWeightsControl({
  id,
  seasonStrength,
  weatherStrength,
  eventStrength,
  onSeasonStrengthChange,
  onWeatherStrengthChange,
  onEventStrengthChange,
}: Props) {
  return (
    <section className="surface forecast-weights-control" aria-labelledby={`${id}-title`}>
      <div className="forecast-weights-title">
        <p className="kicker">Настройка прогноза</p>
        <h3 className="section-title" id={`${id}-title`}>Коэффициенты модели</h3>
        <div className="forecast-weights-legend" aria-label="Шкала силы поправки">
          <span><b>0%</b> отключает фактор</span>
          <span><b>100%</b> воспроизводит расчёт модели</span>
          <span><b>200%</b> усиливает поправку</span>
        </div>
      </div>
      <div className="forecast-weights-grid">
        <div className="weight-control">
          <div className="weight-control-heading">
            <div><strong>Сезонность</strong><small>Сезонный индекс маршрута и даты</small></div>
            <output htmlFor={`${id}-season`}>{percent(seasonStrength)}</output>
          </div>
          <input id={`${id}-season`} type="range" min="0" max="2" step="0.05" value={seasonStrength} aria-label="Сила сезонной поправки" aria-valuetext={`${percent(seasonStrength)} сезонной поправки`} onChange={(event) => onSeasonStrengthChange(Number(event.target.value))} />
          <div className="weight-control-scale"><span>0 · без сезона</span><span>100 · модель</span><span>200 · усиление</span></div>
        </div>
        <div className="weight-control">
          <div className="weight-control-heading">
          <div><strong>Погода</strong><small>Погодный коэффициент маршрута и даты</small></div>
            <output htmlFor={`${id}-weather`}>{percent(weatherStrength)}</output>
          </div>
          <input id={`${id}-weather`} type="range" min="0" max="2" step="0.05" value={weatherStrength} aria-label="Сила погодной поправки" aria-valuetext={`${percent(weatherStrength)} погодной поправки`} onChange={(event) => onWeatherStrengthChange(Number(event.target.value))} />
          <div className="weight-control-scale"><span>0 · без погоды</span><span>100 · модель</span><span>200 · усиление</span></div>
        </div>
        <div className="weight-control">
          <div className="weight-control-heading">
            <div><strong>События</strong><small>Плановые изменения и городские события</small></div>
            <output htmlFor={`${id}-event`}>{percent(eventStrength)}</output>
          </div>
          <input id={`${id}-event`} type="range" min="0" max="2" step="0.05" value={eventStrength} aria-label="Сила поправки событий" aria-valuetext={`${percent(eventStrength)} поправки событий`} onChange={(event) => onEventStrengthChange(Number(event.target.value))} />
          <div className="weight-control-scale"><span>0 · без событий</span><span>100 · модель</span><span>200 · усиление</span></div>
        </div>
      </div>
    </section>
  );
}
