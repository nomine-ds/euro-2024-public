import secrets

import pytest
from fastapi import HTTPException

from app.core.admin_auth import require_admin_api_key
from app.core.config import get_cors_origins


def test_admin_key_is_required(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("CACHE_API_KEY", raising=False)

    with pytest.raises(HTTPException) as error:
        require_admin_api_key(None)

    assert error.value.status_code == 503


def test_admin_key_requires_constant_value_match(monkeypatch: pytest.MonkeyPatch) -> None:
    expected = secrets.token_urlsafe(24)
    monkeypatch.setenv("CACHE_API_KEY", expected)

    require_admin_api_key(expected)

    with pytest.raises(HTTPException) as error:
        require_admin_api_key("invalid")

    assert error.value.status_code == 401


def test_cors_is_disabled_when_no_origins_are_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    assert get_cors_origins() == []
