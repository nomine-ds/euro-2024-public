# app/routers/events.py
"""
Event stream and 360 freeze-frame endpoints.

Endpoints:
    GET /events/{match_id}      — full event stream for a match
    GET /360/{event_uuid}       — freeze-frame for one event
    GET /avg_position           — average pitch position for a player
    GET /debug/{event_uuid}     — debug single event (raw dict)
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

import app.main as main

router = APIRouter(tags=["events"])


@router.get("/360/{event_uuid}")
def get_360(event_uuid: str, match_id: Optional[int] = Query(None)):
    if main.EVENTS_DF is None:
        raise HTTPException(503, "Data not loaded.")
    if event_uuid in main.EVENTS_DF.index:
        row = main.EVENTS_DF.loc[event_uuid]
        if match_id is None:
            match_id = row.get('match_id')
        result = main.get_360_for_event(row)
        if result is not None:
            return result
    if match_id is not None:
        result = main.get_360_for_event_v2(event_uuid, match_id)
        if result is not None:
            return result
    raise HTTPException(404, "Event not found or has no 360 data.")


@router.get("/avg_position")
def avg_position(player_id: int, match_id: int):
    if main.EVENTS_DF is None:
        raise HTTPException(503, "Data not loaded.")
    if 'freeze_frame' not in main.EVENTS_DF.columns:
        raise HTTPException(404, "360 data not available in this dataset.")
    mask = (main.EVENTS_DF['match_id'] == match_id) & (main.EVENTS_DF['freeze_frame'].notna())
    subset = main.EVENTS_DF[mask]
    if subset.empty:
        return {"found": False, "message": "No 360 data for this match."}
    xs, ys = [], []
    for _, row in subset.iterrows():
        players = main.parse_freezeframe_safely(row)
        for p in players:
            if p['player_id'] == player_id:
                xs.append(p['x'])
                ys.append(p['y'])
    if not xs:
        return {"found": False, "message": f"Player {player_id} not found."}
    return {
        "found": True,
        "player_id": player_id,
        "match_id": match_id,
        "avg_x": round(sum(xs) / len(xs), 2),
        "avg_y": round(sum(ys) / len(ys), 2),
        "samples": len(xs),
    }


import math


def _json_safe(obj):
    """Recursively replace NaN with None for JSON compliance."""
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_json_safe(v) for v in obj]
    # numpy scalar → convert via float()
    try:
        if hasattr(obj, 'item'):
            obj = obj.item()
    except Exception:
        pass
    if isinstance(obj, float) and math.isnan(obj):
        return None
    return obj


@router.get("/debug/{event_uuid}")
def debug_event(event_uuid: str):
    if main.EVENTS_DF is None:
        raise HTTPException(503, "Data not loaded.")
    if event_uuid not in main.EVENTS_DF.index:
        raise HTTPException(404, "Event not found.")
    row = main.EVENTS_DF.loc[event_uuid]
    output = _json_safe(row.to_dict())
    if 'freeze_frame' in output and output['freeze_frame']:
        ff = output['freeze_frame']
        if isinstance(ff, list) and len(ff) > 5:
            output['freeze_frame'] = f"[{len(ff)} items, first 5: {ff[:5]}]"
    return output


@router.get("/events/{match_id}")
def get_match_events(match_id: int, event_type: Optional[str] = Query(None)):
    events = main.load_match_events_from_file(match_id)
    if events is None and main.EVENTS_DF is not None and 'match_id' in main.EVENTS_DF.columns:
        df = main.EVENTS_DF[main.EVENTS_DF['match_id'] == match_id]
        if not df.empty:
            events = df.to_dict(orient='records')
        else:
            raise HTTPException(404, f"Match {match_id} not found.")
    elif events is None:
        raise HTTPException(404, f"Match {match_id} not found.")

    if event_type:
        events = [ev for ev in events if main.get_event_type_name(ev) == event_type]

    result = []
    for ev in events:
        p = ev.get('player')
        player_name = p.get('name') if isinstance(p, dict) else None
        t = ev.get('team')
        team_name = t.get('name') if isinstance(t, dict) else None
        type_name = main.get_event_type_name(ev)
        loc = ev.get('location') or [0, 0]
        outcome, is_goal, card_type = None, False, None
        if type_name == 'Shot':
            shot = ev.get('shot') or {}
            out = shot.get('outcome')
            if isinstance(out, dict):
                outcome = out.get('name')
                if outcome == 'Goal':
                    is_goal = True
        foul = ev.get('foul_committed') or {}
        card = foul.get('card') or {}
        card_type = card.get('name') if isinstance(card, dict) else None
        result.append({
            "event_id": ev.get('id'),
            "match_id": match_id,
            "timestamp": ev.get('timestamp'),
            "period": ev.get('period'),
            "player_name": player_name,
            "team_name": team_name,
            "event_type": type_name,
            "outcome": outcome,
            "is_goal": is_goal,
            "card_type": card_type,
            "x": loc[0] if len(loc) > 0 else 0,
            "y": loc[1] if len(loc) > 1 else 0,
            "has_360": bool(ev.get('freeze_frame')),
        })
    return result