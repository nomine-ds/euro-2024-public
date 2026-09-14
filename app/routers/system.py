# app/routers/system.py
"""
System endpoints — health check and forced data reload.

Endpoints:
    GET /       — health check
    GET /load   — force reload from StatsBomb Open Data
"""
from fastapi import APIRouter

import app.main as main

router = APIRouter(tags=["system"])


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