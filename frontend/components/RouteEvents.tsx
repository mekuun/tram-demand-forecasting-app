import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { type RouteEvent } from '../app/data';

type Props = {
  events?: RouteEvent[];
};

export function RouteEvents({ events: apiEvents }: Props) {
  const events = [...(apiEvents ?? [])].sort((left, right) => right.popularity - left.popularity);
  const [showAll, setShowAll] = useState(false);
  if (events.length === 0) return null;
  const visibleEvents = showAll ? events : events.slice(0, 3);

  return (
    <section className="surface route-events-card" aria-labelledby="route-events-title">
      <div className="route-section-heading"><div><p className="kicker">Внешние факторы</p><h4 id="route-events-title">Ближайшие события</h4></div><CalendarDays size={20} aria-hidden="true" /></div>
      <div className="route-event-list">{visibleEvents.map((event) => <article key={`${event.start}-${event.name}`}><div><strong>{event.name}</strong><span>{event.venue} · {event.time}</span></div><b>{event.popularityLabel}</b></article>)}{events.length > 3 && <button className="route-event-more" type="button" onClick={() => setShowAll((current) => !current)}>{showAll ? 'Скрыть события' : `Ещё события · ${events.length - 3}`}</button>}</div>
    </section>
  );
}
