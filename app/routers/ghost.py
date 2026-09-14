# app/routers/ghost.py
"""
Ghost Player / Position Density endpoint.

Endpoints:
    GET /ghost/{match_id} — spatial density from 360 freeze-frames
"""
from fastapi import APIRouter, HTTPException

import app.main as main

router = APIRouter(tags=["ghost"])


@router.get("/ghost/{match_id}")
def ghost_player_endpoint(match_id: int):
    if main.EVENTS_DF is None:
        raise HTTPException(503, "Data not loaded.")
    result = main.get_ghost_data_from_360(match_id)
    if result is None:
        raise HTTPException(
            404,
            f"Match {match_id} not found or has no valid 360 data.",
        )

    # Add aggregate insights (frame-level, not identity-tracked)
    insights = main._compute_ghost_insights(result.get('ghost_movements', []))
    if insights:
        result['insights'] = insights

    # Honest disclaimer message
    result['disclaimer'] = (
        "StatsBomb 360 freeze-frames show only the ~20 players nearest the ball "
        "at each event. Identity tracking across frames is approximate. "
        "Scores below reflect position frequency, not stable player identity."
    )
    return result