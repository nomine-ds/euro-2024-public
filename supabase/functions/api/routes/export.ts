// supabase/functions/api/routes/export.ts
import { getRows, json, numeric } from "../lib/core.ts";
import type { SupabaseClient } from "../lib/core.ts";
import type { EventRow, MatchRow } from "../lib/types.ts";

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];
  return lines.join("\n");
}

function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}

export async function exportRoutes(
  client: SupabaseClient,
  path: string,
  url: URL,
): Promise<Response | null> {
  if (path !== "/export/csv") return null;

  const exportType = url.searchParams.get("export_type");
  const matchId = numeric(url.searchParams.get("match_id"));
  const playerId = numeric(url.searchParams.get("player_id"));
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 1000), 1),
    10_000,
  );

  if (!exportType) {
    return json({ message: "export_type is required." }, 400);
  }

  let rows: Array<Record<string, unknown>> = [];
  let filename = "export.csv";

  if (exportType === "matches") {
    const { data, error } = await client
      .from("matches")
      .select("*")
      .limit(limit);
    if (error) throw new Error(error.message);
    rows = (data as MatchRow[]) ?? [];
    filename = "matches.csv";
  } else if (exportType === "players") {
    const events = await getRows<Pick<EventRow, "player_id" | "player_name" | "team_id">>(
      client.from("events").select("player_id,player_name,team_id"),
    );
    const seen = new Set<number>();
    const players: Array<{ player_id: number; player_name: string }> = [];
    for (const e of events) {
      if (e.player_id !== null && !seen.has(e.player_id)) {
        seen.add(e.player_id);
        players.push({
          player_id: e.player_id,
          player_name: e.player_name ?? "Unknown",
        });
        if (players.length >= limit) break;
      }
    }
    rows = players;
    filename = "players.csv";
  } else if (exportType === "match_events") {
    if (matchId === null) {
      return json({ message: "match_id required for match_events." }, 400);
    }
 const { data: eventsData, error: eventsError } = await client
  .from("events")
  .select("event_id,match_id,timestamp,period,event_type,player_name,team_name,location")
  .eq("match_id", matchId)
  .order("event_index")
  .limit(limit);
if (eventsError) throw new Error(eventsError.message);
const events = (eventsData ?? []) as EventRow[];
    rows = events.map((e) => {
      const loc = Array.isArray(e.location) ? e.location : [0, 0];
      return {
        id: e.event_id,
        timestamp: e.timestamp,
        period: e.period,
        type: e.event_type,
        player_name: e.player_name,
        team_name: e.team_name,
        x: loc[0] ?? 0,
        y: loc[1] ?? 0,
      };
    });
    filename = `match_${matchId}_events.csv`;
  } else if (exportType === "player_summary") {
    if (playerId === null) {
      return json({ message: "player_id required for player_summary." }, 400);
    }
    const events = await getRows<EventRow>(
      client
        .from("events")
        .select("event_type,shot_outcome,shot_xg,pass_xg,goal_assist,player_name,team_name")
        .eq("player_id", playerId),
    );
    if (!events.length) {
      return json({ message: `Player ${playerId} not found.` }, 404);
    }
    const shots = events.filter((e) => e.event_type === "Shot");
    const passes = events.filter((e) => e.event_type === "Pass");
    rows = [
      {
        player_id: playerId,
        player_name: events[0].player_name ?? "Unknown",
        team_name: events[0].team_name ?? "",
        goals: shots.filter((e) => e.shot_outcome === "Goal").length,
        assists: passes.filter((e) => e.goal_assist).length,
        shots: shots.length,
        passes: passes.length,
        xG: Number(
          shots.reduce((s, e) => s + (Number(e.shot_xg) || 0), 0).toFixed(2),
        ),
        xA: Number(
          passes.reduce((s, e) => s + (Number(e.pass_xg) || 0), 0).toFixed(2),
        ),
      },
    ];
    filename = `player_${playerId}_summary.csv`;
  } else {
    return json({ message: "Invalid export_type." }, 400);
  }

  if (!rows.length) {
    return json({ message: "No data found." }, 404);
  }

  return csvResponse(toCsv(rows), filename);
}