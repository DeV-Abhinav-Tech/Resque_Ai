from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import httpx

from backend.app.data.clients.base import APIClientBase
from backend.app.config import settings


class OpenWeatherClient(APIClientBase[Dict[str, Any]]):
    def __init__(self):
        super().__init__(
            base_url=settings.OPENWEATHER_BASE_URL,
            rate_limit_rpm=settings.OPENWEATHER_RATE_LIMIT,
            timeout=30.0,
            api_key=settings.OPENWEATHER_API_KEY,
        )

    async def fetch_latest(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        return []

    async def fetch_current_weather(self, lat: float, lon: float) -> Dict[str, Any]:
        params = {"lat": lat, "lon": lon, "appid": self.api_key, "units": "metric"}
        response = await self.get("weather", params=params)
        return response.json()

    async def fetch_forecast(self, lat: float, lon: float, days: int = 7) -> Dict[str, Any]:
        params = {"lat": lat, "lon": lon, "appid": self.api_key, "units": "metric", "cnt": days * 8}
        response = await self.get("forecast", params=params)
        return response.json()

    async def fetch_historical_weather(self, lat: float, lon: float, dt: int) -> Dict[str, Any]:
        params = {"lat": lat, "lon": lon, "appid": self.api_key, "units": "metric", "dt": dt}
        response = await self.get("timemachine", params=params)
        return response.json()

    async def fetch_onecall(self, lat: float, lon: float, exclude: str = "minutely") -> Dict[str, Any]:
        params = {"lat": lat, "lon": lon, "appid": self.api_key, "units": "metric", "exclude": exclude}
        response = await self.get("onecall", params=params)
        return response.json()

    def normalize(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        return {}


class WeatherAPIClient(APIClientBase[Dict[str, Any]]):
    def __init__(self):
        super().__init__(
            base_url=settings.WEATHERAPI_BASE_URL,
            rate_limit_rpm=settings.WEATHERAPI_RATE_LIMIT,
            timeout=30.0,
            api_key=settings.WEATHERAPI_KEY,
        )

    async def fetch_latest(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        return []

    async def fetch_current(self, q: str) -> Dict[str, Any]:
        params = {"key": self.api_key, "q": q, "aqi": "yes"}
        response = await self.get("current.json", params=params)
        return response.json()

    async def fetch_forecast(self, q: str, days: int = 7) -> Dict[str, Any]:
        params = {"key": self.api_key, "q": q, "days": days, "aqi": "yes", "alerts": "yes"}
        response = await self.get("forecast.json", params=params)
        return response.json()

    async def fetch_history(self, q: str, dt: str) -> Dict[str, Any]:
        params = {"key": self.api_key, "q": q, "dt": dt}
        response = await self.get("history.json", params=params)
        return response.json()

    async def fetch_marine(self, q: str, days: int = 3) -> Dict[str, Any]:
        params = {"key": self.api_key, "q": q, "days": days}
        response = await self.get("marine.json", params=params)
        return response.json()

    async def fetch_alerts(self, q: str) -> Dict[str, Any]:
        params = {"key": self.api_key, "q": q, "alerts": "yes"}
        response = await self.get("forecast.json", params=params)
        return response.json().get("alerts", {})

    def normalize(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        return {}


class UnifiedWeatherClient:
    def __init__(self):
        self.openweather = OpenWeatherClient()
        self.weatherapi = WeatherAPIClient()

    async def __aenter__(self):
        await self.openweather.__aenter__()
        await self.weatherapi.__aenter__()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.openweather.__aexit__(exc_type, exc_val, exc_tb)
        await self.weatherapi.__aexit__(exc_type, exc_val, exc_tb)

    async def get_best_current(self, lat: float, lon: float) -> Dict[str, Any]:
        try:
            return await self.openweather.fetch_current_weather(lat, lon)
        except Exception:
            try:
                return await self.weatherapi.fetch_current(f"{lat},{lon}")
            except Exception:
                return {}

    async def get_best_forecast(self, lat: float, lon: float, days: int = 7) -> Dict[str, Any]:
        try:
            return await self.openweather.fetch_forecast(lat, lon, days)
        except Exception:
            try:
                return await self.weatherapi.fetch_forecast(f"{lat},{lon}", days)
            except Exception:
                return {}

    async def get_alerts(self, lat: float, lon: float) -> List[Dict[str, Any]]:
        try:
            data = await self.weatherapi.fetch_alerts(f"{lat},{lon}")
            return data.get("alert", [])
        except Exception:
            return []