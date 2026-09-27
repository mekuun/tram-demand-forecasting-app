FROM python:3.12-slim

WORKDIR /app
RUN mkdir -p /app/data

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./backend/app
COPY frontend/ui_forecasts.csv ./frontend/ui_forecasts.csv
COPY frontend/ui_events.csv ./frontend/ui_events.csv
COPY frontend/ui_planning_profiles.csv ./frontend/ui_planning_profiles.csv
COPY frontend/ui_route_colors.csv ./frontend/ui_route_colors.csv
COPY ui_weather.csv ./ui_weather.csv
COPY ui_event.csv ./ui_event.csv
COPY events_2025.csv ./events_2025.csv
COPY event_route_effects_2025.csv ./event_route_effects_2025.csv
COPY frontend/app/tram-routes.json ./frontend/app/tram-routes.json
COPY frontend/app/tram-geometries.json ./frontend/app/tram-geometries.json

EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
