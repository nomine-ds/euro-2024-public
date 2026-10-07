# scripts/embed_events_to_supabase.py
"""
Embed Euro 2024 events using Gemini API -> store to Supabase pgvector.

Usage:
    $env:SUPABASE_URL = "https://<project>.supabase.co"
    $env:SUPABASE_SERVICE_ROLE_KEY = "sb_secret_hyD1W2yZklOgUbaf2LOVWA_xdFYk3OK" 
    $env:GEMINI_API_KEY = "AQ.Ab8RN6Ljg_MkL5fV52uZYpsbnlSgdezEwdu5hmFH5MFMlCpH_A"          
    python scripts/embed_events_to_supabase.py --mode key
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

GEMINI_MODEL = "gemini-embedding-001"
EMBED_DIM = 768
BATCH_SIZE = 50
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/"
    f"models/{GEMINI_MODEL}:batchEmbedContents"
)

KEY_EVENT_TYPES = {
    "Shot",
    "Own Goal For",
    "Own Goal Against",
    "Substitution",
    "Foul Committed",
    "Dribble",
}

STAGE_BY_DATE = {
    "2024-06-14": "Group Stage",
    "2024-06-15": "Group Stage",
    "2024-06-16": "Group Stage",
    "2024-06-17": "Group Stage",
    "2024-06-18": "Group Stage",
    "2024-06-19": "Group Stage",
    "2024-06-20": "Group Stage",
    "2024-06-21": "Group Stage",
    "2024-06-22": "Group Stage",
    "2024-06-23": "Group Stage",
    "2024-06-24": "Group Stage",
    "2024-06-25": "Group Stage",
    "2024-06-26": "Group Stage",
    "2024-06-29": "Round of 16",
    "2024-06-30": "Round of 16",
    "2024-07-01": "Round of 16",
    "2024-07-02": "Round of 16",
    "2024-07-05": "Quarter-finals",
    "2024-07-06": "Quarter-finals",
    "2024-07-09": "Semi-finals",
    "2024-07-10": "Semi-finals",
    "2024-07-14": "Final",
}


def http_get(url, headers):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def http_post(url, headers, body):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            content = resp.read()
            if not content:
                return {}
            return json.loads(content)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code}: {detail}") from e


def fetch_matches(base_url, key):
    url = (
        f"{base_url}/rest/v1/matches"
        "?select=match_id,match_date,home_team,away_team,home_score,away_score"
    )
    return http_get(url, {"apikey": key, "Authorization": f"Bearer {key}"})


def fetch_events_for_match(base_url, key, match_id):
    url = (
        f"{base_url}/rest/v1/events"
        f"?match_id=eq.{match_id}"
        "&select=event_id,match_id,event_index,event_type,timestamp,"
        "period,player_name,team_name,location,shot_outcome,shot_xg,"
        "goal_assist,card_type"
        "&order=event_index"
    )
    return http_get(url, {"apikey": key, "Authorization": f"Bearer {key}"})


def parse_minute_second(timestamp):
    """Parse '00:33:07.702' -> (33, 7)."""
    if not timestamp or ":" not in timestamp:
        return (0, 0)
    parts = timestamp.split(":")
    try:
        m = int(float(parts[0]))
        s = int(float(parts[1])) if len(parts) > 1 else 0
        return (m, s)
    except (ValueError, IndexError):
        return (0, 0)


def build_text(event, match_info):
    event_type = event.get("event_type") or "Unknown"
    player = event.get("player_name") or "Unknown Player"
    team = event.get("team_name") or "Unknown Team"
    minute, second = parse_minute_second(event.get("timestamp"))

    home = match_info.get("home_team", "?")
    away = match_info.get("away_team", "?")
    stage = match_info.get("stage", "?")
    hs = match_info.get("home_score", 0)
    as_ = match_info.get("away_score", 0)
    score = f"{hs}-{as_}"

    text = (
        f"[{stage}] {home} vs {away} ({score}) - "
        f"Menit {minute}:{second:02d} - {player} ({team}) {event_type}"
    )

    if event_type in ("Shot", "Own Goal For", "Own Goal Against"):
        outcome = event.get("shot_outcome") or "Unknown"
        xg = event.get("shot_xg")
        xg_str = f"{float(xg):.2f}" if xg is not None else "0.00"
        text += f" | Hasil: {outcome}, xG: {xg_str}"
    elif event_type == "Substitution":
        text += " | Pergantian pemain"
    elif event_type == "Dribble":
        text += " | Dribble"
    elif event_type == "Foul Committed":
        card = event.get("card_type")
        if card:
            text += f" | Kartu: {card}"

    return text


def build_metadata(event, match_info):
    minute, _ = parse_minute_second(event.get("timestamp"))
    return {
        "event_id": event.get("event_id"),
        "match_id": int(event.get("match_id") or 0),
        "event_type": event.get("event_type") or "Unknown",
        "player": event.get("player_name") or "Unknown",
        "team": event.get("team_name") or "Unknown",
        "minute": minute,
        "stage": match_info.get("stage", "Unknown"),
        "home_team": match_info.get("home_team", "Unknown"),
        "away_team": match_info.get("away_team", "Unknown"),
        "score": f"{match_info.get('home_score', 0)}-{match_info.get('away_score', 0)}",
    }


def embed_batch(gemini_key, texts, max_retries=5):
    """Embed up to 50 texts via Gemini batchEmbedContents.
    
    Retries on 429 with exponential backoff (up to max_retries).
    """
    requests = [
        {
            "model": f"models/{GEMINI_MODEL}",
            "content": {"parts": [{"text": t}]},
            "taskType": "RETRIEVAL_DOCUMENT",
            "outputDimensionality": EMBED_DIM,
        }
        for t in texts
    ]
    body = {"requests": requests}
    headers = {"Content-Type": "application/json", "x-goog-api-key": gemini_key}

    wait = 30
    for attempt in range(max_retries):
        try:
            result = http_post(GEMINI_URL, headers, body)
            embeddings = result.get("embeddings", [])
            return [e["values"] for e in embeddings]
        except RuntimeError as e:
            msg = str(e)
            if "429" in msg and attempt < max_retries - 1:
                print(f"  Rate limited. Waiting {wait}s before retry {attempt + 1}/{max_retries}...")
                time.sleep(wait)
                wait = min(wait * 2, 120)
                continue
            raise
    raise RuntimeError("Max retries exceeded for embedding batch")


def upsert_embeddings(base_url, key, rows):
    url = f"{base_url}/rest/v1/event_embeddings?on_conflict=event_id"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    http_post(url, headers, rows)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["key", "all"], default="key")
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max events to process (0 = no limit)",
    )
    args = parser.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    gemini_key = os.environ.get("GEMINI_API_KEY", "")

    if not supabase_url or not supabase_key or not gemini_key:
        print(
            "ERROR: Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY",
            file=sys.stderr,
        )
        return 1

    print(f"Mode: {args.mode}")
    print("Fetching matches...")
    matches = fetch_matches(supabase_url, supabase_key)
    match_lookup = {}
    for m in matches:
        mid = m["match_id"]
        match_lookup[mid] = {
            "home_team": m.get("home_team", "?"),
            "away_team": m.get("away_team", "?"),
            "home_score": m.get("home_score", 0),
            "away_score": m.get("away_score", 0),
            "stage": STAGE_BY_DATE.get(m.get("match_date", ""), "Unknown"),
        }

    print(f"  Loaded {len(match_lookup)} matches")

    total_processed = 0
    total_embedded = 0

    for match_id in sorted(match_lookup.keys()):
        match_info = match_lookup[match_id]
        print(
            f"\nMatch {match_id} ({match_info['home_team']} "
            f"vs {match_info['away_team']})..."
        )
        events = fetch_events_for_match(supabase_url, supabase_key, match_id)

        if args.mode == "key":
            events = [e for e in events if e.get("event_type") in KEY_EVENT_TYPES]

        print(f"  Events to process: {len(events)}")

        batch_texts = []
        batch_meta = []
        for ev in events:
            text = build_text(ev, match_info)
            if not text:
                continue
            batch_texts.append(text)
            batch_meta.append(build_metadata(ev, match_info))
            total_processed += 1

        for i in range(0, len(batch_texts), BATCH_SIZE):
            chunk_texts = batch_texts[i : i + BATCH_SIZE]
            chunk_meta = batch_meta[i : i + BATCH_SIZE]
            try:
                vectors = embed_batch(gemini_key, chunk_texts)
            except Exception as e:
                print(f"  ERROR embedding batch: {e}")
                continue

            rows = [
                {
                    "event_id": chunk_meta[j]["event_id"],
                    "match_id": chunk_meta[j]["match_id"],
                    "content": chunk_texts[j],
                    "metadata": chunk_meta[j],
                    "embedding": vectors[j],
                }
                for j in range(len(chunk_texts))
            ]
            try:
                upsert_embeddings(supabase_url, supabase_key, rows)
                total_embedded += len(rows)
                print(f"  Embedded: {total_embedded}", end="\r")
            except Exception as e:
                print(f"\n  ERROR upsert: {e}")

            time.sleep(3.0)

    print("\n\nDONE.")
    print(f"  Total events processed: {total_processed}")
    print(f"  Total embedded: {total_embedded}")
    return 0


if __name__ == "__main__":
    sys.exit(main())