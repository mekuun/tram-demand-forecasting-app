from __future__ import annotations

import csv
import io
import math
import os
import re
from threading import Lock
from collections import defaultdict
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse


ROOT_DIR = Path(__file__).resolve().parents[2]
FORECAST_PATH = Path(
    os.getenv("FORECAST_CSV_PATH", ROOT_DIR / "frontend" / "ui_forecasts.csv")
)
WEATHER_PATH = Path(os.getenv("WEATHER_CSV_PATH", ROOT_DIR / "ui_weather.csv"))
EVENT_COEFFICIENT_PATH = Path(os.getenv("EVENT_COEFFICIENT_CSV_PATH", ROOT_DIR / "ui_event.csv"))
EVENTS_PATH = Path(os.getenv("EVENTS_CSV_PATH", ROOT_DIR / "frontend" / "ui_events.csv"))
PLANNING_PROFILES_PATH = Path(os.getenv("PLANNING_PROFILES_CSV_PATH", ROOT_DIR / "frontend" / "ui_planning_profiles.csv"))
ROUTE_COLORS_PATH = Path(os.getenv("ROUTE_COLORS_CSV_PATH", ROOT_DIR / "frontend" / "ui_route_colors.csv"))
ROUTES_PATH = Path(
    os.getenv("ROUTES_JSON_PATH", ROOT_DIR / "frontend" / "app" / "tram-routes.json")
)
GEOMETRIES_PATH = Path(
    os.getenv("GEOMETRIES_JSON_PATH", ROOT_DIR / "frontend" / "app" / "tram-geometries.json")
)
DATA_PATHS = (
    FORECAST_PATH,
    WEATHER_PATH,
    EVENT_COEFFICIENT_PATH,
    EVENTS_PATH,
    PLANNING_PROFILES_PATH,
    ROUTE_COLORS_PATH,
    ROUTES_PATH,
    GEOMETRIES_PATH,
)
_DATA_SIGNATURES: dict[str, tuple[int, int]] = {}
_DATA_SIGNATURES_LOCK = Lock()

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def refresh_data_caches() -> None:
    """Invalidate parsed datasets when a mounted CSV/JSON file changes."""
    global _DATA_SIGNATURES
    signatures = {}
    for path in DATA_PATHS:
        try:
            stat = path.stat()
            signatures[str(path)] = (stat.st_mtime_ns, stat.st_size)
        except FileNotFoundError:
            signatures[str(path)] = (-1, -1)

    with _DATA_SIGNATURES_LOCK:
        if signatures == _DATA_SIGNATURES:
            return
        _DATA_SIGNATURES = signatures
        for loader in (forecast_rows, forecast_index, weather_rows, event_coefficients, events, planning_profiles, route_colors, network_data, route_metadata):
            loader.cache_clear()

def parse_date(value: str) -> str:
    if not DATE_RE.match(value):
        raise HTTPException(status_code=422, detail="date должен быть в формате YYYY-MM-DD")
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError as error:
        raise HTTPException(status_code=422, detail="date содержит некорректную дату") from error
    return value


@lru_cache(maxsize=1)
def forecast_rows() -> list[dict[str, Any]]:
    if not FORECAST_PATH.exists():
        raise RuntimeError(f"Не найден CSV с прогнозом: {FORECAST_PATH}")
    with FORECAST_PATH.open(newline="", encoding="utf-8") as handle:
        return [
            {
                "route": row["route"],
                "date": row["date"],
                "hour": int(row["hour"]),
                "base_prediction": float(row.get("base_prediction") or row.get("structural_prediction") or 0),
                "season_coefficient": float(row.get("season_coefficient") or 1),
                "prediction": float(row.get("prediction") or row.get("ml_prediction") or 0),
            }
            for row in csv.DictReader(handle, delimiter=";")
            if row.get("route") and row.get("date") and row.get("hour")
            and (row.get("prediction") or row.get("ml_prediction"))
        ]


@lru_cache(maxsize=1)
def forecast_index() -> dict[tuple[str, str], list[dict[str, Any]]]:
    indexed: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in forecast_rows():
        indexed[(row["route"], row["date"])].append(row)
    for rows in indexed.values():
        rows.sort(key=lambda row: row["hour"])
    return dict(indexed)


@lru_cache(maxsize=1)
def weather_rows() -> dict[tuple[str, str, int], dict[str, float]]:
    if not WEATHER_PATH.exists():
        return {}
    with WEATHER_PATH.open(newline="", encoding="utf-8") as handle:
        result = {}
        for row in csv.DictReader(handle, delimiter=";"):
            key = (row["route"], row["date"], int(row["hour"]))
            result[key] = {
                "weather_coefficient": float(row.get("weather_coefficient") or 1),
            }
        return result


@lru_cache(maxsize=1)
def event_coefficients() -> dict[tuple[str, str, int], float]:
    if not EVENT_COEFFICIENT_PATH.exists():
        return {}
    with EVENT_COEFFICIENT_PATH.open(newline="", encoding="utf-8") as handle:
        fieldnames = set(handle.readline().strip().split(";"))
        if not {"route", "date", "hour", "event_coefficient"}.issubset(fieldnames):
            return {}
        handle.seek(0)
        return {
            (row["route"], row["date"], int(row["hour"])): float(row.get("event_coefficient") or 1)
            for row in csv.DictReader(handle, delimiter=";")
        }


def prediction(
    row: dict[str, Any],
    season_strength: float = 1,
    weather_strength: float = 1,
    event_strength: float = 1,
) -> float:
    """Apply the scenario formula from the model specification.

    Strength 0 disables a factor, 1 reproduces the prepared forecast, and 2
    applies the same multiplicative correction twice on a log scale.
    """
    season = max(0, min(2, season_strength))
    weather_strength = max(0, min(2, weather_strength))
    event = max(0, min(2, event_strength))
    key = (row["route"], row["date"], row["hour"])
    weather = weather_rows().get(key, {}).get("weather_coefficient", 1)
    event_coefficient = event_coefficients().get(key, 1)
    return (
        row["base_prediction"]
        * row["season_coefficient"] ** season
        * weather ** weather_strength
        * event_coefficient ** event
    )


@lru_cache(maxsize=1)
def events() -> list[dict[str, Any]]:
    if not EVENTS_PATH.exists():
        raise RuntimeError(f"Не найден CSV событий: {EVENTS_PATH}")
    with EVENTS_PATH.open(newline="", encoding="utf-8") as handle:
        return [
            {
                "start": row["start"],
                "end": row["end"],
                "routes": row["routes"].split("|") if row.get("routes") else [],
                "name": row["name"],
                "venue": row["venue"],
                "time": row["time"],
                "popularity": float(row["popularity"]),
                "popularityLabel": "Очень высокая популярность" if float(row["popularity"]) >= 0.75 else "Высокая популярность" if float(row["popularity"]) >= 0.5 else "Средняя популярность" if float(row["popularity"]) >= 0.25 else "Низкая популярность",
                "citywide": row.get("citywide") == "true",
            }
            for row in csv.DictReader(handle, delimiter=";")
        ]


@lru_cache(maxsize=1)
def planning_profiles() -> dict[str, dict[str, Any]]:
    if not PLANNING_PROFILES_PATH.exists():
        raise RuntimeError(f"Не найден CSV профилей маршрутов: {PLANNING_PROFILES_PATH}")
    with PLANNING_PROFILES_PATH.open(newline="", encoding="utf-8") as handle:
        return {
            row["route"]: {
                "hourlyMean": float(row["hourly_mean"]),
                "hourlyP95": float(row["hourly_p95"]),
                "boardingsPerVehicleMean": float(row["boardings_per_vehicle_mean"]),
                "boardingsPerVehicleP90": float(row["boardings_per_vehicle_p90"]),
                "activeVehiclesP95": int(row["active_vehicles_p95"]),
                "vehicleModel": row.get("vehicle_model") or None,
                "capacityClass": row.get("capacity_class") or None,
            }
            for row in csv.DictReader(handle, delimiter=";")
            if row.get("route")
        }


@lru_cache(maxsize=1)
def route_colors() -> dict[str, str]:
    if not ROUTE_COLORS_PATH.exists():
        raise RuntimeError(f"Не найден CSV цветов маршрутов: {ROUTE_COLORS_PATH}")
    with ROUTE_COLORS_PATH.open(newline="", encoding="utf-8") as handle:
        return {row["route"]: row["color"] for row in csv.DictReader(handle, delimiter=";") if row.get("route") and row.get("color")}


@lru_cache(maxsize=1)
def network_data() -> dict[str, Any]:
    if not ROUTES_PATH.exists():
        return {"routes": [], "stops": [], "geometries": {}}
    import json

    payload = json.loads(ROUTES_PATH.read_text(encoding="utf-8"))
    geometries = {}
    if GEOMETRIES_PATH.exists():
        geometries = json.loads(GEOMETRIES_PATH.read_text(encoding="utf-8")).get("routes", {})
    colors = route_colors()
    routes = [
        {**route, "color": colors.get(route["number"], route.get("color", "#7d898f"))}
        for route in payload.get("routes", [])
        if route.get("number") != "5"
    ]
    return {"routes": routes, "stops": payload.get("stops", []), "geometries": geometries}


@lru_cache(maxsize=1)
def route_metadata() -> dict[str, dict[str, Any]]:
    return {route["number"]: route for route in network_data()["routes"]}


def available_routes() -> list[str]:
    return sorted({row["route"] for row in forecast_rows() if row["route"] != "5"}, key=lambda value: int(value))


def rows_for(route_id: str | None = None, date: str | None = None) -> list[dict[str, Any]]:
    if route_id is not None and date is not None:
        return forecast_index().get((route_id, date), [])
    if date is not None:
        return [
            row
            for (row_route, row_date), rows in forecast_index().items()
            if row_date == date and (route_id is None or row_route == route_id)
            for row in rows
        ]
    if route_id is not None:
        return [
            row
            for (row_route, _), rows in forecast_index().items()
            if row_route == route_id
            for row in rows
        ]
    return [
        row
        for row in forecast_rows()
    ]


def number(value: float) -> int | float:
    return int(value) if value.is_integer() else round(value, 2)


def load_status(share: float) -> tuple[str, str, str]:
    if share >= 90:
        return "critical", "Пиковая нагрузка", "Подготовить дополнительный выпуск на пиковый час."
    if share >= 68:
        return "warning", "Высокая нагрузка", "Контролировать интервал движения."
    if share >= 35:
        return "normal", "Средняя нагрузка", "Сохранить текущий выпуск вагонов."
    return "low", "Низкая нагрузка", "Сохранить текущий выпуск вагонов."


def date_context(value: str) -> str:
    return datetime.strptime(value, "%Y-%m-%d").strftime("%d.%m.%Y")


def route_forecast(
    route_id: str,
    selected_date: str,
    selected_hour: int,
    season_strength: float,
    weather_strength: float,
    event_strength: float,
) -> dict[str, Any]:
    rows = sorted(rows_for(route_id, selected_date), key=lambda row: row["hour"])
    current = next((prediction(row, season_strength, weather_strength, event_strength) for row in rows if row["hour"] == selected_hour), 0)
    peak_row = max(rows, key=lambda row: prediction(row, season_strength, weather_strength, event_strength), default=None)
    minimum_row = min(rows, key=lambda row: prediction(row, season_strength, weather_strength, event_strength), default=None)
    same_hour = [prediction(row, season_strength, weather_strength, event_strength) for row in rows_for(route_id) if row["hour"] == selected_hour]
    average = sum(same_hour) / len(same_hour) if same_hour else 0
    peak = prediction(peak_row, season_strength, weather_strength, event_strength) if peak_row else 0
    minimum = prediction(minimum_row, season_strength, weather_strength, event_strength) if minimum_row else 0
    peak_share = round(current / peak * 100) if peak else 0
    profile = planning_profiles().get(route_id)
    recommended_vehicles = math.ceil(peak / profile["boardingsPerVehicleMean"]) if profile and peak else None
    load_state, load_label, recommendation = load_status(peak_share)
    return {
        "routeId": route_id,
        "dayTotal": number(sum(prediction(row, season_strength, weather_strength, event_strength) for row in rows)),
        "current": number(current),
        "hourAverage": number(average),
        "currentVsAverage": round(current / average * 100) if average else 0,
        "peak": number(peak),
        "peakHour": peak_row["hour"] if peak_row else 0,
        "minimum": number(minimum),
        "minimumHour": minimum_row["hour"] if minimum_row else 0,
        "peakShare": peak_share,
        "loadState": load_state,
        "loadLabel": load_label,
        "recommendation": recommendation,
        "recommendedVehicles": recommended_vehicles,
    }


def forecast(
    route_id: str,
    selected_date: str,
    season_strength: float,
    weather_strength: float,
    event_strength: float,
) -> dict[str, Any]:
    rows = sorted(rows_for(route_id, selected_date), key=lambda row: row["hour"])
    raw_values = [next((prediction(row, season_strength, weather_strength, event_strength) for row in rows if row["hour"] == hour), 0) for hour in range(24)]
    peak = max(raw_values, default=0)
    peak_hour = raw_values.index(peak) if peak else 0
    scale = peak or 1
    total = sum(raw_values)
    return {
        "routeId": route_id,
        "date": selected_date,
        "context": date_context(selected_date),
        "labels": [f"{hour:02d}" for hour in range(24)],
        "rawValues": [number(value) for value in raw_values],
        "values": [round(value / scale * 100) for value in raw_values],
        "total": number(total),
        "peak": number(peak),
        "peakHour": peak_hour,
        "points": len(rows),
    }


def network_summary(
    selected_date: str,
    season_strength: float,
    weather_strength: float,
    event_strength: float,
) -> dict[str, Any]:
    rows = rows_for(date=selected_date)
    totals = [
        sum(prediction(row, season_strength, weather_strength, event_strength) for row in rows if row["hour"] == hour and row["route"] != "5")
        for hour in range(24)
    ]
    peak_total = max(totals, default=0)
    routes_above_p95 = sum(
        1
        for route_id, profile in planning_profiles().items()
        if max((prediction(row, season_strength, weather_strength, event_strength) for row in rows if row["route"] == route_id), default=0)
        > profile["hourlyP95"]
    )
    recommended_vehicles = sum(
        math.ceil(
            next(
                (
                    prediction(row, season_strength, weather_strength, event_strength)
                    for row in rows
                    if row["route"] == route_id and row["hour"] == (totals.index(peak_total) if peak_total else 0)
                ),
                0,
            )
            / profile["boardingsPerVehicleMean"]
        )
        for route_id, profile in planning_profiles().items()
    )
    return {
        "total": number(sum(prediction(row, season_strength, weather_strength, event_strength) for row in rows if row["route"] != "5")),
        "peakHour": totals.index(peak_total) if peak_total else 0,
        "peakTotal": number(peak_total),
        "routesAboveP95": routes_above_p95,
        "recommendedVehicles": recommended_vehicles,
        "coveredRoutes": len(planning_profiles()),
    }


def heatmap(
    selected_date: str,
    season_strength: float,
    weather_strength: float,
    event_strength: float,
) -> list[dict[str, Any]]:
    by_route_hour: dict[str, dict[int, float]] = defaultdict(dict)
    for row in rows_for(date=selected_date):
        if row["route"] != "5":
            by_route_hour[row["route"]][row["hour"]] = prediction(row, season_strength, weather_strength, event_strength)

    result = []
    for route_id in available_routes():
        metadata = route_metadata().get(route_id, {})
        route_values = by_route_hour.get(route_id, {})
        peak = max(route_values.values(), default=0) or 1
        result.append(
            {
                "routeId": route_id,
                "routeName": metadata.get("name", f"Маршрут {route_id}"),
                "routeColor": metadata.get("color", "#7d898f"),
                "values": [
                    {
                        "hour": hour,
                        "prediction": number(route_values.get(hour, 0)),
                        "intensity": round(route_values.get(hour, 0) / peak * 100),
                        "label": f"{number(route_values.get(hour, 0))} пасс./ч",
                    }
                    for hour in range(24)
                ],
            }
        )
    return result


def events_for(route_id: str, selected_date: str) -> list[dict[str, Any]]:
    result = []
    for event in events():
        if route_id not in event["routes"]:
            continue
        if not (event["start"] <= selected_date <= event["end"]):
            continue
        result.append(event)
    return sorted(result, key=lambda item: item["popularity"], reverse=True)


app = FastAPI(title="Tram Demand Forecast API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    refresh_data_caches()
    return {"status": "ok", "forecastRows": len(forecast_rows()), "forecastPath": str(FORECAST_PATH)}


@app.get("/api/v1/meta")
def meta() -> dict[str, Any]:
    refresh_data_caches()
    dates = sorted({row["date"] for row in forecast_rows()})
    route_ids = available_routes()
    return {
        "routes": network_data()["routes"],
        "stops": network_data()["stops"],
        "geometries": network_data()["geometries"],
        "forecastRoutes": route_ids,
        "planningProfiles": planning_profiles(),
        "dateMin": dates[0] if dates else None,
        "dateMax": dates[-1] if dates else None,
        "defaultDate": dates[-1] if dates else None,
    }


@app.get("/api/v1/dashboard")
def dashboard(
    date: str = Query(...),
    route_id: str = Query(..., min_length=1),
    hour: int = Query(18, ge=0, le=23),
    season_strength: float = Query(1, ge=0, le=2),
    weather_strength: float = Query(1, ge=0, le=2),
    event_strength: float = Query(1, ge=0, le=2),
) -> dict[str, Any]:
    refresh_data_caches()
    selected_date = parse_date(date)
    return {
        "forecast": forecast(route_id, selected_date, season_strength, weather_strength, event_strength),
        "routeForecasts": [route_forecast(route, selected_date, hour, season_strength, weather_strength, event_strength) for route in available_routes()],
        "summary": network_summary(selected_date, season_strength, weather_strength, event_strength),
        "heatmap": heatmap(selected_date, season_strength, weather_strength, event_strength),
        "events": events_for(route_id, selected_date),
        "planningProfiles": planning_profiles(),
    }


@app.get("/api/v1/export/day.csv")
def export_day(
    date: str = Query(...),
    route_id: str = Query(..., min_length=1),
    season_strength: float = Query(1, ge=0, le=2),
    weather_strength: float = Query(1, ge=0, le=2),
    event_strength: float = Query(1, ge=0, le=2),
) -> StreamingResponse:
    refresh_data_caches()
    selected_date = parse_date(date)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["маршрут", "период", "метка", "прогноз_пассажиров_в_час"])
    for hour, value in enumerate(forecast(route_id, selected_date, season_strength, weather_strength, event_strength)["rawValues"]):
        writer.writerow([route_id, "day", f"{hour:02d}", value])
    return StreamingResponse(
        iter(["\ufeff" + output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="forecast-route-{route_id}-day.csv"'},
    )
