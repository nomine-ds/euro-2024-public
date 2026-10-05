import asyncio

import pytest
from fastapi.testclient import TestClient

from app.cache import TTLCache, shared_cache
from app.main import app


def test_first_call_computes():
    cache = TTLCache(ttl=600)
    calls = {"count": 0}

    def compute():
        calls["count"] += 1
        return {"value": 1}

    result = asyncio.run(cache.get_or_compute("player:base", compute))

    assert result == {"value": 1}
    assert calls["count"] == 1


def test_second_call_cached():
    cache = TTLCache(ttl=600)
    calls = {"count": 0}

    def compute():
        calls["count"] += 1
        return {"value": 2}

    first = asyncio.run(cache.get_or_compute("team:base", compute))
    second = asyncio.run(cache.get_or_compute("team:base", compute))

    assert first == {"value": 2}
    assert second == {"value": 2}
    assert calls["count"] == 1


def test_single_flight_concurrent():
    cache = TTLCache(ttl=600)
    calls = {"count": 0}

    async def compute():
        calls["count"] += 1
        await asyncio.sleep(0.05)
        return {"value": 3}

    async def run_all():
        await asyncio.gather(*(cache.get_or_compute("match:base", compute) for _ in range(10)))

    asyncio.run(run_all())
    assert calls["count"] == 1


def test_ttl_expiry():
    cache = TTLCache(ttl=0.01)
    calls = {"count": 0}

    def compute():
        calls["count"] += 1
        return {"value": 4}

    first = asyncio.run(cache.get_or_compute("player:base", compute))
    asyncio.run(asyncio.sleep(0.05))
    second = asyncio.run(cache.get_or_compute("player:base", compute))

    assert first == {"value": 4}
    assert second == {"value": 4}
    assert calls["count"] == 2


def test_invalidate_forces_recompute():
    cache = TTLCache(ttl=600)
    calls = {"count": 0}

    def compute():
        calls["count"] += 1
        return {"value": 5}

    first = asyncio.run(cache.get_or_compute("player:base", compute))
    cache.invalidate(["player:base"])
    second = asyncio.run(cache.get_or_compute("player:base", compute))

    assert first == {"value": 5}
    assert second == {"value": 5}
    assert calls["count"] == 2


def test_admin_endpoint_requires_api_key(monkeypatch):
    monkeypatch.setenv("CACHE_API_KEY", "secret")
    client = TestClient(app)

    response = client.post("/admin/cache/invalidate", json={"keys": ["player:base"]})
    assert response.status_code == 401

    authorized = client.post(
        "/admin/cache/invalidate",
        json={"keys": ["player:base"]},
        headers={"X-API-Key": "secret"},
    )
    assert authorized.status_code == 200
    payload = authorized.json()
    assert "invalidated" in payload


def test_shared_cache_reuses_library_instance():
    shared_cache.invalidate(all=True)
    calls = {"count": 0}

    def compute():
        calls["count"] += 1
        return {"value": 6}

    async def run_once():
        first = await shared_cache.get_or_compute("player:base", compute)
        second = await shared_cache.get_or_compute("player:base", compute)
        return first, second

    first, second = asyncio.run(run_once())

    assert first == {"value": 6}
    assert second == {"value": 6}
    assert calls["count"] == 1
