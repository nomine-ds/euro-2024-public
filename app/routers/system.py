# app/routers/system.py
"""
System endpoints — health check and forced data reload.

Endpoints:
    GET /       — health check
    GET /load   — force reload from StatsBomb Open Data
"""
import os

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

import app.main as main
from app.cache import shared_cache

router = APIRouter(tags=["system"])


class CacheInvalidateRequest(BaseModel):
    keys: list[str] | None = None
    all: bool = False


@router.get("/")
def root():
    return {
        "status": "online",
        "data_loaded": main.EVENTS_DF is not None,
        "total_events": len(main.EVENTS_DF) if main.EVENTS_DF is not None else 0,
    }


@router.get("/load")
def force_load():
    main.EVENTS_DF, main.MATCHES_DF = main.load_or_fetch_all()
    if main.EVENTS_DF is not None and not main.EVENTS_DF.empty:
        if 'id' in main.EVENTS_DF.columns:
            main.EVENTS_DF.set_index('id', drop=False, inplace=True)
        return {"status": "ok", "events": len(main.EVENTS_DF)}
    return {"status": "error"}


@router.post("/admin/cache/invalidate")
def invalidate_cache(payload: CacheInvalidateRequest, x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    expected = os.getenv("CACHE_API_KEY", "change-me")
    if x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")
    invalidated = shared_cache.invalidate(payload.keys, all=payload.all)
    return {"invalidated": invalidated}
