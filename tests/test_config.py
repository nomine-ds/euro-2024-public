import pytest

from app.core.config import get_cors_origins


def test_cors_origins_are_parsed(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000, https://example.test ")

    assert get_cors_origins() == [
        "http://localhost:3000",
        "https://example.test",
    ]


def test_wildcard_cors_is_rejected_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("CORS_ORIGINS", "*")

    with pytest.raises(ValueError, match="must not include"):
        get_cors_origins()
