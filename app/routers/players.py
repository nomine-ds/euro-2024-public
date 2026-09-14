# app/routers/players.py
"""
Player-related endpoints.

Endpoints:
    GET /players                          — list players (filter by match/team)
    GET /players/bulk                     — bulk player stats (cached)
    GET /player/{player_id}/summary       — season summary
    GET /player/{player_id}/breakdown     — per-match breakdown
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

import app.main as main

router = APIRouter(tags=["players"])


@router.get("/players")
def get_players(match_id: Optional[int] = Query(None), team_id: Optional[int] = Query(None)):
    if main.EVENTS_DF is None:
        raise HTTPException(503, "Data not loaded.")
    df = main.EVENTS_DF.copy()
    if match_id:
        df = df[df['match_id'] == match_id]
    if team_id:
        if 'team_id' in df.columns:
            df = df[df['team_id'] == team_id]
        else:
            df = df[df['team'].apply(lambda x: x.get('id') if isinstance(x, dict) else None) == team_id]
    players, seen = [], set()
    for _, row in df.iterrows():
        p = row.get('player')
        if isinstance(p, dict):
            pid = p.get('id')
            if pid and pid not in seen:
                seen.add(pid)
                players.append({
                    "player_id": pid,
                    "player_name": p.get('name', 'Unknown'),
                    "team_id": row.get('team_id') or (
                        row.get('team', {}).get('id') if isinstance(row.get('team'), dict) else None
                    ),
                })
    return players


@router.get("/players/bulk")
def get_players_bulk(match_id: Optional[int] = Query(None)):
    if not main.PLAYER_STATS_CACHE:
        raise HTTPException(503, "Cache not ready. Wait for startup.")
    result = list(main.PLAYER_STATS_CACHE.values())
    result.sort(key=lambda x: x['goals'], reverse=True)
    return [
        {
            'player_id': p['player_id'], 'player_name': p['player_name'], 'team_name': p['team_name'],
            'goals': p['goals'], 'assists': p['assists'], 'shots': p['shots'], 'passes': p['passes'],
            'xg': round(p['xg'], 2), 'xa': round(p['xa'], 2),
        }
        for p in result
    ]


@router.get("/player/{player_id}/summary")
def player_summary(player_id: int):
    if main.EVENTS_DF is None:
        raise HTTPException(503, "Data not loaded.")

    if main.PLAYER_STATS_CACHE and player_id in main.PLAYER_STATS_CACHE:
        p = main.PLAYER_STATS_CACHE[player_id]
        return {
            "player_id": p['player_id'], "player_name": p['player_name'],
            "team_name": p.get('team_name'),
            "goals": p['goals'], "assists": p['assists'], "shots": p['shots'],
            "passes": p['passes'], "xG": round(p['xg'], 2), "xA": round(p['xa'], 2),
        }

    mask = main.EVENTS_DF['player'].apply(
        lambda x: isinstance(x, dict) and x.get('id') == player_id
    )
    df_player = main.EVENTS_DF[mask]
    if df_player.empty:
        raise HTTPException(404, f"Player {player_id} not found.")

    total_goals, total_assists, total_shots, total_passes, xg, xa = 0, 0, 0, 0, 0.0, 0.0
    name = "Unknown"
    first_row = df_player.iloc[0]
    if isinstance(first_row.get('player'), dict):
        name = first_row['player'].get('name', 'Unknown')
    for _, row in df_player.iterrows():
        type_name = main.get_event_type_name(row)
        if not type_name:
            continue
        if type_name == 'Shot':
            total_shots += 1
            shot = row.get('shot') or {}
            if isinstance(shot.get('outcome'), dict) and shot['outcome'].get('name') == 'Goal':
                total_goals += 1
            xg_val = shot.get('statsbomb_xg') or row.get('shot_statsbomb_xg')
            if xg_val:
                try:
                    xg += float(xg_val)
                except Exception:
                    pass
        elif type_name == 'Pass':
            total_passes += 1
            if 'pass_xg' in row and row['pass_xg']:
                try:
                    xa += float(row['pass_xg'])
                except Exception:
                    pass
            if row.get('goal_assist') is True:
                total_assists += 1
    return {
        "player_id": player_id, "player_name": name,
        "goals": total_goals, "assists": total_assists,
        "shots": total_shots, "passes": total_passes,
        "xG": round(xg, 2), "xA": round(xa, 2),
    }


@router.get("/player/{player_id}/breakdown")
def player_breakdown(player_id: int):
    if main.EVENTS_DF is None:
        raise HTTPException(503, "Data not loaded.")

    mask = main.EVENTS_DF['player'].apply(
        lambda x: isinstance(x, dict) and x.get('id') == player_id
    )
    df = main.EVENTS_DF[mask]

    if df.empty:
        raise HTTPException(404, f"Player {player_id} not found.")

    matches = {}
    for _, row in df.iterrows():
        mid = row.get('match_id')
        if mid is None:
            continue
        try:
            mid = int(mid)
        except (ValueError, TypeError):
            continue

        if mid not in matches:
            matches[mid] = {
                'match_id': mid, 'goals': 0, 'assists': 0,
                'shots': 0, 'passes': 0, 'xg': 0.0, 'xa': 0.0,
            }

        type_name = main.get_event_type_name(row)
        if type_name == 'Shot':
            matches[mid]['shots'] += 1
            shot = row.get('shot') or {}
            if isinstance(shot.get('outcome'), dict) and shot['outcome'].get('name') == 'Goal':
                matches[mid]['goals'] += 1
            xg_val = shot.get('statsbomb_xg') or row.get('shot_statsbomb_xg')
            if xg_val:
                try:
                    matches[mid]['xg'] += float(xg_val)
                except (ValueError, TypeError):
                    pass
        elif type_name == 'Pass':
            matches[mid]['passes'] += 1
            if row.get('goal_assist') is True:
                matches[mid]['assists'] += 1
            xa_val = row.get('pass_xg')
            if xa_val:
                try:
                    matches[mid]['xa'] += float(xa_val)
                except (ValueError, TypeError):
                    pass

    result = []
    for mid, stats in matches.items():
        home_name, away_name, _, _, home_score, away_score = main.load_match_info(mid)
        result.append({
            **stats,
            'home_team': home_name or 'Unknown',
            'away_team': away_name or 'Unknown',
            'home_score': int(home_score) if home_score else 0,
            'away_score': int(away_score) if away_score else 0,
            'xg': round(stats['xg'], 2),
            'xa': round(stats['xa'], 2),
        })

    result.sort(key=lambda x: x['match_id'], reverse=True)

    return {
        'player_id': player_id,
        'total_matches': len(result),
        'matches': result,
    }