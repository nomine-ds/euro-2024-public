import json
import pandas as pd
from app.core.config import DATA_DIR

def parse_freezeframe_safely(event_row):
    """
    Ambil data freeze_frame dari 1 baris event.
    Kembalikan list of dict: {player_id, name, x, y, teammate}.
    Kalau error, balikin list kosong.
    """
    freeze_raw = event_row.get('freeze_frame')
    
    if not freeze_raw or (isinstance(freeze_raw, float) and pd.isna(freeze_raw)):
        return []
    
    if isinstance(freeze_raw, str):
        try:
            freeze_list = json.loads(freeze_raw)
        except Exception:
            print(f"⚠️ Gagal parse freeze_frame string: {freeze_raw[:100]}...")
            return []
    else:
        freeze_list = freeze_raw
    
    if not isinstance(freeze_list, list):
        return []
    
    parsed = []
    for p in freeze_list:
        if not isinstance(p, dict):
            continue
        
        loc = p.get('location') or p.get('coordinates')
        if not loc or len(loc) < 2:
            continue
        
        player_info = p.get('player')
        if not isinstance(player_info, dict):
            player_info = {}
        
        is_teammate = p.get('teammate', False)
        
        parsed.append({
            'player_id': player_info.get('id', 0),
            'player_name': player_info.get('name', 'Unknown'),
            'x': float(loc[0]) if loc[0] is not None else 0.0,
            'y': float(loc[1]) if loc[1] is not None else 0.0,
            'teammate': bool(is_teammate),
            'jersey': player_info.get('jersey_number', 0)
        })
    
    return parsed

def get_360_for_event(event_row):
    """
    Input: 1 baris pandas Series (atau dict).
    Output: dict dengan key possession_team, opponent_team, ball_x, ball_y.
    """
    positions = parse_freezeframe_safely(event_row)
    if not positions:
        return None
    
    team_a = []
    team_b = []
    for p in positions:
        if p['teammate']:
            team_a.append(p)
        else:
            team_b.append(p)
    
    ball_loc = event_row.get('location')
    if not ball_loc or len(ball_loc) < 2:
        ball_x, ball_y = 0.0, 0.0
    else:
        try:
            ball_x = float(ball_loc[0])
            ball_y = float(ball_loc[1])
        except Exception:
            ball_x, ball_y = 0.0, 0.0
    
    return {
        'event_id': event_row.get('id'),
        'match_id': event_row.get('match_id', 0),
        'timestamp': event_row.get('timestamp', 0),
        'period': event_row.get('period', 1),
        'possession_team': team_a,
        'opponent_team': team_b,
        'ball_x': ball_x,
        'ball_y': ball_y
    }

def load_360_from_file(match_id: int):
    """Membaca data 360 dari file three-sixty/{match_id}.json"""
    file_path = DATA_DIR / "three-sixty" / f"{match_id}.json"
    if not file_path.exists():
        return None
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None

def get_360_for_event_v2(event_row, match_id: int):
    """
    Versi 2: Coba baca dari freeze_frame event dulu,
    kalau kosong, baca dari file three-sixty/{match_id}.json
    """
    freeze = parse_freezeframe_safely(event_row)
    if freeze:
        return get_360_for_event(event_row)
    
    data = load_360_from_file(match_id)
    if not data:
        return None
    
    event_uuid = event_row.get('id')
    for frame in data:
        if frame.get('event_uuid') == event_uuid:
            home_players = []
            away_players = []
            for p in frame.get('freeze_frame', []):
                player_data = {
                    'player_id': p.get('player', {}).get('id', 0),
                    'player_name': p.get('player', {}).get('name', 'Unknown'),
                    'x': p.get('location', [0,0])[0] if len(p.get('location', [])) > 0 else 0,
                    'y': p.get('location', [0,0])[1] if len(p.get('location', [])) > 1 else 0,
                    'teammate': p.get('teammate', False),
                    'jersey': p.get('player', {}).get('jersey_number', 0)
                }
                if p.get('teammate', False):
                    home_players.append(player_data)
                else:
                    away_players.append(player_data)
            
            ball_loc = frame.get('location', [0,0])
            return {
                'event_id': event_uuid,
                'match_id': match_id,
                'timestamp': frame.get('timestamp', 0),
                'period': frame.get('period', 1),
                'possession_team': home_players,
                'opponent_team': away_players,
                'ball_x': ball_loc[0] if len(ball_loc) > 0 else 0,
                'ball_y': ball_loc[1] if len(ball_loc) > 1 else 0
            }
    
    return None