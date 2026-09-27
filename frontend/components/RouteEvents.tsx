import { CalendarDays } from 'lucide-react';
import { getRouteEvents, type RouteEvent } from '../app/data';

type Props = {
  routeId: string;
  date: string;
  events?: RouteEvent[];
};

export function RouteEvents({ routeId, date, events: apiEvents }: Props) {
  const events = [...(apiEvents ?? getRouteEvents(routeId, date))].sort((left, right) => right.popularity - left.popularity);
  if (events.length === 0) return null;

  return (
    <section className="surface route-events-card" aria-labelledby="route-events-title">
      <div className="route-section-heading"><div><p className="kicker">Внешние факторы</p><h4 id="route-events-title">Ближайшие события</h4></div><CalendarDays size={20} aria-hidden="true" /></div>
      <div className="route-event-list">{events.slice(0, 3).map((event) => <article key={`${event.start}-${event.name}`}><div><strong>{event.name}</strong><span>{event.venue} · {event.time}</span></div><b>Индекс влияния {Math.round(event.popularity * 100)}%</b></article>)}{events.length > 3 && <small>Ещё событий: {events.length - 3}</small>}</div>
      <p className="route-events-note">Индекс влияния — относительная оценка масштаба события по шкале 0–100. Он не означает рост пассажиропотока на указанный процент.</p>
    </section>
  );
}
