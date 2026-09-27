import { type TramRoute, type TramStop } from '../app/data';

export function RouteStops({ route, stops }: { route: TramRoute; stops: TramStop[] }) {
  const stopById = new Map(stops.map((stop) => [stop.id, stop]));
  const stopNames = [...new Set(route.directions.flatMap((direction) => direction.stopIds
    .map((id) => stopById.get(id)?.name)
    .filter((name): name is string => Boolean(name))))];

  return (
    <section className="surface route-stops route-stops-card" aria-labelledby="route-stops-title">
      <div className="route-stops-heading"><div><p className="kicker">Последовательность движения</p><h4 id="route-stops-title">Остановки маршрута</h4></div><span>{stopNames.length} остановок</span></div>
      <div className="route-stop-list">{stopNames.map((name, index) => <span key={`${name}-${index}`}>{name}</span>)}</div>
    </section>
  );
}
