'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, Minus, Plus } from 'lucide-react';
import { tramRoutes, tramStopById, tramStops, type RouteForecast } from '../app/data';
import tramGeometries from '../app/tram-geometries.json';

type YandexGeoObject = {
  events: { add: (event: string, callback: () => void) => void };
};

type YandexGeoObjectCollection = {
  add: (object: YandexGeoObject) => void;
  removeAll: () => void;
};

type YandexMap = {
  geoObjects: YandexGeoObjectCollection;
  container: { fitToViewport: () => void };
  options: { set: (name: string, value: unknown) => void };
  getZoom: () => number;
  setBounds: (bounds: [[number, number], [number, number]], options?: Record<string, unknown>) => void;
  setCenter: (center: [number, number], zoom?: number, options?: Record<string, unknown>) => void;
  setZoom: (zoom: number, options?: Record<string, unknown>) => void;
  destroy: () => void;
};

type YandexMapsApi = {
  ready: (callback: () => void) => void;
  Map: new (element: HTMLElement, state: { center: [number, number]; zoom: number; controls: string[] }, options?: Record<string, unknown>) => YandexMap;
  GeoObjectCollection: new () => YandexGeoObjectCollection;
  Polyline: new (geometry: [number, number][], properties?: Record<string, unknown>, options?: Record<string, unknown>) => YandexGeoObject;
  Placemark: new (geometry: [number, number], properties?: Record<string, unknown>, options?: Record<string, unknown>) => YandexGeoObject;
  templateLayoutFactory: { createClass: (template: string) => unknown };
};

declare global {
  interface Window {
    ymaps?: YandexMapsApi;
  }
}

type Props = {
  routeForecasts: RouteForecast[];
  activeRouteId: string | null;
  hour: number;
  showTimeline: boolean;
  onHourChange: (hour: number) => void;
  onRouteSelect: (routeId: string) => void;
};

function loadYandexMapsApi(apiKey: string) {
  if (typeof window === 'undefined') return Promise.reject(new Error('Yandex Maps API доступен только в браузере'));

  const ready = () => new Promise<YandexMapsApi>((resolve, reject) => {
    if (!window.ymaps) {
      reject(new Error('Яндекс Карты API не загрузился'));
      return;
    }
    window.ymaps.ready(() => resolve(window.ymaps as YandexMapsApi));
  });

  if (window.ymaps) return ready();

  return new Promise<YandexMapsApi>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-yandex-maps-api]');
    const script = existingScript ?? document.createElement('script');
    const onLoad = () => { void ready().then(resolve, reject); };
    const onError = () => reject(new Error('Не удалось загрузить Яндекс Карты API'));
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!existingScript) {
      script.dataset.yandexMapsApi = 'true';
      script.async = true;
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
      document.head.appendChild(script);
    }
  });
}

const routeNumbersByStopId = tramRoutes.reduce((result, route) => {
  route.directions.forEach((direction) => direction.stopIds.forEach((stopId) => {
    const routeNumbers = result.get(stopId) ?? [];
    if (!routeNumbers.includes(route.number)) routeNumbers.push(route.number);
    result.set(stopId, routeNumbers);
  }));
  return result;
}, new Map<string, string[]>());

function loadColor(peakShare: number) {
  return peakShare >= 90 ? '#e53935' : peakShare >= 68 ? '#f28c28' : '#31a354';
}

function routeLinePoints(routeNumber: string, directionIndex: number) {
  const route = tramRoutes.find((item) => item.number === routeNumber);
  if (!route) return [];
  const stopPoints = route.directions[directionIndex]?.stopIds.map((id) => {
    const stop = tramStopById[id];
    return stop ? [stop.lat, stop.lon] as [number, number] : null;
  }).filter((point): point is [number, number] => point !== null) ?? [];
  const generated = (tramGeometries.routes as Record<string, { directions: [number, number][][] }>)[routeNumber]?.directions[directionIndex];
  return generated?.length > 1 ? generated : stopPoints;
}

export function MapPanel({ routeForecasts, activeRouteId, hour, showTimeline, onHourChange, onRouteSelect }: Props) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YandexMap | null>(null);
  const layerRef = useRef<YandexGeoObjectCollection | null>(null);
  const yandexRef = useRef<YandexMapsApi | null>(null);
  const boundsAppliedRef = useRef(false);
  const baseBoundsRef = useRef<[[number, number], [number, number]] | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const forecastByRoute = useMemo(() => new Map(routeForecasts.map((forecast) => [forecast.routeId, forecast])), [routeForecasts]);
  const modelStopIds = useMemo(() => new Set(tramRoutes.flatMap((route) => route.directions.flatMap((direction) => direction.stopIds))), []);
  const activeRouteStopIds = useMemo(() => new Set(
    tramRoutes.find((route) => route.number === activeRouteId)?.directions.flatMap((direction) => direction.stopIds) ?? [],
  ), [activeRouteId]);
  const allRoutePoints = useMemo(() => tramRoutes.flatMap((route) => route.directions.flatMap((_, directionIndex) => routeLinePoints(route.number, directionIndex))), []);
  const yandexApiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? '';

  useEffect(() => {
    let cancelled = false;

    async function loadMap() {
      if (!yandexApiKey) {
        setMapError('Добавьте API-ключ Яндекс Карт в NEXT_PUBLIC_YANDEX_MAPS_API_KEY');
        return;
      }

      try {
        const yandex = await loadYandexMapsApi(yandexApiKey);
        if (cancelled || !mapElementRef.current) return;
        yandexRef.current = yandex;
        const map = new yandex.Map(mapElementRef.current, { center: [55.7558, 37.6173], zoom: 10, controls: [] }, { suppressMapOpenBlock: true });
        map.options.set('suppressMapOpenBlock', true);
        const layers = new yandex.GeoObjectCollection();
        map.geoObjects.add(layers);
        mapRef.current = map;
        layerRef.current = layers;
        setMapReady(true);
        window.setTimeout(() => map.container.fitToViewport(), 0);
      } catch (error) {
        setMapError(error instanceof Error ? error.message : 'Не удалось загрузить Яндекс Карты');
      }
    }

    void loadMap();
    return () => {
      cancelled = true;
      mapRef.current?.destroy();
      mapRef.current = null;
      layerRef.current = null;
      yandexRef.current = null;
      boundsAppliedRef.current = false;
      baseBoundsRef.current = null;
    };
  }, [yandexApiKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || boundsAppliedRef.current || allRoutePoints.length < 2) return;
    const latitudes = allRoutePoints.map(([lat]) => lat);
    const longitudes = allRoutePoints.map(([, lon]) => lon);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...latitudes), Math.min(...longitudes)],
      [Math.max(...latitudes), Math.max(...longitudes)],
    ];
    baseBoundsRef.current = bounds;
    map.setBounds(bounds, { checkZoomRange: true, duration: 350, zoomMargin: 42 });
    boundsAppliedRef.current = true;
  }, [allRoutePoints, mapReady]);

  useEffect(() => {
    const yandex = yandexRef.current;
    const map = mapRef.current;
    const layers = layerRef.current;
    if (!mapReady || !yandex || !map || !layers) return;

    layers.removeAll();
    const markerLayouts = new Map<string, unknown>();
    const routesForDrawing = [...tramRoutes].sort((left, right) => {
      const layerWeight = (route: typeof left) => route.number === activeRouteId ? 2 : forecastByRoute.has(route.number) ? 1 : 0;
      return layerWeight(left) - layerWeight(right);
    });

    routesForDrawing.forEach((route) => {
      const forecast = forecastByRoute.get(route.number);
      const selected = route.number === activeRouteId;
      route.directions.forEach((_, directionIndex) => {
        const linePoints = routeLinePoints(route.number, directionIndex);
        if (linePoints.length < 2) return;
        const line = new yandex.Polyline(linePoints, { hintContent: forecast ? `Маршрут ${route.number} · ${route.name}` : `Маршрут ${route.number} · нет данных` }, {
          strokeColor: forecast ? loadColor(forecast.peakShare) : '#7d898f',
          strokeOpacity: selected ? 0.98 : forecast ? 0.78 : 0.58,
          strokeWidth: selected ? 7 : forecast ? 4 : 3,
          strokeStyle: 'solid',
          zIndex: selected ? 300 : forecast ? 200 : 100,
          cursor: forecast ? 'pointer' : 'default',
        });
        if (forecast) line.events.add('click', () => onRouteSelect(route.number));
        layers.add(line);
      });
    });

    if (!activeRouteId) return;

    tramStops.filter((stop) => modelStopIds.has(stop.id) && activeRouteStopIds.has(stop.id)).forEach((stop) => {
      const routeNumbers = routeNumbersByStopId.get(stop.id) ?? [];
      const selected = routeNumbers.includes(activeRouteId);
      const routeForecast = selected ? forecastByRoute.get(activeRouteId) : undefined;
      const busiestForecast = routeNumbers
        .map((routeNumber) => forecastByRoute.get(routeNumber))
        .filter((forecast): forecast is RouteForecast => Boolean(forecast))
        .sort((left, right) => right.peakShare - left.peakShare)[0];
      const stopForecast = routeForecast ?? busiestForecast;
      const markerColor = stopForecast ? loadColor(stopForecast.peakShare) : '#7d898f';
      const markerSize = selected ? 7 : 6;
      const markerKey = `${markerColor}-${markerSize}`;
      let markerLayout = markerLayouts.get(markerKey);
      if (!markerLayout) {
        markerLayout = yandex.templateLayoutFactory.createClass(`<div style="width:${markerSize}px;height:${markerSize}px;border-radius:50%;background:${markerColor};box-shadow:0 0 0 1px rgb(255 255 255 / 90%);"></div>`);
        markerLayouts.set(markerKey, markerLayout);
      }
      const marker = new yandex.Placemark([stop.lat, stop.lon], { hintContent: `${stop.name} · маршрут${routeNumbers.length === 1 ? '' : 'ы'} ${routeNumbers.join(', ')}` }, {
        iconLayout: markerLayout,
        iconOffset: [-markerSize / 2, -markerSize / 2],
        iconShape: { type: 'Circle', coordinates: [0, 0], radius: markerSize / 2 },
        zIndex: selected ? 100 : 10,
      });
      marker.events.add('click', () => {
        const routeNumber = selected ? activeRouteId : routeNumbers[0];
        if (routeNumber) onRouteSelect(routeNumber);
      });
      layers.add(marker);
    });
  }, [activeRouteId, activeRouteStopIds, forecastByRoute, mapReady, modelStopIds, onRouteSelect, routeForecasts]);

  function changeZoom(delta: number) {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(Math.max(3, Math.min(20, map.getZoom() + delta)), { duration: 180 });
  }

  function returnToBaseLocation() {
    const map = mapRef.current;
    if (!map) return;
    if (baseBoundsRef.current) {
      map.setBounds(baseBoundsRef.current, { checkZoomRange: true, duration: 350, zoomMargin: 42 });
      return;
    }
    map.setCenter([55.7558, 37.6173], 10, { duration: 350 });
  }

  return (
    <section className="surface map-panel" id="map-panel" aria-labelledby="map-title">
      <header className="surface-header map-header">
        <div><p className="kicker">Геоданные GTFS · геометрия путей OpenStreetMap · Яндекс Карты · {tramRoutes.length} веток · {routeForecasts.length} с прогнозом</p><h3 id="map-title">Маршруты и остановки трамвая</h3></div>
        <div className="map-header-actions"><div className="legend" aria-label="Интенсивность потока"><span><i className="status-mark status-normal" />До 67% пика</span><span><i className="status-mark status-warning" />68–89%</span><span><i className="status-mark status-critical" />90%+</span><span><i className="status-mark status-neutral" />Нет данных</span></div></div>
      </header>
      <div className="map-context"><span>На карте <strong>{tramRoutes.length} веток</strong></span><span>{routeForecasts.length} с прогнозом</span><span>{activeRouteId ? `${activeRouteStopIds.size} остановок выбранной ветки` : 'Остановки скрыты до выбора ветки'}</span><span>Нажмите на линию для подробностей</span></div>
      <div className="map-canvas yandex-map-shell">
        <div ref={mapElementRef} className="yandex-map" role="application" aria-label="Интерактивная карта трамвайных маршрутов Москвы" />
        <div className="map-zoom-controls" aria-label="Управление картой"><button type="button" aria-label="Приблизить карту" onClick={() => changeZoom(1)}><Plus size={22} strokeWidth={2.5} aria-hidden="true" /></button><button type="button" aria-label="Отдалить карту" onClick={() => changeZoom(-1)}><Minus size={22} strokeWidth={2.5} aria-hidden="true" /></button><button className="map-home-control" type="button" aria-label="Вернуть карту к базовой локации" title="Вернуть карту к базовой локации" onClick={returnToBaseLocation}><LocateFixed size={20} strokeWidth={2.25} aria-hidden="true" /></button></div>
        {!mapReady && <div className="map-loading">{mapError ?? 'Загружаем карту Москвы…'}</div>}
      </div>
      {showTimeline && <div className="timeline"><div><span>Время прогноза</span><strong>{String(hour).padStart(2, '0')}:00</strong></div><input type="range" min="0" max="23" value={hour} aria-label="Время прогноза" onChange={(event) => onHourChange(Number(event.target.value))} /></div>}
    </section>
  );
}
