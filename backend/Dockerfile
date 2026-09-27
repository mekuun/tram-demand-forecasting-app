FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./backend/app
COPY frontend/ui_forecasts.csv ./frontend/ui_forecasts.csv
COPY events_2025.csv ./events_2025.csv
COPY event_route_effects_2025.csv ./event_route_effects_2025.csv
COPY frontend/app/tram-routes.json ./frontend/app/tram-routes.json

EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
