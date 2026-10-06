import inspect
import json
import os
from collections.abc import Callable, Iterable
from typing import Any

import anyio
from redis.asyncio import Redis

from app.cache import shared_cache as process_cache


def _encode(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            "__euro_cache_type__": "dict",
            "items": [[_encode(key), _encode(item)] for key, item in value.items()],
        }
    if isinstance(value, list):
        return [_encode(item) for item in value]
    if isinstance(value, tuple):
        return {"__euro_cache_type__": "tuple", "items": [_encode(item) for item in value]}
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    item = getattr(value, "item", None)
    if callable(item):
        return _encode(item())
    raise TypeError(f"Unsupported value in shared cache: {type(value).__name__}")


def _decode(value: Any) -> Any:
    if isinstance(value, list):
        return [_decode(item) for item in value]
    if isinstance(value, dict):
        if value.get("__euro_cache_type__") == "dict":
            return {_decode(key): _decode(item) for key, item in value["items"]}
        if value.get("__euro_cache_type__") == "tuple":
            return tuple(_decode(item) for item in value["items"])
    return value


class SharedCache:
    def __init__(
        self, ttl: int = 600, redis_url: str | None = None, client: Redis | None = None
    ) -> None:
        self._redis_url = redis_url.strip() if redis_url is not None else None
        self._ttl = ttl
        self._client = client
        self._prefix = "euro-2024:cache:"

    async def connect(self) -> None:
        redis_url = self._redis_url
        if redis_url is None:
            redis_url = os.getenv("REDIS_URL", "").strip()
            self._redis_url = redis_url
        if not redis_url:
            if os.getenv("APP_ENV", "development").strip().lower() == "production":
                raise RuntimeError("REDIS_URL is required when APP_ENV=production.")
            return

        if self._client is None:
            self._client = Redis.from_url(redis_url, decode_responses=True)
        await self._client.ping()

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def get_or_compute(self, key: str, compute_fn: Callable[[], Any]) -> Any:
        if self._client is None:
            return await process_cache.get_or_compute(key, compute_fn)

        redis_key = f"{self._prefix}{key}"
        cached = await self._client.get(redis_key)
        if cached is not None:
            return _decode(json.loads(cached))

        if inspect.iscoroutinefunction(compute_fn):
            value = await compute_fn()
        else:
            value = await anyio.to_thread.run_sync(compute_fn)
        encoded = json.dumps(_encode(value), separators=(",", ":"))
        await self._client.set(redis_key, encoded, ex=self._ttl)
        return value

    async def invalidate(
        self, keys: Iterable[str] | None = None, *, all: bool = False
    ) -> list[str]:
        if self._client is None:
            return process_cache.invalidate(keys, all=all)

        if all:
            redis_keys = [
                key async for key in self._client.scan_iter(match=f"{self._prefix}*")
            ]
        else:
            redis_keys = [f"{self._prefix}{key}" for key in keys or ()]

        if not redis_keys:
            return []
        values = await self._client.mget(redis_keys)
        existing_keys = [
            key for key, value in zip(redis_keys, values, strict=True) if value is not None
        ]
        if existing_keys:
            await self._client.delete(*existing_keys)
        return [key.removeprefix(self._prefix) for key in existing_keys]


shared_cache = SharedCache()
