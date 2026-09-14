# app/routers/passnetwork.py
"""
Pass network endpoint — player-to-player pass graph.

Endpoints:
    GET /passnetwork/{match_id} — nodes (avg positions) + edges (pass counts)
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

import app.main as main

router = APIRouter(tags=["passnetwork"])


@router.get("/passnetwork/{match_id}")
def get_pass_network(match_id: int, team_id: Optional[int] = Query(None)):
    events = main.load_match_events_from_file(match_id)
    if events is None and main.EVENTS_DF is not None and 'match_id' in main.EVENTS_DF.columns:
        df = main.EVENTS_DF[main.EVENTS_DF['match_id'] == match_id]
        if not df.empty:
            events = df.to_dict(orient='records')
        else:
            raise HTTPException(404, f"Match {match_id} not found.")
    elif events is None:
        raise HTTPException(404, f"Match {match_id} not found.")

    passes = [ev for ev in events if main.get_event_type_name(ev) == 'Pass']
    if not passes:
        return {"nodes": [], "edges": [], "message": "No passes found."}

    if team_id is not None:
        passes = [
            p for p in passes
            if p.get('team_id') == team_id
            or (p.get('team', {}).get('id') if isinstance(p.get('team'), dict) else None) == team_id
        ]

    edges_dict = {}
    nodes_set = set()
    player_names = {}
    player_positions = {}

    for p in passes:
        player = p.get('player')
        if not isinstance(player, dict):
            continue
        passer_id, passer_name = player.get('id'), player.get('name', 'Unknown')
        if passer_id is None:
            continue

        pass_obj = p.get('pass')
        if not isinstance(pass_obj, dict):
            continue
        recipient = pass_obj.get('recipient')
        if not isinstance(recipient, dict):
            continue
        recipient_id, recipient_name = recipient.get('id'), recipient.get('name', 'Unknown')
        if recipient_id is None:
            continue

        player_names[passer_id] = passer_name
        player_names[recipient_id] = recipient_name
        nodes_set.add(passer_id)
        nodes_set.add(recipient_id)

        loc = p.get('location')
        if isinstance(loc, list) and len(loc) >= 2:
            try:
                x, y = float(loc[0]), float(loc[1])
                player_positions.setdefault(passer_id, []).append((x, y))
            except (TypeError, ValueError):
                pass

        end_loc = pass_obj.get('end_location')
        if isinstance(end_loc, list) and len(end_loc) >= 2:
            try:
                ex, ey = float(end_loc[0]), float(end_loc[1])
                player_positions.setdefault(recipient_id, []).append((ex, ey))
            except (TypeError, ValueError):
                pass

        key = (passer_id, recipient_id)
        edges_dict[key] = edges_dict.get(key, 0) + 1

    nodes = []
    for pid in nodes_set:
        positions = player_positions.get(pid, [])
        if positions:
            avg_x = round(sum(p[0] for p in positions) / len(positions), 2)
            avg_y = round(sum(p[1] for p in positions) / len(positions), 2)
        else:
            avg_x, avg_y = 60.0, 40.0
        nodes.append({
            "id": pid,
            "name": player_names.get(pid, f"Player {pid}"),
            "avg_x": avg_x,
            "avg_y": avg_y,
        })

    edges = [{"source": sid, "target": tid, "count": count} for (sid, tid), count in edges_dict.items()]
    return {
        "match_id": match_id,
        "team_id": team_id,
        "total_passes": sum(e["count"] for e in edges),
        "nodes": nodes,
        "edges": edges,
    }