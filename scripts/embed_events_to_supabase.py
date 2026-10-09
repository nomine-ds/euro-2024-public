# scripts/embed_events_to_supabase.py
"""
Embed Euro 2024 events using Gemini API -> store to Supabase pgvector.

Usage:
    $env:SUPABASE_URL = "https://tzbklculanmoiikvukci.supabase.co"
    $env:SUPABASE_SERVICE_ROLE_KEY = "<from .env>"
    $env:GEMINI_API_KEY = "<from .env>"

    python scripts/embed_events_to_supabase.py --mode key --stage Final
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
PAGE_SIZE = 1000
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


def fix_encoding(text):
    """Perbaiki mojibake: 'AurÃ©lien' -> 'Aurélien'.

    Terjadi kalau UTF-8 bytes dibaca sebagai Latin-1.
    """
    if not isinstance(text, str):
        return text
    try:
        # Coba decode ulang: latin-1 -> bytes -> utf-8
        return text.encode("latin-1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError, AttributeError):
        return text


def build_supabase_headers(key, extra=None):
    """
    Supabase punya 2 format API key:
    - Format baru: 'sb_secret_...' / 'sb_publishable_...' -> HANYA kirim di header 'apikey'
    - Format lama (JWT): 'eyJ...' -> Kirim di 'apikey' + 'Authorization: Bearer'
    """
    headers = {"apikey": key}

    is_new_format = key.startswith("sb_secret_") or key.startswith("sb_publishable_")

    if not is_new_format:
        headers["Authorization"] = f"Bearer {key}"

    if extra:
        headers.update(extra)

    return headers


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


def http_get_paginated(base_url, base_query, headers, page_size=PAGE_SIZE):
    """
    Ambil semua row dari Supabase REST API dengan pagination offset/limit.
    Supabase default cap = 1000 rows per request, jadi kita loop pakai offset.
    """
    all_rows = []
    offset = 0

    while True:
        sep = "&" if "?" in base_query else "?"
        url = f"{base_url}{base_query}{sep}offset={offset}&limit={page_size}"
        page = http_get(url, headers)

        if not page:
            break

        all_rows.extend(page)

        if len(page) < page_size:
            break

        offset += page_size

        if offset > 100000:
            print(f"  WARNING: pagination hit safety limit at {offset} rows")
            break

    return all_rows


def fetch_matches(base_url, key):
    headers = build_supabase_headers(key)
    base_query = (
        "/rest/v1/matches"
        "?select=match_id,match_date,home_team,away_team,home_score,away_score"
    )
    return http_get_paginated(base_url, base_query, headers)


def fetch_events_for_match(base_url, key, match_id):
    headers = build_supabase_headers(key)
    base_query = (
        f"/rest/v1/events"
        f"?match_id=eq.{match_id}"
        "&select=event_id,match_id,event_index,event_type,timestamp,"
        "period,player_name,team_name,location,shot_outcome,shot_xg,"
        "goal_assist,card_type"
        "&order=event_index"
    )
    return http_get_paginated(base_url, base_query, headers)


def fetch_existing_event_ids(base_url, key, match_id):
    """Ambil set event_id yang sudah ada di event_embeddings untuk match ini."""
    headers = build_supabase_headers(key)
    base_query = (
        f"/rest/v1/event_embeddings"
        f"?match_id=eq.{match_id}&select=event_id"
    )
    try:
        rows = http_get_paginated(base_url, base_query, headers)
        return {r["event_id"] for r in rows}
    except Exception as e:
        print(f"  Warning: could not fetch existing IDs: {e}")
        return set()


def parse_minute_second(timestamp, period=None):
    """Parse 'HH:MM:SS.mmm' -> (match_minute, second).

    StatsBomb reset timestamp tiap babak. Kita offset per period:
    - period 1: apa adanya
    - period 2: +46 (45 menit + ~1 menit injury time babak 1)
    - period 3 (ET1): +90
    - period 4 (ET2): +105
    """
    if not timestamp or ":" not in timestamp:
        return (0, 0)

    parts = timestamp.split(":")
    try:
        if len(parts) >= 3:
            # Format: HH:MM:SS.mmm
            m = int(float(parts[1]))
            s = int(float(parts[2].split(".")[0]))
        elif len(parts) == 2:
            # Format: MM:SS.mmm
            m = int(float(parts[0]))
            s = int(float(parts[1].split(".")[0]))
        else:
            m = int(float(parts[0]))
            s = 0
    except (ValueError, IndexError):
        m, s = 0, 0

    # Offset berdasarkan babak
    if period == 2:
        m += 46
    elif period == 3:
        m += 90
    elif period == 4:
        m += 105

    return (m, s)


def build_text(event, match_info):
    event_type = event.get("event_type") or "Unknown"
    player = fix_encoding(event.get("player_name") or "Unknown Player")
    team = fix_encoding(event.get("team_name") or "Unknown Team")
    minute, second = parse_minute_second(
        event.get("timestamp"), event.get("period")
    )

    home = fix_encoding(match_info.get("home_team", "?"))
    away = fix_encoding(match_info.get("away_team", "?"))
    stage = match_info.get("stage", "?")
    hs = match_info.get("home_score", 0)
    as_ = match_info.get("away_score", 0)
    score = f"{hs}-{as_}"

    text = (
        f"[{stage}] {home} vs {away} ({score}) - "
        f"Menit {minute}:{second:02d} - {player} ({team}) {event_type}"
    )

    if event_type in ("Shot", "Own Goal For", "Own Goal Against"):
        outcome = fix_encoding(event.get("shot_outcome") or "Unknown")
        xg = event.get("shot_xg")
        xg_str = f"{float(xg):.2f}" if xg is not None else "0.00"
        text += f" | Hasil: {outcome}, xG: {xg_str}"
    elif event_type == "Substitution":
        text += " | Pergantian pemain"
    elif event_type == "Dribble":
        text += " | Dribble"
    elif event_type == "Foul Committed":
        card = fix_encoding(event.get("card_type"))
        if card:
            text += f" | Kartu: {card}"

    return text


def build_metadata(event, match_info):
    minute, _ = parse_minute_second(
        event.get("timestamp"), event.get("period")
    )
    return {
        "event_id": event.get("event_id"),
        "match_id": int(event.get("match_id") or 0),
        "event_type": event.get("event_type") or "Unknown",
        "player": fix_encoding(event.get("player_name") or "Unknown"),
        "team": fix_encoding(event.get("team_name") or "Unknown"),
        "minute": minute,
        "stage": match_info.get("stage", "Unknown"),
        "home_team": fix_encoding(match_info.get("home_team", "Unknown")),
        "away_team": fix_encoding(match_info.get("away_team", "Unknown")),
        "score": f"{match_info.get('home_score', 0)}-{match_info.get('away_score', 0)}",
    }


def embed_batch(gemini_key, texts, max_retries=5):
    """Embed up to 50 texts via Gemini batchEmbedContents."""
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
    headers = build_supabase_headers(
        key,
        {
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    http_post(url, headers, rows)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["key", "all"], default="key")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--stage", type=str, default="")
    parser.add_argument("--skip-existing", action="store_true")
    parser.add_argument("--reverse", action="store_true")
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

    key_type = "NEW (sb_secret_)" if supabase_key.startswith("sb_secret_") else "LEGACY (JWT)"
    print(f"Supabase key format: {key_type}")
    print(f"Mode: {args.mode}")
    print(f"Stage filter: {args.stage or '(all stages)'}")
    print(f"Skip existing: {args.skip_existing}")
    print(f"Reverse order: {args.reverse}")
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

    if args.stage:
        match_ids = [
            mid for mid, m in match_lookup.items()
            if m["stage"] == args.stage
        ]
        print(f"  Filtered to stage '{args.stage}': {len(match_ids)} matches")
    else:
        match_ids = list(match_lookup.keys())

    match_ids = sorted(match_ids, reverse=args.reverse)

    total_processed = 0
    total_embedded = 0
    total_skipped = 0

    for match_id in match_ids:
        match_info = match_lookup[match_id]
        print(
            f"\nMatch {match_id} ({match_info['home_team']} "
            f"vs {match_info['away_team']}) [{match_info['stage']}]..."
        )

        all_events = fetch_events_for_match(supabase_url, supabase_key, match_id)
        print(f"  Total events fetched (paginated): {len(all_events)}")

        events = all_events
        if args.mode == "key":
            events = [e for e in events if e.get("event_type") in KEY_EVENT_TYPES]

        print(f"  Events after type filter: {len(events)}")

        if args.skip_existing and events:
            existing = fetch_existing_event_ids(supabase_url, supabase_key, match_id)
            before = len(events)
            events = [e for e in events if e.get("event_id") not in existing]
            skipped = before - len(events)
            total_skipped += skipped
            print(f"  Skipped {skipped} existing, {len(events)} remaining")

        if not events:
            print("  Nothing to embed, skipping.")
            continue

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
                print(f"  Embedded this run: {total_embedded}", end="\r")
            except Exception as e:
                print(f"\n  ERROR upsert: {e}")

            time.sleep(3.0)

    print("\n\nDONE.")
    print(f"  Total events processed: {total_processed}")
    print(f"  Total embedded: {total_embedded}")
    print(f"  Total skipped (already exist): {total_skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(main())