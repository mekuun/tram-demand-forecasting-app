# Поток — прогноз пассажиропотока трамваев

Frontend показывает готовый прогноз, а backend отдаёт его через API. Обучение и инференс находятся в отдельном репозитории.

```text
репозиторий модели → ui_forecasts.csv → backend → frontend
```

## CSV-файлы

| Файл | Что внутри | Как используется |
|---|---|---|
| `frontend/ui_forecasts.csv` | Готовый почасовой прогноз по маршрутам и датам | Главный источник данных. Его читает frontend, а backend использует для API и экспорта CSV |
| `events_2025.csv` | Календарь городских событий: даты, места, время и название | Backend показывает события для выбранного маршрута и даты |
| `event_route_effects_2025.csv` | Связи «событие × маршрут» и параметры влияния | Backend по этим связям подбирает события для конкретного маршрута |
| `venue_route_links.csv` | Справочная связь площадок, остановок и маршрутов | Используется при подготовке данных; в runtime backend напрямую его не читает |

Все CSV нужны только как данные. Модели, веса и инференса в этом репозитории нет.

## Запуск через Docker

```bash
docker compose up --build
```

После запуска:

- сайт: http://localhost:3000;
- API: http://localhost:8000;
- Swagger: http://localhost:8000/docs;
- healthcheck: http://localhost:8000/health.

Чтобы обновить прогноз, нужно заменить `frontend/ui_forecasts.csv` файлом из репозитория модели и пересобрать контейнеры.

Основной запрос:

```text
GET /api/v1/dashboard?date=2025-12-31&route_id=17&hour=18
```

Путь к CSV можно изменить через переменную `FORECAST_CSV_PATH`.

## Запуск без Docker

Backend:

```bash
./.venv/bin/uvicorn backend.app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```
