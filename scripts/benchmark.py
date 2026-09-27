#!/usr/bin/env python3
"""Small dependency-free HTTP benchmark for the Docker services."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import statistics
import time
import urllib.request


def request(url: str, timeout: float) -> tuple[float, int | None, str | None]:
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            response.read()
            return (time.perf_counter() - started) * 1000, response.status, None
    except Exception as error:  # pragma: no cover - exercised by an unavailable service
        return (time.perf_counter() - started) * 1000, None, f"{type(error).__name__}: {error}"


def percentile(values: list[float], percent: float) -> float | None:
    if not values:
        return None
    index = min(len(values) - 1, int((percent / 100) * len(values)))
    return round(values[index], 2)


def run_case(name: str, url: str, requests: int, concurrency: int, timeout: float) -> None:
    for _ in range(min(20, requests)):
        request(url, timeout)

    started = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:
        results = list(pool.map(lambda _: request(url, timeout), range(requests)))
    elapsed = time.perf_counter() - started

    latencies = sorted(item[0] for item in results if item[1] == 200)
    errors = [item[2] for item in results if item[1] != 200]
    print(json.dumps({
        "case": name,
        "requests": requests,
        "concurrency": concurrency,
        "elapsed_s": round(elapsed, 3),
        "rps": round(requests / elapsed, 2),
        "ok": len(latencies),
        "errors": len(errors),
        "latency_ms": {
            "min": round(min(latencies), 2) if latencies else None,
            "mean": round(statistics.mean(latencies), 2) if latencies else None,
            "p50": percentile(latencies, 50),
            "p95": percentile(latencies, 95),
            "p99": percentile(latencies, 99),
            "max": round(max(latencies), 2) if latencies else None,
        },
        "first_error": errors[0] if errors else None,
    }, ensure_ascii=False))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--concurrency", type=int, default=20)
    parser.add_argument("--timeout", type=float, default=30)
    parser.add_argument("--requests", type=int, default=None)
    args = parser.parse_args()

    cases = [
        ("health", f"{args.base_url}/health", args.requests or 300),
        ("meta", f"{args.base_url}/api/v1/meta", args.requests or 200),
        (
            "dashboard",
            f"{args.base_url}/api/v1/dashboard?date=2025-12-31&route_id=17&hour=18"
            "&season_strength=1&weather_strength=1&event_strength=1",
            args.requests or 200,
        ),
    ]
    for name, url, request_count in cases:
        run_case(name, url, request_count, args.concurrency, args.timeout)


if __name__ == "__main__":
    main()
