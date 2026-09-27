from __future__ import annotations

import csv
import io
import math
import os
import re
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
EVENTS_PATH = Path(os.getenv("EVENTS_CSV_PATH", ROOT_DIR / "events_2025.csv"))
EVENT_EFFECTS_PATH = Path(
    os.getenv("EVENT_EFFECTS_CSV_PATH", ROOT_DIR / "event_route_effects_2025.csv")
)
ROUTES_PATH = Path(
    os.getenv("ROUTES_JSON_PATH", ROOT_DIR / "frontend" / "app" / "tram-routes.json")
)

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

PLANNING_PROFILES = {
    "1": {"hourlyP95": 1737.7, "boardingsPerVehicleMean": 79.55},
    "7": {"hourlyP95": 2394, "boardingsPerVehicleMean": 72.05},
    "11": {"hourlyP95": 2921, "boardingsPerVehicleMean": 97.57},
    "12": {"hourlyP95": 3116.6, "boardingsPerVehicleMean": 86.82},
    "17": {"hourlyP95": 4587.4, "boardingsPerVehicleMean": 119.15},
    "25": {"hourlyP95": 742, "boardingsPerVehicleMean": 60.75},
    "26": {"hourlyP95": 1720.9, "boardingsPerVehicleMean": 76.41},
    "28": {"hourlyP95": 978.25, "boardingsPerVehicleMean": 75.68},
    "50": {"hourlyP95": 2410.4, "boardingsPerVehicleMean": 73.24},
}


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
                "prediction": float(row.get("prediction") or row.get("ml_prediction") or 0),
            }
            for row in csv.DictReader(handle, delimiter=";")
            if row.get("route") and row.get("date") and row.get("hour")
            and (row.get("ml_prediction") or row.get("prediction"))
        ]


def prediction(row: dict[str, Any]) -> float:
    return row["prediction"]


@lru_cache(maxsize=1)
def event_names() -> dict[str, dict[str, Any]]:
    if not EVENTS_PATH.exists():
        return {}
    with EVENTS_PATH.open(newline="", encoding="utf-8") as handle:
        return {row["event_id"]: row for row in csv.DictReader(handle)}


@lru_cache(maxsize=1)
def event_effects() -> list[dict[str, Any]]:
    if not EVENT_EFFECTS_PATH.exists():
        return []
    with EVENT_EFFECTS_PATH.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


@lru_cache(maxsize=1)
def route_metadata() -> dict[str, dict[str, Any]]:
    if not ROUTES_PATH.exists():
        return {}
    import json

    payload = json.loads(ROUTES_PATH.read_text(encoding="utf-8"))
    return {route["number"]: route for route in payload.get("routes", [])}


def available_routes() -> list[str]:
    return sorted({row["route"] for row in forecast_rows() if row["route"] != "5"}, key=lambda value: int(value))


def rows_for(route_id: str | None = None, date: str | None = None) -> list[dict[str, Any]]:
    return [
        row
        for row in forecast_rows()
        if (route_id is None or row["route"] == route_id)
        and (date is None or row["date"] == date)
    ]


def number(value: float) -> int | float:
    return int(value) if value.is_integer() else round(value, 2)


def date_context(value: str) -> str:
    return datetime.strptime(value, "%Y-%m-%d").strftime("%d.%m.%Y")


def route_forecast(route_id: str, selected_date: str, selected_hour: int) -> dict[str, Any]:
    rows = sorted(rows_for(route_id, selected_date), key=lambda row: row["hour"])
    current = next((prediction(row) for row in rows if row["hour"] == selected_hour), 0)
    peak_row = max(rows, key=prediction, default=None)
    minimum_row = min(rows, key=prediction, default=None)
    same_hour = [prediction(row) for row in rows_for(route_id) if row["hour"] == selected_hour]
    average = sum(same_hour) / len(same_hour) if same_hour else 0
    peak = prediction(peak_row) if peak_row else 0
    minimum = prediction(minimum_row) if minimum_row else 0
    return {
        "routeId": route_id,
        "dayTotal": number(sum(prediction(row) for row in rows)),
        "current": number(current),
        "hourAverage": number(average),
        "currentVsAverage": round(current / average * 100) if average else 0,
        "peak": number(peak),
        "peakHour": peak_row["hour"] if peak_row else 0,
        "minimum": number(minimum),
        "minimumHour": minimum_row["hour"] if minimum_row else 0,
        "peakShare": round(current / peak * 100) if peak else 0,
    }


def forecast(route_id: str, selected_date: str) -> dict[str, Any]:
    rows = sorted(rows_for(route_id, selected_date), key=lambda row: row["hour"])
    raw_values = [next((prediction(row) for row in rows if row["hour"] == hour), 0) for hour in range(24)]
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


def network_summary(selected_date: str) -> dict[str, Any]:
    rows = rows_for(date=selected_date)
    totals = [
        sum(prediction(row) for row in rows if row["hour"] == hour and row["route"] != "5")
        for hour in range(24)
    ]
    peak_total = max(totals, default=0)
    routes_above_p95 = sum(
        1
        for route_id, profile in PLANNING_PROFILES.items()
        if max((prediction(row) for row in rows if row["route"] == route_id), default=0)
        > profile["hourlyP95"]
    )
    recommended_vehicles = sum(
        math.ceil(
            next(
                (
                    prediction(row)
                    for row in rows
                    if row["route"] == route_id and row["hour"] == (totals.index(peak_total) if peak_total else 0)
                ),
                0,
            )
            / profile["boardingsPerVehicleMean"]
        )
        for route_id, profile in PLANNING_PROFILES.items()
    )
    return {
        "total": number(sum(prediction(row) for row in rows if row["route"] != "5")),
        "peakHour": totals.index(peak_total) if peak_total else 0,
        "peakTotal": number(peak_total),
        "routesAboveP95": routes_above_p95,
        "recommendedVehicles": recommended_vehicles,
        "coveredRoutes": len(PLANNING_PROFILES),
    }


def heatmap(selected_date: str) -> list[dict[str, Any]]:
    by_route_hour: dict[str, dict[int, float]] = defaultdict(dict)
    for row in rows_for(date=selected_date):
        if row["route"] != "5":
            by_route_hour[row["route"]][row["hour"]] = prediction(row)

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
    names = event_names()
    for effect in event_effects():
        if effect.get("route_id") != route_id:
            continue
        if not (effect.get("date_start", "") <= selected_date <= effect.get("date_end", "")):
            continue
        event = names.get(effect.get("event_id", ""), {})
        result.append(
            {
                "start": effect.get("date_start"),
                "end": effect.get("date_end"),
                "routes": [route_id],
                "name": event.get("event_name", effect.get("event_id", "Событие")),
                "venue": event.get("venue_name", "—"),
                "time": effect.get("start_time_local", "—"),
                "popularity": float(effect.get("popularity_coefficient") or 0),
            }
        )
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
    return {"status": "ok", "forecastRows": len(forecast_rows()), "forecastPath": str(FORECAST_PATH)}


@app.get("/api/v1/meta")
def meta() -> dict[str, Any]:
    dates = sorted({row["date"] for row in forecast_rows()})
    return {
        "routes": available_routes(),
        "dateMin": dates[0] if dates else None,
        "dateMax": dates[-1] if dates else None,
        "defaultDate": dates[-1] if dates else None,
    }


@app.get("/api/v1/dashboard")
def dashboard(
    date: str = Query(...),
    route_id: str = Query(..., min_length=1),
    hour: int = Query(18, ge=0, le=23),
) -> dict[str, Any]:
    selected_date = parse_date(date)
    return {
        "forecast": forecast(route_id, selected_date),
        "routeForecasts": [route_forecast(route, selected_date, hour) for route in available_routes()],
        "summary": network_summary(selected_date),
        "heatmap": heatmap(selected_date),
        "events": events_for(route_id, selected_date),
    }


@app.get("/api/v1/export/day.csv")
def export_day(
    date: str = Query(...),
    route_id: str = Query(..., min_length=1),
) -> StreamingResponse:
    selected_date = parse_date(date)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["маршрут", "период", "метка", "прогноз_пассажиров_в_час"])
    for hour, value in enumerate(forecast(route_id, selected_date)["rawValues"]):
        writer.writerow([route_id, "day", f"{hour:02d}", value])
    return StreamingResponse(
        iter(["\ufeff" + output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="forecast-route-{route_id}-day.csv"'},
    )
