import json
import os
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import ruptures as rpt
from collections import defaultdict
from scipy.optimize import linear_sum_assignment
import traceback

from app.core.config import DATA_DIR
from app.data.loader import load_or_fetch_all


EVENTS_DF = None
MATCHES_DF = None

PLAYER_STATS_CACHE = {}
MATCH_STATS_CACHE = {}
TEAM_STATS_CACHE = {}
MATCH_INFO_CACHE = {}
MATCH_EVENTS_CACHE = {}


# ===================================================================
# HELPERS — event parsing
# ===================================================================

def get_event_type_name(row):
    if hasattr(row, 'to_dict'):
        row = row.to_dict()
    typ = row.get('type')
    if isinstance(typ, dict):
        return typ.get('name')
    elif isinstance(typ, str):
        return typ
    elif isinstance(typ, (int, float)):
        type_map = {1: 'Shot', 2: 'Pass', 3: 'Carry', 4: 'Pressure', 5: 'Duel'}
        return type_map.get(int(typ))
    return None


def parse_freezeframe_safely(event_row):
    freeze_raw = event_row.get('freeze_frame')
    if not freeze_raw:
        return []
    if isinstance(freeze_raw, str):
        try:
            freeze_list = json.loads(freeze_raw)
        except Exception:
            return []
    else:
        freeze_list = freeze_raw
    parsed = []
    for p in freeze_list:
        if not isinstance(p, dict):
            continue
        loc = p.get('location') or [0, 0]
        if len(loc) < 2:
            continue
        player = p.get('player') or {}
        if not isinstance(player, dict):
            player = {}
        parsed.append({
            'player_id': player.get('id', 0),
            'player_name': player.get('name', 'Unknown'),
            'x': float(loc[0]) if loc[0] is not None else 0.0,
            'y': float(loc[1]) if loc[1] is not None else 0.0,
            'teammate': p.get('teammate', False),
            'jersey': player.get('jersey_number', 0)
        })
    return parsed


def get_360_for_event(event_row):
    positions = parse_freezeframe_safely(event_row)
    if not positions:
        return None
    team_a, team_b = [], []
    for p in positions:
        if p['teammate']:
            team_a.append(p)
        else:
            team_b.append(p)
    ball_loc = event_row.get('location') or [0, 0]
    if len(ball_loc) < 2:
        ball_loc = [0, 0]
    return {
        'event_id': event_row.get('id'),
        'match_id': event_row.get('match_id', 0),
        'timestamp': event_row.get('timestamp', 0),
        'period': event_row.get('period', 1),
        'possession_team': team_a,
        'opponent_team': team_b,
        'ball_x': float(ball_loc[0]),
        'ball_y': float(ball_loc[1])
    }


# ===================================================================
# HELPERS — data loading
# ===================================================================

def load_match_events_from_file(match_id: int):
    if match_id in MATCH_EVENTS_CACHE:
        return MATCH_EVENTS_CACHE[match_id]

    file_path = DATA_DIR / f"match_{match_id}.json"
    if not file_path.exists():
        return None
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            events = json.load(f)
        for ev in events:
            ev['match_id'] = match_id
        MATCH_EVENTS_CACHE[match_id] = events
        return events
    except Exception as e:
        print(f"Warning: {e}")
        return None


def load_match_info(match_id: int):
    if match_id in MATCH_INFO_CACHE:
        return MATCH_INFO_CACHE[match_id]

    matches_path = DATA_DIR / "matches.json"
    if not matches_path.exists():
        return None, None, None, None, None, None

    try:
        with open(matches_path, 'r', encoding='utf-8') as f:
            all_matches = json.load(f)

        for m in all_matches:
            if m.get('match_id') == match_id:
                home, away = m.get('home_team'), m.get('away_team')
                home_name, home_id = None, None
                if isinstance(home, dict):
                    home_name = home.get('home_team_name') or home.get('name')
                    home_id = home.get('home_team_id') or home.get('id')
                elif isinstance(home, str):
                    home_name = home
                elif isinstance(home, (int, float)):
                    home_id = int(home)
                if not home_name:
                    home_name = m.get('home_team_name') or m.get('home_team') or 'Unknown'
                if not home_id:
                    home_id = m.get('home_team_id')

                away_name, away_id = None, None
                if isinstance(away, dict):
                    away_name = away.get('away_team_name') or away.get('name')
                    away_id = away.get('away_team_id') or away.get('id')
                elif isinstance(away, str):
                    away_name = away
                elif isinstance(away, (int, float)):
                    away_id = int(away)
                if not away_name:
                    away_name = m.get('away_team_name') or m.get('away_team') or 'Unknown'
                if not away_id:
                    away_id = m.get('away_team_id')

                result = (home_name, away_name, home_id, away_id, m.get('home_score'), m.get('away_score'))
                MATCH_INFO_CACHE[match_id] = result
                return result
        return None, None, None, None, None, None
    except Exception as e:
        print(f"Warning: {e}")
        return None, None, None, None, None, None


def load_360_from_file(match_id: int):
    file_path = DATA_DIR / "three-sixty" / f"{match_id}.json"
    if not file_path.exists():
        return None
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: {e}")
        return None


def get_360_for_event_v2(event_uuid: str, match_id: int):
    data = load_360_from_file(match_id)
    if data is None:
        return None
    for frame in data:
        if frame.get('event_uuid') == event_uuid:
            freeze = frame.get('freeze_frame', [])
            possession, opponent = [], []
            for player in freeze:
                loc = player.get('location', [0, 0])
                pos = {
                    'player_id': 0, 'player_name': 'Unknown',
                    'x': loc[0] if len(loc) > 0 else 0,
                    'y': loc[1] if len(loc) > 1 else 0,
                    'jersey': 0, 'teammate': player.get('teammate', False)
                }
                if pos['teammate']:
                    possession.append(pos)
                else:
                    opponent.append(pos)
            return {
                'event_id': event_uuid, 'match_id': match_id,
                'timestamp': frame.get('timestamp', 0), 'period': frame.get('period', 1),
                'possession_team': possession, 'opponent_team': opponent,
                'ball_x': 0, 'ball_y': 0
            }
    return None


# ===================================================================
# HELPERS — stats aggregation
# ===================================================================

def get_team_stats_from_events(events_df, team_id: int, match_id: int = None):
    if match_id is None and team_id in TEAM_STATS_CACHE:
        return TEAM_STATS_CACHE[team_id]

    if events_df is None or events_df.empty:
        return None
    df = events_df
    if match_id is not None:
        df = df[df['match_id'] == match_id]

    def extract_team_id(row):
        t = row.get('team')
        return t.get('id') if isinstance(t, dict) else row.get('team_id')

    mask = df.apply(lambda row: extract_team_id(row) == team_id, axis=1)
    df_team = df[mask]
    if df_team.empty:
        return {"team_id": team_id, "team_name": f"Team {team_id}", "goals": 0, "shots": 0, "passes": 0, "xG": 0.0, "xA": 0.0, "tackles": 0, "interceptions": 0, "clearances": 0}

    team_name = None
    for _, row in df_team.iterrows():
        t = row.get('team')
        if isinstance(t, dict) and team_name is None:
            team_name = t.get('name')
            break
    if team_name is None:
        team_name = f"Team {team_id}"

    stats = {"team_id": team_id, "team_name": team_name, "goals": 0, "shots": 0, "passes": 0, "xG": 0.0, "xA": 0.0, "tackles": 0, "interceptions": 0, "clearances": 0}
    for _, row in df_team.iterrows():
        type_name = get_event_type_name(row)
        if type_name == 'Shot':
            stats['shots'] += 1
            shot = row.get('shot') or {}
            if isinstance(shot.get('outcome'), dict) and shot['outcome'].get('name') == 'Goal':
                stats['goals'] += 1
            xg_val = shot.get('statsbomb_xg') or row.get('shot_statsbomb_xg')
            if xg_val:
                try:
                    stats['xG'] += float(xg_val)
                except Exception:
                    pass
        elif type_name == 'Pass':
            stats['passes'] += 1
            xa_val = row.get('pass_xg')
            if xa_val:
                try:
                    stats['xA'] += float(xa_val)
                except Exception:
                    pass
        elif type_name == 'Tackle':
            stats['tackles'] += 1
        elif type_name == 'Interception':
            stats['interceptions'] += 1
        elif type_name == 'Clearance':
            stats['clearances'] += 1
    stats['xG'] = round(stats['xG'], 2)
    stats['xA'] = round(stats['xA'], 2)
    return stats


def get_match_stats(events_df, match_id):
    try:
        match_id = int(match_id)
    except (ValueError, TypeError):
        return None

    if MATCH_STATS_CACHE and match_id in MATCH_STATS_CACHE:
        return MATCH_STATS_CACHE[match_id]

    if events_df is None or events_df.empty:
        return None
    df = events_df[events_df['match_id'] == match_id]
    if df.empty:
        return None

    total_goals, total_shots, total_passes, total_xg = 0, 0, 0, 0.0
    for _, row in df.iterrows():
        type_name = get_event_type_name(row)
        if type_name == 'Shot':
            total_shots += 1
            shot = row.get('shot') or {}
            if isinstance(shot.get('outcome'), dict) and shot['outcome'].get('name') == 'Goal':
                total_goals += 1
            xg_val = shot.get('statsbomb_xg') or row.get('shot_statsbomb_xg')
            if xg_val:
                try:
                    total_xg += float(xg_val)
                except Exception:
                    pass
        elif type_name == 'Pass':
            total_passes += 1

    return {
        'total_goals': int(total_goals),
        'total_shots': int(total_shots),
        'total_passes': int(total_passes),
        'total_xg': round(float(total_xg), 2)
    }


def get_match_similarity(events_df, match_id, top_n=5):
    try:
        if events_df is None or events_df.empty:
            return []
        try:
            match_id = int(match_id)
        except (ValueError, TypeError):
            return []
        target = get_match_stats(events_df, match_id)
        if target is None:
            return []

        def safe_num(v):
            try:
                f = float(v) if v is not None else 0.0
                if pd.isna(f):
                    return 0.0
                return f
            except (ValueError, TypeError):
                return 0.0

        target_vals = (
            safe_num(target.get('total_goals')),
            safe_num(target.get('total_shots')),
            safe_num(target.get('total_passes')),
            safe_num(target.get('total_xg')),
        )

        all_ids = events_df['match_id'].dropna().unique().tolist()
        similarities = []

        for mid in all_ids:
            try:
                mid_int = int(mid)
            except (ValueError, TypeError):
                continue
            if mid_int == match_id:
                continue
            stats = get_match_stats(events_df, mid_int)
            if stats is None:
                continue
            stats_vals = (
                safe_num(stats.get('total_goals')),
                safe_num(stats.get('total_shots')),
                safe_num(stats.get('total_passes')),
                safe_num(stats.get('total_xg')),
            )
            dist = sum((a - b) ** 2 for a, b in zip(target_vals, stats_vals)) ** 0.5
            if pd.isna(dist):
                continue
            similarities.append({
                'match_id': mid_int,
                'distance': round(dist, 2),
                'stats': stats
            })

        similarities.sort(key=lambda x: x['distance'])
        return similarities[:top_n]
    except Exception as e:
        print(f"ERROR get_match_similarity: {e}")
        traceback.print_exc()
        return []


def get_head_to_head(events_df, team_a, team_b):
    global MATCHES_DF
    if MATCHES_DF is None:
        return None
    matches = set()
    for _, row in events_df.iterrows():
        t = row.get('team')
        tid = t.get('id') if isinstance(t, dict) else row.get('team_id')
        if tid in (team_a, team_b):
            mid = row.get('match_id')
            if mid:
                matches.add(mid)
    if not matches:
        return None
    h2h = []
    for mid in matches:
        match_row = MATCHES_DF[MATCHES_DF['match_id'] == mid]
        if match_row.empty:
            continue
        row = match_row.iloc[0]
        home, away = row.get('home_team'), row.get('away_team')
        home_id, away_id = (home.get('id') if isinstance(home, dict) else None, away.get('id') if isinstance(away, dict) else None)
        if home_id not in (team_a, team_b) or away_id not in (team_a, team_b):
            continue
        home_score, away_score = row.get('home_score', 0), row.get('away_score', 0)
        if home_id == team_a:
            score_a, score_b = home_score, away_score
        else:
            score_a, score_b = away_score, home_score
        h2h.append({"match_id": mid, "team_a_score": score_a, "team_b_score": score_b})
    if not h2h:
        return None
    total_a = sum(x['team_a_score'] for x in h2h)
    total_b = sum(x['team_b_score'] for x in h2h)
    return {"matches": h2h, "total_goals_a": total_a, "total_goals_b": total_b, "winner": "A" if total_a > total_b else "B" if total_b > total_a else "Draw"}


# ===================================================================
# TACTICAL TIME MACHINE
# ===================================================================

# ===================================================================
# TACTICAL TIMELINE
# ===================================================================
# Match-level aggregate (both teams combined). Metrics are NOT per-team.
# - xG rolling: sum of StatsBomb xG per 5-min bin
# - PPDA: opponent passes / defensive actions (StatsBomb standard actions)
# - Field Tilt: final-third share = ft / (ft + dt)
# Change detection: multivariate PELT on [xG, PPDA, Field Tilt]

TACTICAL_WINDOW_MINUTES = 5
ATT_THIRD_X = 80.0        # pitch is 0-120; x>80 = attacking third
DEF_THIRD_X = 40.0        # x<40 = defensive third
PRESS_DEF_ACTIONS = {'Block', 'Interception', 'Clearance'}  # StatsBomb standard
MIN_EVENTS_FOR_TACTICAL = 5
PELT_PENALTY = 3.0        # fixed penalty; chosen via sensitivity check
MIN_CP_SEPARATION = 2     # min bin gap for fallback peak detection


def get_rolling_stats(events_df, match_id: int, window_minutes: int = TACTICAL_WINDOW_MINUTES):
    """
    Compute rolling match-level stats per 5-min bin. Reads directly from
    match_{id}.json to avoid the loader timestamp bug (column is pandas.Timestamp).
    NOT per-team — aggregated across both teams.
    """
    events = load_match_events_from_file(match_id)
    if events is None:
        if events_df is None or events_df.empty:
            return None
        df = events_df[events_df['match_id'] == match_id]
        if df.empty:
            return None
        events = df.to_dict(orient='records')

    if not events:
        return None

    parsed = []
    for ev in events:
        minute = None
        m = ev.get('minute')
        if isinstance(m, (int, float)):
            minute = float(m)
        else:
            ts = ev.get('timestamp', '')
            if isinstance(ts, str) and ':' in ts:
                try:
                    parts = ts.split(':')
                    minute = int(float(parts[0])) * 60 + int(float(parts[1]))
                    if len(parts) > 2:
                        minute += float(parts[2]) / 60.0
                except (ValueError, IndexError):
                    minute = None
        if minute is None:
            continue
        parsed.append((minute, ev))

    if len(parsed) < MIN_EVENTS_FOR_TACTICAL:
        return None

    max_minute = max(p[0] for p in parsed)

    bins = []
    b = 0
    while b <= max_minute:
        bins.append(int(b))
        b += window_minutes
    if not bins:
        return None

    xg_per_bin = []
    passes_per_bin = []
    defensive_per_bin = []
    final_third_passes = []
    defensive_third_passes = []

    for bin_start in bins:
        bin_end = bin_start + window_minutes
        subset = [ev for (mn, ev) in parsed if bin_start <= mn < bin_end]

        xg_sum = 0.0
        passes = 0
        def_actions = 0
        ft_passes = 0
        dt_passes = 0

        for ev in subset:
            t = ev.get('type')
            type_name = t.get('name') if isinstance(t, dict) else t

            if type_name == 'Shot':
                shot = ev.get('shot') or {}
                xg_val = shot.get('statsbomb_xg')
                if xg_val is None:
                    xg_val = ev.get('shot_statsbomb_xg')
                if xg_val is not None:
                    try:
                        xg_sum += float(xg_val)
                    except (TypeError, ValueError):
                        pass
            elif type_name == 'Pass':
                passes += 1
                loc = ev.get('location')
                if isinstance(loc, list) and len(loc) > 0:
                    x = loc[0]
                    if x > ATT_THIRD_X:
                        ft_passes += 1
                    elif x < DEF_THIRD_X:
                        dt_passes += 1
            elif type_name in PRESS_DEF_ACTIONS:
                def_actions += 1

        xg_per_bin.append(round(xg_sum, 4))
        passes_per_bin.append(passes)
        defensive_per_bin.append(def_actions)
        final_third_passes.append(ft_passes)
        defensive_third_passes.append(dt_passes)

    # PPDA: passes / defensive actions. If 0 defensive actions, PPDA is undefined → None
    ppda_per_bin = []
    for p, d in zip(passes_per_bin, defensive_per_bin):
        if d > 0:
            ppda_per_bin.append(round(p / d, 2))
        else:
            ppda_per_bin.append(None)

    # Field Tilt: final-third share = ft / (ft + dt), 0-1 (0.5 = neutral)
    field_tilt_per_bin = []
    for ft, dt in zip(final_third_passes, defensive_third_passes):
        total = ft + dt
        if total > 0:
            field_tilt_per_bin.append(round(ft / total, 3))
        else:
            field_tilt_per_bin.append(0.5)

    return {
        'bins': bins,
        'xg_rolling': xg_per_bin,
        'ppda_rolling': ppda_per_bin,
        'field_tilt_rolling': field_tilt_per_bin,
        'window_minutes': window_minutes,
    }




def detect_tactical_changes(events_df, match_id: int):
    """
    Detect match tempo shifts using multivariate PELT on [xG, PPDA, Field Tilt].
    Returns None if match has insufficient data.
    """
    rolling = get_rolling_stats(events_df, match_id)
    if rolling is None:
        return None

    xgs = rolling['xg_rolling']
    ppdas = rolling['ppda_rolling']
    fts = rolling['field_tilt_rolling']
    n_bins = len(xgs)

    if n_bins < 3:
        return None

    # Fill None PPDA with column mean (PELT cannot handle NaN)
    valid_ppda = [v for v in ppdas if v is not None]
    mean_ppda = sum(valid_ppda) / len(valid_ppda) if valid_ppda else 0.0
    ppda_filled = [v if v is not None else mean_ppda for v in ppdas]

    signal = np.column_stack([xgs, ppda_filled, fts])

    # Multivariate PELT
    change_points = []
    method = 'none'
    try:
        algo = rpt.Pelt(model="l2").fit(signal)
        cps = algo.predict(pen=PELT_PENALTY)
        cps = [cp for cp in cps if 0 < cp < n_bins]
        if cps:
            change_points = cps
            method = 'pelt_multivariate'
    except Exception as e:
        print(f"PELT failed: {e}")

    # Fallback: local-maxima on xG (only if PELT found nothing)
    if not change_points:
        mean_xg = sum(xgs) / n_bins if n_bins else 0
        threshold = max(mean_xg * 2, 0.1)
        candidates = []
        for i in range(1, n_bins - 1):
            if (
                xgs[i] > threshold
                and xgs[i] >= xgs[i - 1]
                and xgs[i] >= xgs[i + 1]
            ):
                candidates.append(i)
        filtered = []
        for c in candidates:
            if not filtered or (c - filtered[-1]) >= MIN_CP_SEPARATION:
                filtered.append(c)
        if filtered:
            change_points = filtered
            method = 'xg_local_maxima'

    # Build response
    bins = rolling['bins']
    change_times = []
    for cp in change_points:
        if 0 < cp < n_bins:
            change_times.append({
                'minute': int(bins[cp]),
                'index': cp,
                'xg_before': xgs[cp - 1] if cp > 0 else 0,
                'xg_after': xgs[cp] if cp < n_bins else 0,
            })

    if change_times:
        message = f"Detected {len(change_times)} match tempo shifts (method: {method}, pen={PELT_PENALTY})."
    else:
        message = "No significant tempo shifts detected."

    return {
        'match_id': match_id,
        'change_points': change_times,
        'rolling_data': rolling,
        'pen_used': PELT_PENALTY,
        'detection_method': method,
        'message': message,
    }




# ===================================================================
# GHOST PLAYER (Vacuum Creation)
# ===================================================================

# Ghost Player — constants
VACUUM_SCALE = 5.0          # normalization scale for crowding score (0-5)
TOP_N_GHOSTS = 20           # return top-N players
MAX_MATCH_DISTANCE = 25.0   # pitch units; gate for track-to-detection assignment
MAX_COAST_FRAMES = 1       # allow track to survive without detection (Kalman-only prediction)
MIN_HITS_TO_CONFIRM = 3     # min detections before a track counts as a real player





class _KalmanTrack2D:
    """
    2D constant-velocity Kalman filter for tracking a single player.
    State: [x, y, vx, vy]. Measurement: [x, y].
    Process model: x_{t+1} = x_t + vx_t (uniform velocity).
    """

    def __init__(self, x: float, y: float):
        self.x = np.array([x, y, 0.0, 0.0], dtype=float)
        self.P = np.eye(4) * 10.0  # initial uncertainty
        self.F = np.array([
            [1, 0, 1, 0],
            [0, 1, 0, 1],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ], dtype=float)
        self.H = np.array([
            [1, 0, 0, 0],
            [0, 1, 0, 0],
        ], dtype=float)
        self.Q = np.eye(4) * 0.5  # process noise
        self.R = np.eye(2) * 5.0  # measurement noise (pitch units)

    def predict(self) -> np.ndarray:
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q
        return self.x[:2]

    def update(self, z: np.ndarray) -> None:
        y = z - self.H @ self.x
        S = self.H @ self.P @ self.H.T + self.R
        K = self.P @ self.H.T @ np.linalg.inv(S)
        self.x = self.x + K @ y
        self.P = (np.eye(4) - K @ self.H) @ self.P


def _hungarian_match(tracks, detections, max_distance):
    """
    Optimal track-to-detection assignment using the Hungarian algorithm
    (scipy.optimize.linear_sum_assignment). Rejects assignments above
    max_distance (gate). Returns (matches, unmatched_track_ids, unmatched_det_idxs).

    tracks: dict pid -> {'pred_x': float, 'pred_y': float, ...}
    detections: list of (x, y, teammate, keeper)
    """
    if not tracks or not detections:
        return {}, list(tracks.keys()), list(range(len(detections)))

    track_ids = list(tracks.keys())
    n_tracks = len(track_ids)
    n_dets = len(detections)

    cost = np.zeros((n_tracks, n_dets))
    for i, pid in enumerate(track_ids):
        px = tracks[pid]['pred_x']
        py = tracks[pid]['pred_y']
        for j, (dx, dy, _, _) in enumerate(detections):
            cost[i, j] = ((px - dx) ** 2 + (py - dy) ** 2) ** 0.5

    row_idx, col_idx = linear_sum_assignment(cost)

    matches = {}
    matched_dets = set()
    matched_tracks = set()
    for r, c in zip(row_idx, col_idx):
        if cost[r, c] <= max_distance:
            matches[track_ids[r]] = c
            matched_tracks.add(track_ids[r])
            matched_dets.add(c)

    unmatched_tracks = [pid for pid in track_ids if pid not in matched_tracks]
    unmatched_dets = [i for i in range(n_dets) if i not in matched_dets]
    return matches, unmatched_tracks, unmatched_dets


def _assign_tracked_ids(frames_raw):
    """
    Assign stable synthetic IDs using Hungarian matching + Kalman filter.

    Design:
      - Single global pool (do NOT split by teammate flag — it's event-relative
        in StatsBomb 360 and changes frame-to-frame).
      - Each track has a Kalman filter to predict position + velocity.
      - Hungarian assignment finds optimal track-to-detection pairing.
      - Tracks can "coast" up to MAX_COAST_FRAMES when temporarily undetected.
      - Tracks confirmed only after MIN_HITS_TO_CONFIRM detections.

    Returns: (all_frames, player_roles)
    """
    tracks = {}  # pid -> {kf, hits, coast, teammate_votes, keeper_votes, xs, pred_x, pred_y}
    next_id = 0
    all_frames = []
    total_detections = 0
    total_frames_processed = 0

    for frame in frames_raw:
        if not isinstance(frame, dict):
            continue
        raw_freeze = frame.get('freeze_frame', [])
        if not isinstance(raw_freeze, list):
            continue

        detections = []
        for p in raw_freeze:
            if not isinstance(p, dict):
                continue
            loc = p.get('location')
            if not loc or not isinstance(loc, (list, tuple)) or len(loc) < 2:
                continue
            try:
                x, y = float(loc[0]), float(loc[1])
            except (TypeError, ValueError):
                continue
            detections.append((
                x, y,
                bool(p.get('teammate', False)),
                bool(p.get('keeper', False)),
            ))

        if not detections:
            continue

        total_frames_processed += 1
        total_detections += len(detections)

        # Predict next position for each active track (Kalman predict step)
        for pid, t in tracks.items():
            pred = t['kf'].predict()
            t['pred_x'] = float(pred[0])
            t['pred_y'] = float(pred[1])

        matches, unmatched_tracks, unmatched_dets = _hungarian_match(
            tracks, detections, MAX_MATCH_DISTANCE
        )

        frame_positions = {}
        new_tracks = {}

        # Update matched tracks
        for pid, det_idx in matches.items():
            x, y, teammate, keeper = detections[det_idx]
            t = tracks[pid]
            t['kf'].update(np.array([x, y], dtype=float))
            t['hits'] += 1
            t['coast'] = 0
            t['teammate_votes'].append(teammate)
            t['keeper_votes'].append(keeper)
            t['xs'].append(x)
            frame_positions[pid] = (x, y)
            new_tracks[pid] = t

        # Coast unmatched tracks (Kalman-only, no measurement)
        for pid in unmatched_tracks:
            t = tracks[pid]
            t['coast'] += 1
            if t['coast'] <= MAX_COAST_FRAMES:
                px = float(t['kf'].x[0])
                py = float(t['kf'].x[1])
                frame_positions[pid] = (px, py)
                new_tracks[pid] = t
            # else: track dies (dropped)

        # Birth: new tracks for unmatched detections
        for det_idx in unmatched_dets:
            x, y, teammate, keeper = detections[det_idx]
            pid = f"P_{next_id}"
            next_id += 1
            kf = _KalmanTrack2D(x, y)
            new_tracks[pid] = {
                'kf': kf,
                'hits': 1,
                'coast': 0,
                'teammate_votes': [teammate],
                'keeper_votes': [keeper],
                'xs': [x],
                'pred_x': x,
                'pred_y': y,
            }
            frame_positions[pid] = (x, y)

        tracks = new_tracks
        if frame_positions:
            all_frames.append({
                'timestamp': frame.get('event_uuid', ''),
                'positions': frame_positions,
            })

    # Majority vote per confirmed track
    player_roles = {}
    for pid, t in tracks.items():
        if t['hits'] < MIN_HITS_TO_CONFIRM:
            continue
        t_votes = t['teammate_votes']
        k_votes = t['keeper_votes']
        is_teammate = sum(t_votes) > len(t_votes) * 0.6
        is_keeper_vote = (sum(k_votes) / len(k_votes)) >= 0.3 if k_votes else False
        xs = t['xs']
        avg_x = sum(xs) / len(xs) if xs else 60
        is_keeper_pos = (avg_x < 15) or (avg_x > 105)
        player_roles[pid] = {
            'is_teammate': is_teammate,
            'is_keeper': is_keeper_vote or is_keeper_pos,
        }

    # Filter frames to confirmed tracks only
    confirmed_pids = set(player_roles.keys())
    filtered_frames = []
    for frame in all_frames:
        filtered_positions = {
            pid: pos for pid, pos in frame['positions'].items()
            if pid in confirmed_pids
        }
        if filtered_positions:
            filtered_frames.append({
                'timestamp': frame['timestamp'],
                'positions': filtered_positions,
            })

    print(f"[ghost MOT] frames={total_frames_processed} dets={total_detections} "
          f"confirmed_tracks={len(player_roles)} total_ids_created={next_id}")

    return filtered_frames, player_roles








def _role_names(player_roles):
    """Generate display names based on majority-voted roles."""
    names = {}
    t_count = 0
    o_count = 0
    # Sort by numeric suffix for stable ordering
    def sort_key(pid):
        try:
            return int(pid.split('_')[1])
        except (IndexError, ValueError):
            return 0
    for pid in sorted(player_roles.keys(), key=sort_key):
        role = player_roles[pid]
        if role['is_keeper']:
            names[pid] = "Keeper" if role['is_teammate'] else "Opponent GK"
        elif role['is_teammate']:
            t_count += 1
            names[pid] = f"Teammate #{t_count}"
        else:
            o_count += 1
            names[pid] = f"Opponent #{o_count}"
    return names




def _compute_ghost_insights(ghost_movements):
    """
    Compute aggregate insights from ghost movement data.
    Returns frame-level density stats (NOT identity-tracked).
    """
    if not ghost_movements:
        return None

    total_appearances = sum(g['sample_count'] for g in ghost_movements)
    avg_crowding = (
        sum(g['vacuum_created'] for g in ghost_movements) / len(ghost_movements)
    )
    avg_distance = (
        sum(g['raw_avg_distance'] for g in ghost_movements) / len(ghost_movements)
    )

    sorted_by_crowd = sorted(ghost_movements, key=lambda x: x['vacuum_created'])
    most_crowded = sorted_by_crowd[-1] if sorted_by_crowd else None
    least_crowded = sorted_by_crowd[0] if sorted_by_crowd else None

    return {
        'total_appearances': total_appearances,
        'avg_crowding_score': round(avg_crowding, 2),
        'avg_distance_to_nearest': round(avg_distance, 2),
        'most_crowded': {
            'name': most_crowded['player_name'],
            'score': most_crowded['vacuum_created'],
        } if most_crowded else None,
        'least_crowded': {
            'name': least_crowded['player_name'],
            'score': least_crowded['vacuum_created'],
        } if least_crowded else None,
    }


def process_vacuum_creation(frames, player_names, player_roles=None):
    """
    Compute per-player spatial crowding score.
    frames: list of {'timestamp', 'positions': {pid: (x,y)}}
    player_names: pid -> display name
    player_roles: pid -> {'is_teammate', 'is_keeper'} (optional, for opponent split)

    NOTE: "vacuum_created" measures SPATIAL DENSITY (proximity to other players),
    not literal vacuum. Higher = player spends more time close to others.
    Scale 0-5: avg_dist 0 -> 5.0, avg_dist >= 25 -> 0.
    """
    if not frames:
        return []

    player_avg_dist = defaultdict(list)
    player_dist_opponents = defaultdict(list)
    player_xs = defaultdict(list)
    player_ys = defaultdict(list)

    for frame_data in frames:
        positions = frame_data['positions']
        player_ids = list(positions.keys())
        if len(player_ids) < 2:
            continue
        for pid in player_ids:
            x1, y1 = positions[pid]
            player_xs[pid].append(x1)
            player_ys[pid].append(y1)
            all_dists = []
            opp_dists = []
            for other_pid in player_ids:
                if other_pid == pid:
                    continue
                x2, y2 = positions[other_pid]
                d = ((x1 - x2) ** 2 + (y1 - y2) ** 2) ** 0.5
                all_dists.append(d)
                if player_roles:
                    r1 = player_roles.get(pid, {})
                    r2 = player_roles.get(other_pid, {})
                    if r1.get('is_teammate') != r2.get('is_teammate'):
                        opp_dists.append(d)
            avg_all = sum(all_dists) / len(all_dists) if all_dists else 0
            player_avg_dist[pid].append(avg_all)
            if opp_dists:
                player_dist_opponents[pid].append(sum(opp_dists) / len(opp_dists))

    ghost_movements = []
    for pid, dists in player_avg_dist.items():
        if not dists:
            continue
        avg_dist = sum(dists) / len(dists)
        # Crowding score: high when player is close to others
        crowding = max(0.0, VACUUM_SCALE - avg_dist / 5.0)
        xs = player_xs[pid]
        ys = player_ys[pid]
        avg_x = sum(xs) / len(xs) if xs else 0.0
        avg_y = sum(ys) / len(ys) if ys else 0.0

        opp_dists = player_dist_opponents.get(pid, [])
        avg_opp_dist = sum(opp_dists) / len(opp_dists) if opp_dists else None

        role = (player_roles or {}).get(pid, {})
        entry = {
            'player_id': str(pid),
            'player_name': player_names.get(pid, f'Player {pid}'),
            'vacuum_created': round(crowding, 2),
            'sample_count': len(dists),
            'raw_avg_distance': round(avg_dist, 2),
            'avg_x': round(avg_x, 2),
            'avg_y': round(avg_y, 2),
            'is_teammate': bool(role.get('is_teammate', False)),
            'is_keeper': bool(role.get('is_keeper', False)),
        }
        if avg_opp_dist is not None:
            entry['raw_avg_distance_opponents'] = round(avg_opp_dist, 2)
        ghost_movements.append(entry)

    ghost_movements.sort(key=lambda x: x['vacuum_created'], reverse=True)
    return ghost_movements




def get_ghost_data_from_360(match_id: int):
    """
    Build ghost player data from 360 freeze-frames.
    Uses nearest-neighbor tracking to assign stable synthetic IDs (Critical fix).
    Falls back to EVENTS_DF if 360 file missing/corrupt.
    """
    file_path = DATA_DIR / "three-sixty" / f"{match_id}.json"

    data = None
    if file_path.exists():
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"[ghost] match {match_id}: failed to read 360 file: {e}")
            data = None

    if isinstance(data, list) and data:
        all_frames, player_roles = _assign_tracked_ids(data)
        if all_frames:
            # Compute vacuum with raw pids, then filter to persistent tracks
            ghost = process_vacuum_creation(all_frames, {}, player_roles)
            if ghost:
                # Only keep tracks with sufficient sample count
                MIN_SAMPLES = 100
                persistent = [g for g in ghost if g['sample_count'] >= MIN_SAMPLES]
                if len(persistent) < 5:
                    # Fallback: take top-30 by sample_count if not enough persistent
                    persistent = sorted(ghost, key=lambda x: -x['sample_count'])[:30]

                # Sort by vacuum score
                persistent.sort(key=lambda x: x['vacuum_created'], reverse=True)
                top = persistent[:TOP_N_GHOSTS]

                # Renumber names for readability
                t_n = 0
                o_n = 0
                k_n = 0
                for g in top:
                    if g['is_keeper']:
                        k_n += 1
                        g['player_name'] = "Keeper" if k_n == 1 else f"Keeper {k_n}"
                    elif g['is_teammate']:
                        t_n += 1
                        g['player_name'] = f"Teammate #{t_n}"
                    else:
                        o_n += 1
                        g['player_name'] = f"Opponent #{o_n}"

                return {
                    'match_id': match_id,
                    'ghost_movements': top,
                    'message': f"Top {len(top)} persistent tracks by spatial density (360 file).",
                    'source': 'three-sixty',
                    'total_frames': len(all_frames),
                }

    # Fallback to EVENTS_DF
    if EVENTS_DF is None:
        return None
    if 'freeze_frame' not in EVENTS_DF.columns:
        return None
    df = EVENTS_DF[EVENTS_DF['match_id'] == match_id]
    df = df[df['freeze_frame'].notna()]
    if df.empty:
        return None

    player_names = {}
    player_roles = {}
    all_frames = []
    for _, row in df.iterrows():
        freeze_raw = row.get('freeze_frame')
        if not freeze_raw:
            continue
        if isinstance(freeze_raw, str):
            try:
                freeze_list = json.loads(freeze_raw)
            except Exception:
                continue
        else:
            freeze_list = freeze_raw
        if not isinstance(freeze_list, list):
            continue
        frame_positions = {}
        for p in freeze_list:
            if not isinstance(p, dict):
                continue
            loc = p.get('location')
            if not loc or len(loc) < 2:
                continue
            player_info = p.get('player', {})
            pid = None
            if isinstance(player_info, dict) and player_info.get('id'):
                pid = player_info['id']
                player_names.setdefault(pid, player_info.get('name', f'Player {pid}'))
                player_roles.setdefault(pid, {
                    'is_teammate': bool(p.get('teammate', False)),
                    'is_keeper': bool(p.get('keeper', False)),
                })
            if pid is None:
                continue
            try:
                frame_positions[pid] = (float(loc[0]), float(loc[1]))
            except (TypeError, ValueError):
                continue
        if frame_positions:
            all_frames.append({
                'timestamp': row.get('timestamp', ''),
                'positions': frame_positions,
            })
    if not all_frames:
        return None
    ghost = process_vacuum_creation(all_frames, player_names, player_roles)
    if not ghost:
        return None
    return {
        'match_id': match_id,
        'ghost_movements': ghost[:TOP_N_GHOSTS],
        'message': f"Top {len(ghost[:TOP_N_GHOSTS])} players by spatial density (from events data).",
        'source': 'events_df',
        'total_frames': len(all_frames),
    }




# ===================================================================
# COGNITIVE MIRROR HELPERS
# ===================================================================

# Decision Quality (DQ) constants
# pressure = 1 / (distance + 1). At 1.5m from nearest opponent, pressure ≈ 0.40.
PRESSURE_FLOOR = 0.4   # threshold for "under pressure" classification
PRESSURE_WEIGHT = 0.5  # how much pressure penalizes DQ
MAX_EVENTS_RETURNED = 200  # API response cap (frontend should use total_events_analyzed)


def _nearest_opponent_distance(ball_x, ball_y, freeze_list):
    if not freeze_list or not isinstance(freeze_list, list):
        return None
    dists = []
    for p in freeze_list:
        if not isinstance(p, dict):
            continue
        if p.get('teammate', False):
            continue
        loc = p.get('location')
        if not loc or len(loc) < 2:
            continue
        try:
            dx = float(loc[0]) - ball_x
            dy = float(loc[1]) - ball_y
            dists.append((dx * dx + dy * dy) ** 0.5)
        except (TypeError, ValueError):
            continue
    return min(dists) if dists else None


def _outcome_score(event_row):
    """
    Return 1.0 (success), 0.0 (failure), or None (unknown → event skipped).
    Follows StatsBomb outcome semantics:
    - Pass: `outcome` field is only present for INCOMPLETE passes.
            Missing outcome = complete pass (success).
    - Shot: `outcome.name` in {Goal, Saved, Saved To Post, Blocked} = success.
    - Dribble: `outcome.name` == 'Complete' = success.
    """
    type_name = get_event_type_name(event_row)
    if type_name == 'Pass':
        pass_obj = event_row.get('pass')
        if not isinstance(pass_obj, dict):
            return None  # malformed Pass event
        out = pass_obj.get('outcome')
        if out is None:
            # StatsBomb: no outcome field = complete pass
            return 1.0
        if not isinstance(out, dict):
            return None
        name = out.get('name', '')
        return 1.0 if name == 'Complete' else 0.0
    elif type_name == 'Shot':
        shot = event_row.get('shot') or {}
        if not isinstance(shot, dict):
            return None
        out = shot.get('outcome')
        if not isinstance(out, dict):
            return None
        name = out.get('name', '')
        return 1.0 if name in ('Goal', 'Saved', 'Saved To Post', 'Blocked') else 0.0
    elif type_name == 'Dribble':
        dribble = event_row.get('dribble') or {}
        if not isinstance(dribble, dict):
            return None
        out = dribble.get('outcome')
        if not isinstance(out, dict):
            return None
        name = out.get('name', '')
        return 1.0 if name == 'Complete' else 0.0
    return None
# ===================================================================
# APP INIT
# ===================================================================

APP_ENV = os.getenv("APP_ENV", "development").strip().lower()

app = FastAPI(
    title="Euro 2024 Context Zone",
    description="Public API. Data cached locally.",
    version="1.0.0",
    docs_url=None if APP_ENV == "production" else "/docs",
    redoc_url=None if APP_ENV == "production" else "/redoc",
    openapi_url=None if APP_ENV == "production" else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
# Include routers
from app.routers.bot import router as bot_router
from app.routers.matches import router as matches_router
from app.routers.events import router as events_router
from app.routers.players import router as players_router
from app.routers.analytics import router as analytics_router
from app.routers.system import router as system_router
from app.routers.tactical import router as tactical_router
from app.routers.ghost import router as ghost_router
from app.routers.cognitive import router as cognitive_router
from app.routers.counterfactual import router as counterfactual_router
from app.routers.passnetwork import router as passnetwork_router
from app.routers.export import router as export_router
app.include_router(bot_router)
app.include_router(matches_router)
app.include_router(events_router)
app.include_router(players_router)
app.include_router(analytics_router)
app.include_router(system_router)
app.include_router(tactical_router)
app.include_router(ghost_router)
app.include_router(cognitive_router)
app.include_router(counterfactual_router)
app.include_router(passnetwork_router)
app.include_router(export_router)
# ===================================================================
# PRE-COMPUTE FUNCTIONS
# ===================================================================

def compute_player_stats(events_df):
    if events_df is None or events_df.empty:
        return {}
    stats = {}
    print("   Processing player stats...")
    for i, (_, row) in enumerate(events_df.iterrows()):
        if i % 20000 == 0 and i > 0:
            print(f"   ...{i} events processed")

        p = row.get('player')
        if not isinstance(p, dict):
            continue
        pid = p.get('id')
        if not pid:
            continue
        pid = int(pid)
        pname = p.get('name', 'Unknown')

        if pid not in stats:
            stats[pid] = {
                'player_id': pid, 'player_name': pname, 'team_name': None,
                'goals': 0, 'assists': 0, 'shots': 0, 'passes': 0,
                'tackles': 0, 'interceptions': 0, 'clearances': 0,
                'xg': 0.0, 'xa': 0.0, 'dribbles': 0,
            }

        if stats[pid]['team_name'] is None:
            t = row.get('team')
            if isinstance(t, dict):
                stats[pid]['team_name'] = t.get('name')

        typ = row.get('type')
        type_name = typ.get('name') if isinstance(typ, dict) else None

        if type_name == 'Shot':
            stats[pid]['shots'] += 1
            shot = row.get('shot')
            if isinstance(shot, dict):
                outcome = shot.get('outcome')
                if isinstance(outcome, dict) and outcome.get('name') == 'Goal':
                    stats[pid]['goals'] += 1
                xg_val = shot.get('statsbomb_xg')
                if xg_val is not None:
                    try:
                        f = float(xg_val)
                        if not pd.isna(f):
                            stats[pid]['xg'] += f
                    except (ValueError, TypeError):
                        pass
        elif type_name == 'Pass':
            stats[pid]['passes'] += 1
            if row.get('goal_assist') is True:
                stats[pid]['assists'] += 1
            xa_val = row.get('pass_xg')
            if xa_val is not None:
                try:
                    f = float(xa_val)
                    if not pd.isna(f):
                        stats[pid]['xa'] += f
                except (ValueError, TypeError):
                    pass
        elif type_name == 'Tackle':
            stats[pid]['tackles'] += 1
        elif type_name == 'Interception':
            stats[pid]['interceptions'] += 1
        elif type_name == 'Clearance':
            stats[pid]['clearances'] += 1
        elif type_name == 'Dribble':
            stats[pid]['dribbles'] += 1
    return stats


def compute_match_stats(events_df):
    if events_df is None or events_df.empty:
        return {}
    stats = {}
    print("   Processing match stats...")
    for i, (_, row) in enumerate(events_df.iterrows()):
        if i % 50000 == 0 and i > 0:
            print(f"   ...{i} events processed")
        mid = row.get('match_id')
        if mid is None or (isinstance(mid, float) and pd.isna(mid)):
            continue
        try:
            mid = int(mid)
        except (ValueError, TypeError):
            continue
        if mid not in stats:
            stats[mid] = {'total_goals': 0, 'total_shots': 0, 'total_passes': 0, 'total_xg': 0.0}

        typ = row.get('type')
        type_name = typ.get('name') if isinstance(typ, dict) else None
        if type_name == 'Shot':
            stats[mid]['total_shots'] += 1
            shot = row.get('shot')
            if isinstance(shot, dict):
                outcome = shot.get('outcome')
                if isinstance(outcome, dict) and outcome.get('name') == 'Goal':
                    stats[mid]['total_goals'] += 1
                xg_val = shot.get('statsbomb_xg')
                if xg_val is not None:
                    try:
                        f = float(xg_val)
                        if not pd.isna(f):
                            stats[mid]['total_xg'] += f
                    except (ValueError, TypeError):
                        pass
        elif type_name == 'Pass':
            stats[mid]['total_passes'] += 1
    return stats


def compute_team_stats(events_df):
    if events_df is None or events_df.empty:
        return {}
    stats = {}
    print("   Processing team stats...")

    for i, (_, row) in enumerate(events_df.iterrows()):
        if i % 50000 == 0 and i > 0:
            print(f"   ...{i} events processed")

        t = row.get('team')
        team_id = None
        team_name = None
        if isinstance(t, dict):
            team_id = t.get('id')
            team_name = t.get('name')
        else:
            team_id = row.get('team_id')

        if not team_id:
            continue
        try:
            team_id = int(team_id)
        except (ValueError, TypeError):
            continue

        if team_id not in stats:
            stats[team_id] = {
                'team_id': team_id, 'team_name': team_name or f"Team {team_id}",
                'goals': 0, 'shots': 0, 'passes': 0, 'xG': 0.0, 'xA': 0.0,
                'tackles': 0, 'interceptions': 0, 'clearances': 0,
            }
        if stats[team_id]['team_name'].startswith('Team ') and team_name:
            stats[team_id]['team_name'] = team_name

        typ = row.get('type')
        type_name = typ.get('name') if isinstance(typ, dict) else None

        if type_name == 'Shot':
            stats[team_id]['shots'] += 1
            shot = row.get('shot')
            if isinstance(shot, dict):
                outcome = shot.get('outcome')
                if isinstance(outcome, dict) and outcome.get('name') == 'Goal':
                    stats[team_id]['goals'] += 1
                xg_val = shot.get('statsbomb_xg')
                if xg_val is not None:
                    try:
                        f = float(xg_val)
                        if not pd.isna(f):
                            stats[team_id]['xG'] += f
                    except (ValueError, TypeError):
                        pass
        elif type_name == 'Pass':
            stats[team_id]['passes'] += 1
            xa_val = row.get('pass_xg')
            if xa_val is not None:
                try:
                    f = float(xa_val)
                    if not pd.isna(f):
                        stats[team_id]['xA'] += f
                except (ValueError, TypeError):
                    pass
        elif type_name == 'Tackle':
            stats[team_id]['tackles'] += 1
        elif type_name == 'Interception':
            stats[team_id]['interceptions'] += 1
        elif type_name == 'Clearance':
            stats[team_id]['clearances'] += 1

    for k in stats:
        stats[k]['xG'] = round(stats[k]['xG'], 2)
        stats[k]['xA'] = round(stats[k]['xA'], 2)

    return stats


# ===================================================================
# STARTUP
# ===================================================================

@app.on_event("startup")
def startup_load():
    global EVENTS_DF, MATCHES_DF, PLAYER_STATS_CACHE, MATCH_STATS_CACHE, TEAM_STATS_CACHE

    print("=" * 50)
    print("LOADING DATA...")
    print("=" * 50)

    if not (DATA_DIR / "all_events.json").exists():
        print("No cache found. Access /load endpoint.")
        return

    EVENTS_DF, MATCHES_DF = load_or_fetch_all()

    if EVENTS_DF is None or EVENTS_DF.empty:
        print("Failed to load data.")
        return

    if 'id' in EVENTS_DF.columns:
        EVENTS_DF.set_index('id', drop=False, inplace=True)

    print(f"{len(EVENTS_DF)} events loaded.")

    print("Pre-computing player stats...")
    start = time.time()
    try:
        PLAYER_STATS_CACHE = compute_player_stats(EVENTS_DF)
        print(f"Player stats cached: {len(PLAYER_STATS_CACHE)} players ({time.time() - start:.2f}s)")
    except Exception:
        traceback.print_exc()
        PLAYER_STATS_CACHE = {}

    print("Pre-computing match stats...")
    start = time.time()
    try:
        MATCH_STATS_CACHE = compute_match_stats(EVENTS_DF)
        print(f"Match stats cached: {len(MATCH_STATS_CACHE)} matches ({time.time() - start:.2f}s)")
    except Exception:
        traceback.print_exc()
        MATCH_STATS_CACHE = {}

    print("Pre-computing team stats...")
    start = time.time()
    try:
        TEAM_STATS_CACHE = compute_team_stats(EVENTS_DF)
        print(f"Team stats cached: {len(TEAM_STATS_CACHE)} teams ({time.time() - start:.2f}s)")
    except Exception:
        traceback.print_exc()
        TEAM_STATS_CACHE = {}


# ===================================================================
# ENDPOINTS - CORE
# ===================================================================
