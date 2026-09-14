# app/routers/analytics.py
"""
Analytics endpoints — comparisons, similarity, clustering.

Endpoints:
    GET /teams                       — list all teams (cached)
    GET /compare/teams               — compare 2 teams + H2H
    GET /players/compare             — compare 2-4 players with similarity
    GET /matches/similar/{match_id}  — find statistically similar matches
    GET /players/clustering          — K-Means clustering
"""
import numpy as np
import traceback
from fastapi import APIRouter, HTTPException, Query

from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

import app.main as main

router = APIRouter(tags=["analytics"])


@router.get("/teams")
def get_teams_list():
    if not main.TEAM_STATS_CACHE:
        raise HTTPException(503, "Cache not ready. Wait for startup.")
    teams = [
        {'team_id': t['team_id'], 'team_name': t['team_name']}
        for t in main.TEAM_STATS_CACHE.values()
    ]
    teams.sort(key=lambda x: x['team_name'])
    return teams


@router.get("/compare/teams")
def compare_teams_endpoint(team_ids: str = Query(...), match_id: int = Query(None)):
    if main.EVENTS_DF is None:
        raise HTTPException(503, "Data not loaded.")
    try:
        ids = [int(x.strip()) for x in team_ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(400, "team_ids must be comma-separated integers")
    if len(ids) < 2:
        raise HTTPException(400, "Minimum 2 team IDs required")

    result = []
    for tid in ids:
        if tid in main.TEAM_STATS_CACHE:
            result.append(main.TEAM_STATS_CACHE[tid])
        else:
            stats = main.get_team_stats_from_events(main.EVENTS_DF, tid, match_id)
            if stats:
                result.append(stats)

    if len(ids) == 2 and match_id is None:
        h2h = main.get_head_to_head(main.EVENTS_DF, ids[0], ids[1])
        if h2h:
            result.append({"head_to_head": h2h})
    return result


@router.get("/players/compare")
def compare_players_endpoint(ids: str = Query(..., description="Comma-separated player IDs")):
    if not main.PLAYER_STATS_CACHE:
        raise HTTPException(503, "Cache not ready.")
    try:
        player_ids = [int(x.strip()) for x in ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(400, "ids must be comma-separated integers")
    if len(player_ids) < 2 or len(player_ids) > 4:
        raise HTTPException(400, "Compare 2-4 players")
    result = []
    for pid in player_ids:
        if pid not in main.PLAYER_STATS_CACHE:
            continue
        p = main.PLAYER_STATS_CACHE[pid]
        result.append({
            'player_id': p['player_id'],
            'player_name': p['player_name'],
            'team_name': p['team_name'],
            'goals': p['goals'],
            'assists': p['assists'],
            'shots': p['shots'],
            'passes': p['passes'],
            'xg': round(p['xg'], 2),
            'xa': round(p['xa'], 2),
            'tackles': p['tackles'],
            'interceptions': p['interceptions'],
            'clearances': p['clearances'],
            'dribbles': p['dribbles'],
        })
    if len(result) < 2:
        raise HTTPException(404, "Players not found in cache")
    feature_keys = ['goals', 'assists', 'shots', 'passes', 'xg', 'xa']
    matrix = np.array([[p[k] for k in feature_keys] for p in result], dtype=float)
    matrix_scaled = StandardScaler().fit_transform(matrix)
    similarities = []
    for i in range(len(result)):
        for j in range(i + 1, len(result)):
            dist = float(np.linalg.norm(matrix_scaled[i] - matrix_scaled[j]))
            similarities.append({
                'player_a': result[i]['player_name'],
                'player_b': result[j]['player_name'],
                'distance': round(dist, 2),
                'similarity_pct': round(max(0, 100 - dist * 20), 1),
            })
    return {'players': result, 'similarities': similarities}


@router.get("/matches/similar/{match_id}")
def get_match_similarity_endpoint(match_id: int, top_n: int = Query(5, ge=1, le=20)):
    if main.EVENTS_DF is None or main.MATCHES_DF is None:
        raise HTTPException(503, "Data not loaded.")
    try:
        result = main.get_match_similarity(main.EVENTS_DF, match_id, top_n)
    except Exception as e:
        raise HTTPException(500, f"Error: {str(e)}")
    if not result:
        raise HTTPException(404, f"Match {match_id} not found.")
    return {"match_id": match_id, "similar_matches": result}


@router.get("/players/clustering")
def get_player_clusters(n_clusters: int = Query(4, ge=2, le=10)):
    if not main.PLAYER_STATS_CACHE:
        raise HTTPException(503, "Cache not ready. Wait for startup.")

    try:
        players = [
            p for p in main.PLAYER_STATS_CACHE.values()
            if p['shots'] + p['passes'] + p['dribbles'] > 0
        ]
        if len(players) < n_clusters:
            raise HTTPException(404, "Too few players for clustering.")

        X = np.array([
            [p['goals'], p['assists'], p['shots'], p['passes'], p['xg'], p['xa']]
            for p in players
        ])
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = kmeans.fit_predict(X_scaled)

        for i, p in enumerate(players):
            p['cluster'] = int(labels[i])

        cluster_labels = {}
        for c in range(n_clusters):
            cluster_data = [p for p in players if p['cluster'] == c]
            if not cluster_data:
                cluster_labels[c] = f'Cluster {c + 1}'
                continue

            avg_goals = np.mean([p['goals'] for p in cluster_data])
            avg_assists = np.mean([p['assists'] for p in cluster_data])
            avg_shots = np.mean([p['shots'] for p in cluster_data])
            avg_passes = np.mean([p['passes'] for p in cluster_data])

            if avg_goals > 1 and avg_shots > 3:
                label = 'Finisher'
            elif avg_assists > 1 and avg_passes > 100:
                label = 'Playmaker'
            elif avg_passes > 200 and avg_shots < 5:
                label = 'Deep-Lying Playmaker'
            elif avg_shots > 5 and avg_goals < 1:
                label = 'Ball-Winning Defender'
            else:
                label = f'Cluster {c + 1}'
            cluster_labels[c] = label

        for p in players:
            p['cluster_label'] = cluster_labels.get(p['cluster'], f'Cluster {p["cluster"] + 1}')

        result = [
            {
                'player_id': p['player_id'], 'player_name': p['player_name'], 'team_name': p['team_name'],
                'goals': p['goals'], 'assists': p['assists'], 'shots': p['shots'], 'passes': p['passes'],
                'xg': round(p['xg'], 2), 'xa': round(p['xa'], 2),
                'cluster': p['cluster'], 'cluster_label': p['cluster_label'],
            }
            for p in players
        ]
        return {'n_clusters': n_clusters, 'players': result}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"Error: {str(e)}")