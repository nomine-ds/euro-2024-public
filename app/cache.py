import asyncio
import inspect
import os
import time
from typing import Any, Callable, Iterable

import anyio

try:
    import structlog
except Exception:  # pragma: no cover
    import logging

    class _FallbackStructlog:
        def get_logger(self):
            return logging.getLogger("app.cache")

    structlog = _FallbackStructlog()

logger = structlog.get_logger()


class TTLCache:
    def __init__(self, ttl: float = 600.0):
        self.ttl = ttl
        self._entries: dict[str, dict[str, Any]] = {}
        self._inflight: dict[str, asyncio.Task[Any]] = {}
        self._lock = asyncio.Lock()

    def invalidate(self, keys: Iterable[str] | None = None, *, all: bool = False):
        if all:
            invalidated = list(self._entries.keys())
            self._entries.clear()
            return invalidated

        keys = list(keys or [])
        invalidated = []
        for key in keys:
            if key in self._entries:
                invalidated.append(key)
                del self._entries[key]
        return invalidated

    async def get_or_compute(self, key: str, compute_fn: Callable[[], Any]):
        now = time.monotonic()
        entry = self._entries.get(key)
        if entry is not None and entry["expires_at"] > now:
            logger.info("cache_hit", key=key, cache="ttl")
            return entry["value"]

        async with self._lock:
            entry = self._entries.get(key)
            if entry is not None and entry["expires_at"] > now:
                logger.info("cache_hit", key=key, cache="ttl")
                return entry["value"]

            if key not in self._inflight:
                logger.info("cache_miss", key=key)
                self._inflight[key] = asyncio.create_task(self._run_compute(key, compute_fn))

            task = self._inflight[key]

        try:
            return await task
        finally:
            async with self._lock:
                if self._inflight.get(key) is task:
                    self._inflight.pop(key, None)

    async def _run_compute(self, key: str, compute_fn: Callable[[], Any]):
        start = time.perf_counter()
        logger.info("compute_start", key=key)
        try:
            if inspect.iscoroutinefunction(compute_fn):
                value = await compute_fn()
            else:
                value = await anyio.to_thread.run_sync(compute_fn)
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.info("compute_end", key=key, duration_ms=round(duration_ms, 2))

        self._entries[key] = {
            "value": value,
            "expires_at": time.monotonic() + self.ttl,
        }
        return value


shared_cache = TTLCache(ttl=600)


def get_admin_api_key() -> str:
    return os.getenv("CACHE_API_KEY", "change-me")
