# app/routers/cognitive.py
"""
Cognitive Mirror endpoint — Decision Quality per event.

Endpoints:
    GET /cognitive/{match_id} — DQ analysis (Excellent/Neutral/Under Pressure/Mistake)
"""
import json
from fastapi import APIRouter, HTTPException

import app.main as main

router = APIRouter(tags=["cognitive"])


@router.get("/cognitive/{match_id}")
def cognitive_mirror(match_id: int):
    match_path = main.DATA_DIR / f"match_{match_id}.json"
    if not match_path.exists():
        raise HTTPException(404, f"File match_{match_id}.json not found.")

    try:
        with open(match_path, 'r', encoding='utf-8') as f:
            match_events = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error reading match file: {e}")
        raise HTTPException(500, "Failed to read match file.")

    if not isinstance(match_events, list) or not match_events:
        raise HTTPException(404, f"Match file {match_id} is empty.")

    three_path = main.DATA_DIR / "three-sixty" / f"{match_id}.json"
    if not three_path.exists():
        raise HTTPException(404, f"Match {match_id} has no 360 data.")

    try:
        with open(three_path, 'r', encoding='utf-8') as f:
            frames = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error reading 360 file: {e}")
        raise HTTPException(500, "Failed to read 360 file.")

    if not isinstance(frames, list) or not frames:
        raise HTTPException(404, f"360 file for match {match_id} is empty.")

    frame_map = {}
    for fr in frames:
        eid = fr.get('event_uuid')
        if eid:
            frame_map[eid] = fr.get('freeze_frame', [])

    def parse_minute(ev):
        m = ev.get('minute')
        if isinstance(m, (int, float)):
            return int(m)
        ts = ev.get('timestamp', '')
        if isinstance(ts, str) and ':' in ts:
            try:
                parts = ts.split(':')
                return int(float(parts[0])) * 60 + int(float(parts[1]))
            except (ValueError, IndexError):
                pass
        return 0

    results = []
    for ev in match_events:
        eid = ev.get('id')
        if not eid or eid not in frame_map:
            continue

        t = ev.get('type')
        type_name = t.get('name') if isinstance(t, dict) else t
        if type_name not in ('Pass', 'Shot', 'Dribble'):
            continue

        loc = ev.get('location')
        if not loc or len(loc) < 2:
            continue
        try:
            bx = float(loc[0])
            by = float(loc[1])
        except (TypeError, ValueError):
            continue

        freeze = frame_map[eid]
        nearest = main._nearest_opponent_distance(bx, by, freeze)
        if nearest is None:
            continue
        pressure = 1.0 / (nearest + 1.0)

        outcome = main._outcome_score(ev)
        if outcome is None:
            continue

        dq = outcome * (1.0 - pressure * main.PRESSURE_WEIGHT)

        if outcome == 1.0 and pressure >= main.PRESSURE_FLOOR:
            label = "excellent"
        elif outcome == 1.0:
            label = "neutral"
        elif outcome == 0.0 and pressure >= main.PRESSURE_FLOOR:
            label = "under_pressure"
        else:
            label = "mistake"

        p = ev.get('player')
        player_name = p.get('name', 'Unknown') if isinstance(p, dict) else 'Unknown'

        tm = ev.get('team')
        team_name = tm.get('name', '') if isinstance(tm, dict) else ''

        minute = parse_minute(ev)

        results.append({
            'event_id': eid,
            'player_name': player_name,
            'team_name': team_name,
            'event_type': type_name,
            'minute': minute,
            'pressure': round(pressure, 3),
            'nearest_opponent_dist': round(nearest, 2),
            'outcome_score': outcome,
            'decision_quality': round(dq, 3),
            'label': label,
        })

    if not results:
        raise HTTPException(404, f"No analyzable events for match {match_id}.")

    results.sort(key=lambda x: x['decision_quality'])

    total = len(results)
    avg_dq = sum(r['decision_quality'] for r in results) / total
    count_excellent = sum(1 for r in results if r['label'] == 'excellent')
    count_neutral = sum(1 for r in results if r['label'] == 'neutral')
    count_under_pressure = sum(1 for r in results if r['label'] == 'under_pressure')
    count_mistake = sum(1 for r in results if r['label'] == 'mistake')

    return {
        'match_id': match_id,
        'total_events_analyzed': total,
        'events': results[:main.MAX_EVENTS_RETURNED],
        'summary': {
            'avg_dq': round(avg_dq, 3),
            'count_excellent': count_excellent,
            'count_neutral': count_neutral,
            'count_under_pressure': count_under_pressure,
            'count_mistake': count_mistake,
            'pct_excellent': round(count_excellent / total * 100, 1),
            'pct_neutral': round(count_neutral / total * 100, 1),
            'pct_under_pressure': round(count_under_pressure / total * 100, 1),
            'pct_mistake': round(count_mistake / total * 100, 1),
        },
    }