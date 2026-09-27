import { Activity, Clock3, ListChecks, TramFront } from 'lucide-react';
import { formatForecastNumber, type OperationalSummary as OperationalSummaryData } from '../app/data';

type Props = {
  dateLabel: string;
  summary: OperationalSummaryData;
};

export function OperationalSummary({ dateLabel, summary }: Props) {
  const items = [
    {
      label: 'Прогноз сети',
      value: formatForecastNumber(summary.total),
      unit: 'пассажиров за день',
      note: 'Сумма всех почасовых предиктов, полученных от backend.',
      icon: Activity,
      tone: 'neutral',
    },
    {
      label: 'Пиковый час сети',
      value: `${String(summary.peakHour).padStart(2, '0')}:00`,
      unit: `${formatForecastNumber(summary.peakTotal)} пасс./ч`,
      note: 'Час с максимальной суммой прогнозов всех веток на выбранную дату.',
      icon: Clock3,
      tone: 'neutral',
    },
    {
      label: 'Маршруты с прогнозом',
      value: String(summary.coveredRoutes),
      unit: 'веток с прогнозом',
      note: 'Для этих веток доступны почасовой прогноз и оценка необходимого выпуска.',
      icon: ListChecks,
      tone: 'positive',
    },
    {
      label: 'Оценка необходимого выпуска',
      value: String(summary.recommendedVehicles),
      unit: 'активных вагона',
      note: `Пиковый прогноз каждой из ${summary.coveredRoutes} веток разделён на её среднее число посадок на активный вагон-час.`,
      icon: TramFront,
      tone: 'accent',
    },
  ];

  return (
    <section className="operations-summary" id="operations-summary" aria-labelledby="operations-title">
      <div className="operations-summary-heading surface">
        <div>
          <p className="kicker">Состояние всей транспортной сети</p>
          <h2 className="section-title" id="operations-title">Оперативная сводка</h2>
        </div>
        <p>{dateLabel}</p>
      </div>
      <div className="operations-summary-grid">
        {items.map(({ label, value, unit, note, icon: Icon, tone }) => (
          <article className={`operations-card operations-card-${tone}`} key={label}>
            <div className="operations-card-label"><Icon size={18} aria-hidden="true" /><span>{label}</span></div>
            <strong>{value}</strong>
            <span className="operations-card-unit">{unit}</span>
            <small>{note}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
