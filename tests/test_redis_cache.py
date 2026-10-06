import anyio
import pytest
from collections.abc import AsyncIterator

from app.core.redis_cache import SharedCache


class InMemoryRedis:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}

    async def ping(self) -> bool:
        return True

    async def aclose(self) -> None:
        return None

    async def get(self, key: str) -> str | None:
        return self.values.get(key)

    async def set(self, key: str, value: str, ex: int) -> None:
        self.values[key] = value

    async def mget(self, keys: list[str]) -> list[str | None]:
        return [self.values.get(key) for key in keys]

    async def delete(self, *keys: str) -> int:
        deleted = 0
        for key in keys:
            if key in self.values:
                del self.values[key]
                deleted += 1
        return deleted

    async def scan_iter(self, match: str) -> AsyncIterator[str]:
        prefix = match.removesuffix("*")
        for key in tuple(self.values):
            if key.startswith(prefix):
                yield key


@pytest.fixture
def redis_client() -> InMemoryRedis:
    return InMemoryRedis()


def test_redis_cache_round_trips_integer_mapping_keys(
    redis_client: InMemoryRedis,
) -> None:
    async def scenario() -> None:
        cache = SharedCache(redis_url="configured", client=redis_client)
        await cache.connect()
        calls = 0

        def compute() -> dict[int, dict[str, int]]:
            nonlocal calls
            calls += 1
            return {17: {"goals": 1}}

        assert await cache.get_or_compute("player:base", compute) == {17: {"goals": 1}}
        assert await cache.get_or_compute("player:base", compute) == {17: {"goals": 1}}
        assert calls == 1
        await cache.close()

    anyio.run(scenario)


def test_redis_cache_invalidates_matching_keys(redis_client: InMemoryRedis) -> None:
    async def scenario() -> None:
        cache = SharedCache(redis_url="configured", client=redis_client)
        await cache.connect()
        await cache.get_or_compute("player:base", lambda: {17: {"goals": 1}})
        await cache.get_or_compute("team:base", lambda: {4: {"name": "Spain"}})

        assert await cache.invalidate(["player:base"]) == ["player:base"]
        assert await cache.invalidate(all=True) == ["team:base"]
        await cache.close()

    anyio.run(scenario)


def test_production_cache_requires_redis(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("REDIS_URL", raising=False)
    monkeypatch.setenv("APP_ENV", "production")

    with pytest.raises(RuntimeError, match="REDIS_URL is required"):
        anyio.run(SharedCache().connect)
