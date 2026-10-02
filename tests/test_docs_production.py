import importlib
import sys

from fastapi.testclient import TestClient


def reload_app_module(monkeypatch, app_env: str):
    monkeypatch.setenv("APP_ENV", app_env)
    sys.modules.pop("app.main", None)
    module = importlib.import_module("app.main")
    return module


def test_docs_disabled_in_production(monkeypatch):
    module = reload_app_module(monkeypatch, "production")
    client = TestClient(module.app)

    assert client.get("/docs").status_code == 404
    assert client.get("/openapi.json").status_code == 404


def test_docs_enabled_in_development(monkeypatch):
    module = reload_app_module(monkeypatch, "development")
    client = TestClient(module.app)

    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").status_code == 200
