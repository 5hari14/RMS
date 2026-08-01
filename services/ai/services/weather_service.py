import logging

import httpx

from config import settings

logger = logging.getLogger(__name__)


async def get_weather_forecast(lat: float, lon: float, target_date: str) -> dict | None:
    if not settings.openweathermap_api_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.openweathermap.org/data/2.5/forecast",
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": settings.openweathermap_api_key,
                    "units": "metric",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        for entry in data.get("list", []):
            if entry["dt_txt"].startswith(target_date):
                weather = entry["weather"][0] if entry.get("weather") else {}
                return {
                    "temperature": entry["main"]["temp"],
                    "condition": weather.get("main", "Unknown"),
                    "description": weather.get("description", ""),
                    "rain_probability": entry.get("pop", 0),
                }
    except Exception:
        logger.warning("Weather API request failed", exc_info=True)

    return None
