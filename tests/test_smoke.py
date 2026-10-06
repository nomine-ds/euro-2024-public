# tests/test_smoke.py
"""
Smoke tests — verify all endpoints return expected status codes.
Uses TestClient context manager to trigger FastAPI startup event
(which loads EVENTS_DF, MATCHES_DF, and caches).

Usage:
    pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
from app.core.config import DATA_DIR
from app.main import app

pytestmark = pytest.mark.skipif(
    not (DATA_DIR / "all_events.json").exists(),
    reason="StatsBomb event cache is required for endpoint smoke tests.",
)


@pytest.fixture(scope="module")
def client():
    """TestClient with startup event triggered (loads data)."""
    with TestClient(app) as c:
        yield c


SMOKE_CASES = [
    # Core
    ("GET", "/", 200),
    ("GET", "/matches", 200),
    ("GET", "/matches/with360", 200),
    ("GET", "/match/3943043/has360", 200),
    # Events / 360
    ("GET", "/events/3943043", 200),
        ("GET", "/avg_position?player_id=99174&match_id=3943043", 200),
    # Players
    ("GET", "/players", 200),
    ("GET", "/players/bulk", 200),
    ("GET", "/player/39565/summary", 200),
    ("GET", "/player/39565/breakdown", 200),
    # Match
    ("GET", "/match/3943043/summary", 200),
    ("GET", "/passnetwork/3943043", 200),
    ("GET", "/teams", 200),
    # Analytics
    ("GET", "/players/clustering?n_clusters=4", 200),
    ("GET", "/matches/similar/3943043", 200),
    ("GET", "/tactical/3943043", 200),
    ("GET", "/ghost/3943043", 200),
    ("GET", "/cognitive/3943043", 200),
    # Counterfactual
    ("GET", "/counterfactual/simulate?match_id=3943043&event_id=ed5aa53b-8d52-4c98-9288-f296490ed018&alternative=pass", 200),
    # Bot
    ("GET", "/bot/health", 200),
]


@pytest.mark.parametrize("method,path,expected", SMOKE_CASES)
def test_smoke(client, method, path, expected):
    r = client.request(method, path)
    assert r.status_code == expected, (
        f"{method} {path} -> {r.status_code} "
        f"(expected {expected}): {r.text[:200]}"
    )