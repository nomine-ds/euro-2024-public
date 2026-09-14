# app/routers/tactical.py
"""
Tactical Timeline endpoint — rolling stats + multivariate PELT.

Endpoints:
    GET /tactical/{match_id} — rolling xG/PPDA/Field Tilt + change points
"""
from fastapi import APIRouter, HTTPException

import app.main as main

router = APIRouter(tags=["tactical"])


@router.get("/tactical/{match_id}")
def tactical_time_machine(match_id: int):
    if main.EVENTS_DF is None:
        raise HTTPException(503, "Data not loaded.")
    try:
        result = main.detect_tactical_changes(main.EVENTS_DF, match_id)
    except Exception as e:
        print(f"Tactical endpoint error: {e}")
        raise HTTPException(500, "Failed to compute tactical timeline.")
    if result is None:
        raise HTTPException(404, f"Match {match_id} not found or has insufficient event data.")
    return result