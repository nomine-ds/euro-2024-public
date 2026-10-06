# app/routers/system.py
"""
System endpoints — health check and forced data reload.

Endpoints:
    GET /       — health check
    GET /load   — force reload from StatsBomb Open Data
"""
from fastapi import APIRouter, Header
from pydantic import BaseModel

import app.main as main
from app.core.admin_auth import require_admin_api_key
from app.core.redis_cache import shared_cache

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
def force_load(x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    require_admin_api_key(x_api_key)
    main.EVENTS_DF, main.MATCHES_DF = main.load_or_fetch_all()
    if main.EVENTS_DF is not None and not main.EVENTS_DF.empty:
        if 'id' in main.EVENTS_DF.columns:
            main.EVENTS_DF.set_index('id', drop=False, inplace=True)
        return {"status": "ok", "events": len(main.EVENTS_DF)}
    return {"status": "error"}


@router.post("/admin/cache/invalidate")
async def invalidate_cache(
    payload: CacheInvalidateRequest,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
):
    require_admin_api_key(x_api_key)
    invalidated = await shared_cache.invalidate(payload.keys, all=payload.all)
    return {"invalidated": invalidated}
