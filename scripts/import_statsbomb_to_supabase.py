import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Iterable


BATCH_SIZE = 500


def nested(value: Any, *keys: str) -> Any:
    for key in keys:
        if not isinstance(value, dict):
            return None
        value = value.get(key)
    return value


def number(value: Any) -> int | float | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return value
    return None


def event_row(
    event: dict[str, Any], match_id: int, frame_event_ids: set[str]
) -> dict[str, Any]:
    event_id = event.get("id")
    if not isinstance(event_id, str):
        raise ValueError(f"Event in match {match_id} has no UUID id.")

    event_type = nested(event, "type", "name") or event.get("type")
    if isinstance(event_type, dict):
        event_type = event_type.get("name")

    shot_outcome = nested(event, "shot", "outcome")
    if isinstance(shot_outcome, dict):
        shot_outcome = shot_outcome.get("name")
    shot_xg = number(nested(event, "shot", "statsbomb_xg"))
    if shot_xg is None:
        shot_xg = number(event.get("shot_statsbomb_xg"))

    recipient = nested(event, "pass", "recipient")
    return {
        "event_id": event_id,
        "match_id": match_id,
        "event_index": int(event.get("index") or 0),
        "event_type": event_type if isinstance(event_type, str) else None,
        "timestamp": event.get("timestamp"),
        "period": number(event.get("period")),
        "player_id": number(nested(event, "player", "id")) or number(event.get("player_id")),
        "player_name": nested(event, "player", "name") or event.get("player_name"),
        "team_id": number(nested(event, "team", "id")) or number(event.get("team_id")),
        "team_name": nested(event, "team", "name") or event.get("team_name"),
        "location": event.get("location"),
        "pass_end_location": nested(event, "pass", "end_location")
        or event.get("pass_end_location"),
        "recipient_id": number(nested(recipient, "id"))
        or number(event.get("pass_recipient_id")),
        "recipient_name": nested(recipient, "name") or event.get("pass_recipient_name"),
        "shot_outcome": shot_outcome
        or nested(event, "shot_outcome", "name")
        or event.get("shot_outcome"),
        "shot_xg": shot_xg,
        "pass_xg": number(nested(event, "pass", "pass_xg")) or number(event.get("pass_xg")),
        "goal_assist": event.get("goal_assist") is True,
        "card_type": nested(event, "foul_committed", "card", "name")
        or nested(event, "bad_behaviour", "card", "name"),
        "has_360": event_id in frame_event_ids,
    }


def match_row(match: dict[str, Any], has_360: bool) -> dict[str, Any]:
    match_id = match.get("match_id")
    if not isinstance(match_id, int):
        raise ValueError(f"Match record has invalid match_id: {match_id!r}")
    home = match.get("home_team") or {}
    away = match.get("away_team") or {}
    return {
        "match_id": match_id,
        "match_date": match.get("match_date"),
        "home_team": home.get("home_team_name", "Unknown"),
        "away_team": away.get("away_team_name", "Unknown"),
        "home_team_id": home.get("home_team_id"),
        "away_team_id": away.get("away_team_id"),
        "home_score": int(match.get("home_score") or 0),
        "away_score": int(match.get("away_score") or 0),
        "has_360": has_360,
    }


def batches(rows: Iterable[dict[str, Any]]) -> Iterable[list[dict[str, Any]]]:
    batch: list[dict[str, Any]] = []
    for row in rows:
        batch.append(row)
        if len(batch) == BATCH_SIZE:
            yield batch
            batch = []
    if batch:
        yield batch


def read_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as file:
        return json.load(file)


class SupabaseImporter:
    def __init__(self, project_url: str, service_role_key: str, dry_run: bool) -> None:
        self.project_url = project_url.rstrip("/")
        self.service_role_key = service_role_key
        self.dry_run = dry_run
        self.payload_bytes: dict[str, int] = {}

    def upsert(self, table: str, rows: list[dict[str, Any]], conflict: str) -> None:
        if not rows:
            return
        payload = json.dumps(rows, allow_nan=False).encode("utf-8")
        self.payload_bytes[table] = self.payload_bytes.get(table, 0) + len(payload)
        if self.dry_run:
            return
        endpoint = (
            f"{self.project_url}/rest/v1/{table}"
            f"?on_conflict={urllib.parse.quote(conflict)}"
        )
        request = urllib.request.Request(
            endpoint,
            data=payload,
            headers={
                "apikey": self.service_role_key,
                "Authorization": f"Bearer {self.service_role_key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                if response.status >= 300:
                    raise RuntimeError(f"Supabase returned HTTP {response.status} for {table}.")
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(
                f"Supabase rejected the {table} import (HTTP {error.code}): {detail}"
            ) from error


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Import local StatsBomb Open Data into Supabase."
    )
    parser.add_argument("--data-dir", type=Path, default=Path("data/raw"))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    project_url = os.environ.get("SUPABASE_URL", "").strip()
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not args.dry_run and (not project_url or not service_role_key):
        parser.error(
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment. "
            "Never put the service role key in frontend or committed files."
        )
    if project_url and not re.fullmatch(r"https://[a-z0-9-]+\.supabase\.co", project_url):
        parser.error("SUPABASE_URL must be the HTTPS origin of a Supabase project.")

    data_dir = args.data_dir
    matches_path = data_dir / "matches.json"
    match_files = sorted(data_dir.glob("match_*.json"))
    if not matches_path.is_file() or not match_files:
        parser.error(f"Expected matches.json and match_<id>.json files under {data_dir}.")

    frame_dir = data_dir / "three-sixty"
    frame_files = {
        int(path.stem): path
        for path in frame_dir.glob("*.json")
        if path.stem.isdecimal()
    } if frame_dir.is_dir() else {}

    importer = SupabaseImporter(project_url, service_role_key, args.dry_run)
    matches = read_json(matches_path)
    match_rows = [
        match_row(match, int(match["match_id"]) in frame_files)
        for match in matches
    ]
    match_count = 0
    for batch in batches(match_rows):
        importer.upsert("matches", batch, "match_id")
        match_count += len(batch)

    event_count = 0
    frame_count = 0
    for match_path in match_files:
        match_id = int(match_path.stem.removeprefix("match_"))
        events = read_json(match_path)
        frame_path = frame_files.get(match_id)
        frames = read_json(frame_path) if frame_path is not None else []
        frame_event_ids = {
            frame["event_uuid"]
            for frame in frames
            if isinstance(frame.get("event_uuid"), str)
        }
        event_ids = {
            event.get("id")
            for event in events
            if isinstance(event.get("id"), str)
        }
        missing_event_ids = frame_event_ids - event_ids
        if missing_event_ids:
            raise ValueError(
                f"Match {match_id} has 360 records without matching events "
                f"(first missing id: {next(iter(missing_event_ids))})."
            )
        for batch in batches(
            event_row(event, match_id, frame_event_ids) for event in events
        ):
            importer.upsert("events", batch, "event_id")
            event_count += len(batch)

        if frame_path is None:
            continue
        rows = (
            {
                "event_id": frame["event_uuid"],
                "match_id": match_id,
                "timestamp": frame.get("timestamp"),
                "period": frame.get("period"),
                "ball_location": frame.get("location"),
                "players": frame.get("freeze_frame") or [],
            }
            for frame in frames
            if isinstance(frame.get("event_uuid"), str)
        )
        for batch in batches(rows):
            importer.upsert("freeze_frames", batch, "event_id")
            frame_count += len(batch)
        print(
            f"Imported match {match_id}: {len(events)} events, "
            f"{len(frames)} freeze frames.",
            flush=True,
        )

    mode = "Would import" if args.dry_run else "Imported"
    print(f"{mode} {match_count} matches, {event_count} events, {frame_count} freeze frames.")
    print(
        "Serialized row payloads: "
        + ", ".join(
            f"{table}={size / (1024 * 1024):.1f} MiB"
            for table, size in sorted(importer.payload_bytes.items())
        )
    )
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, RuntimeError, urllib.error.URLError) as error:
        print(f"Import failed: {error}", file=sys.stderr)
        sys.exit(1)
