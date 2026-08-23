import asyncio
import hashlib
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, TypeVar, Generic
from urllib.parse import urljoin

import httpx
import structlog
from pydantic import BaseModel, Field

from backend.app.config import settings

logger = structlog.get_logger()

T = TypeVar("T")


@dataclass
class RateLimiter:
    max_requests: int
    window_seconds: int = 60
    _requests: List[float] = None

    def __post_init__(self):
        self._requests = []

    async def acquire(self) -> None:
        now = time.time()
        self._requests = [t for t in self._requests if now - t < self.window_seconds]
        if len(self._requests) >= self.max_requests:
            sleep_time = self.window_seconds - (now - self._requests[0])
            if sleep_time > 0:
                logger.debug("Rate limit hit, sleeping", sleep_time=sleep_time)
                await asyncio.sleep(sleep_time)
        self._requests.append(time.time())


class APIClientBase(ABC, Generic[T]):
    def __init__(
        self,
        base_url: str,
        rate_limit_rpm: int = 60,
        timeout: float = 30.0,
        api_key: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None,
    ):
        self.base_url = base_url.rstrip("/") + "/"
        self.rate_limiter = RateLimiter(rate_limit_rpm)
        self.timeout = timeout
        self.api_key = api_key
        self.default_headers = headers or {}
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self) -> "APIClientBase":
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(self.timeout),
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        if self._client:
            await self._client.aclose()

    @property
    def client(self) -> httpx.AsyncClient:
        if not self._client:
            raise RuntimeError("Client not initialized. Use async context manager.")
        return self._client

    def _build_headers(self) -> Dict[str, str]:
        headers = {**self.default_headers, "User-Agent": "Resque.AI/0.1.0"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict] = None,
        json: Optional[Dict] = None,
        headers: Optional[Dict] = None,
    ) -> httpx.Response:
        await self.rate_limiter.acquire()
        url = urljoin(self.base_url, path.lstrip("/"))
        request_headers = {**self._build_headers(), **(headers or {})}

        for attempt in range(3):
            try:
                response = await self.client.request(
                    method, url, params=params, json=json, headers=request_headers
                )
                response.raise_for_status()
                return response
            except httpx.HTTPStatusError as e:
                if e.response.status_code >= 500 and attempt < 2:
                    wait = 2 ** attempt
                    logger.warning("Server error, retrying", attempt=attempt, wait=wait, url=url)
                    await asyncio.sleep(wait)
                    continue
                raise
            except httpx.RequestError as e:
                if attempt < 2:
                    wait = 2 ** attempt
                    logger.warning("Request error, retrying", attempt=attempt, wait=wait, url=url)
                    await asyncio.sleep(wait)
                    continue
                raise

        raise RuntimeError("Max retries exceeded")

    async def get(self, path: str, params: Optional[Dict] = None) -> httpx.Response:
        return await self._request("GET", path, params=params)

    async def post(self, path: str, json: Dict, params: Optional[Dict] = None) -> httpx.Response:
        return await self._request("POST", path, json=json, params=params)

    @abstractmethod
    async def fetch_latest(self, since: Optional[datetime] = None) -> List[T]:
        pass

    @abstractmethod
    def normalize(self, raw: T) -> Dict[str, Any]:
        pass


class CachedClientMixin:
    def __init__(self, *args, cache_ttl: int = 300, **kwargs):
        super().__init__(*args, **kwargs)
        self.cache_ttl = cache_ttl
        self._cache: Dict[str, tuple[Any, float]] = {}

    def _cache_key(self, path: str, params: Optional[Dict]) -> str:
        key_data = f"{path}:{sorted(params.items()) if params else ''}"
        return hashlib.md5(key_data.encode()).hexdigest()

    async def cached_get(self, path: str, params: Optional[Dict] = None) -> httpx.Response:
        key = self._cache_key(path, params)
        now = time.time()

        if key in self._cache:
            data, cached_at = self._cache[key]
            if now - cached_at < self.cache_ttl:
                logger.debug("Cache hit", key=key)
                return data

        response = await self.get(path, params)
        self._cache[key] = (response, now)
        return response

    def clear_cache(self) -> None:
        self._cache.clear()


class PaginationParams(BaseModel):
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)