# app/routers/matches.py
"""
Match metadata endpoints.

Endpoints:
    GET /matches                       — list all matches
    GET /matches/with360               — list matches that have 360 data
    GET /match/{match_id}/has360       — check if a match has 360 data
"""
from fastapi import APIRouter, HTTPException

import app.main as main

router = APIRouter(tags=["matches"])


@router.get("/matches")
def get_matches():
    if main.MATCHES_DF is None or main.MATCHES_DF.empty:
        raise HTTPException(503, "Match data not loaded.")
    result = []
    for _, row in main.MATCHES_DF.iterrows():
        home, away = row.get('home_team'), row.get('away_team')
        home_name = (
            home.get('home_team_name') if isinstance(home, dict)
            else (str(home) if home else 'Unknown')
        )
        away_name = (
            away.get('away_team_name') if isinstance(away, dict)
            else (str(away) if away else 'Unknown')
        )
        result.append({
            "match_id": row.get('match_id'),
            "home_team": home_name,
            "away_team": away_name,
            "date": row.get('match_date'),
        })
    return result


@router.get("/matches/with360")
def get_matches_with_360():
    if main.MATCHES_DF is None:
        raise HTTPException(503, "Match data not loaded.")
    three_sixty_dir = main.DATA_DIR / "three-sixty"
    if not three_sixty_dir.exists():
        return []
    ids = set()
    for f in three_sixty_dir.glob("*.json"):
        try:
            ids.add(int(f.stem))
        except ValueError:
            continue
    result = []
    for _, row in main.MATCHES_DF.iterrows():
        mid = row.get('match_id')
        if mid in ids:
            home = row.get('home_team')
            away = row.get('away_team')
            if isinstance(home, dict):
                home_name = home.get('name') or home.get('home_team_name') or str(home)
            else:
                home_name = str(home) if home else 'Unknown'
            if isinstance(away, dict):
                away_name = away.get('name') or away.get('away_team_name') or str(away)
            else:
                away_name = str(away) if away else 'Unknown'
            result.append({
                "match_id": mid,
                "home_team": home_name,
                "away_team": away_name,
                "date": row.get('match_date'),
            })
    return result


@router.get("/match/{match_id}/has360")
def match_has_360(match_id: int):
    return {
        "match_id": match_id,
        "has_360": (main.DATA_DIR / "three-sixty" / f"{match_id}.json").exists(),
    }
@router.get("/match/{match_id}/summary")
def match_summary(match_id: int):
    stats = main.MATCH_STATS_CACHE.get(match_id)
    if stats is None:
        events = main.load_match_events_from_file(match_id)
        if events is None and main.EVENTS_DF is not None and 'match_id' in main.EVENTS_DF.columns:
            df = main.EVENTS_DF[main.EVENTS_DF['match_id'] == match_id]
            if not df.empty:
                events = df.to_dict(orient='records')
        if events is None:
            raise HTTPException(404, f"Match {match_id} not found.")

        total_shots, total_passes, total_xg = 0, 0, 0.0
        for ev in events:
            type_name = main.get_event_type_name(ev)
            if type_name == 'Shot':
                total_shots += 1
                shot = ev.get('shot') or {}
                xg_val = shot.get('statsbomb_xg') or ev.get('shot_statsbomb_xg')
                if xg_val:
                    try:
                        total_xg += float(xg_val)
                    except Exception:
                        pass
            elif type_name == 'Pass':
                total_passes += 1
        stats = {
            'total_goals': 0,
            'total_shots': total_shots,
            'total_passes': total_passes,
            'total_xg': round(total_xg, 2),
        }

    home_name, away_name, home_id, away_id, home_score, away_score = main.load_match_info(match_id)
    home_name = home_name or "Unknown"
    away_name = away_name or "Unknown"
    home_score = home_score or 0
    away_score = away_score or 0

    return {
        "match_id": match_id,
        "home_team": home_name,
        "away_team": away_name,
        "home_goals": int(home_score),
        "away_goals": int(away_score),
        "total_goals": int(home_score) + int(away_score),
        "total_events": stats.get('total_shots', 0) + stats.get('total_passes', 0),
        "shots": stats.get('total_shots', 0),
        "passes": stats.get('total_passes', 0),
        "total_xG": stats.get('total_xg', 0),
    }