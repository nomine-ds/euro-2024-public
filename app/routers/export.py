# app/routers/export.py
"""
CSV export endpoint.

Endpoints:
    GET /export/csv — export matches / players / match_events / player_summary
"""
import io
import csv
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

import app.main as main

router = APIRouter(tags=["export"])


@router.get("/export/csv")
def export_csv(
    export_type: str = Query(...),
    match_id: int = Query(None),
    player_id: int = Query(None),
    limit: int = Query(1000),
):
    if main.EVENTS_DF is None or main.MATCHES_DF is None:
        raise HTTPException(503, "Data not loaded.")
    data, filename = [], "export.csv"
    if export_type == "matches":
        data = main.MATCHES_DF.head(limit).to_dict(orient='records')
        filename = "matches.csv"
    elif export_type == "players":
        seen, players = set(), []
        for _, row in main.EVENTS_DF.iterrows():
            p = row.get('player')
            if isinstance(p, dict):
                pid = p.get('id')
                if pid and pid not in seen:
                    seen.add(pid)
                    players.append({"player_id": pid, "player_name": p.get('name', 'Unknown')})
            if len(players) >= limit:
                break
        data = players
        filename = "players.csv"
    elif export_type == "match_events":
        if match_id is None:
            raise HTTPException(400, "match_id required")
        df = main.EVENTS_DF[main.EVENTS_DF['match_id'] == match_id].head(limit)
        df['player_name'] = df['player'].apply(lambda x: x.get('name') if isinstance(x, dict) else None)
        df['team_name'] = df['team'].apply(lambda x: x.get('name') if isinstance(x, dict) else None)
        df['type'] = df['type'].apply(lambda x: x.get('name') if isinstance(x, dict) else None)
        cols = ['id', 'timestamp', 'period', 'type', 'player_name', 'team_name', 'x', 'y']
        available = [c for c in cols if c in df.columns]
        data = df[available].to_dict(orient='records')
        filename = f"match_{match_id}_events.csv"
    elif export_type == "player_summary":
        if player_id is None:
            raise HTTPException(400, "player_id required")
        summary = main.player_summary(player_id)
        if not summary or summary.get('player_name') == 'Unknown':
            raise HTTPException(404, f"Player {player_id} not found")
        data = [summary]
        filename = f"player_{player_id}_summary.csv"
    else:
        raise HTTPException(400, "Invalid export_type")
    if not data:
        raise HTTPException(404, "No data found")
    output = io.StringIO()
    fieldnames = data[0].keys()
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(data)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )