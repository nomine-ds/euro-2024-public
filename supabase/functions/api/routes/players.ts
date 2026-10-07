// supabase/functions/api/routes/players.ts
import { getRows, json, numeric } from "../lib/core.ts";
import type { SupabaseClient } from "../lib/core.ts";
import type { EventRow } from "../lib/types.ts";

export async function playerRoutes(
  client: SupabaseClient,
  path: string,
  url: URL,
): Promise<Response | null> {
  if (path === "/players") {
    const matchId = numeric(url.searchParams.get("match_id"));
    const teamId = numeric(url.searchParams.get("team_id"));
    const source = matchId === null ? "player_directory" : "events";
    let query = client
      .from(source)
      .select("player_id,player_name,team_id")
      .order("player_name");
    if (matchId !== null) query = query.eq("match_id", matchId);
    if (teamId !== null) query = query.eq("team_id", teamId);
    if (matchId === null) query = query.limit(2000);
    const events = await getRows<
      Pick<EventRow, "player_id" | "player_name" | "team_id">
    >(query);
    const uniquePlayers = new Map<number, (typeof events)[number]>();
    for (const event of events) {
      if (event.player_id !== null && !uniquePlayers.has(event.player_id)) {
        uniquePlayers.set(event.player_id, event);
      }
    }
    return json(
      [...uniquePlayers.values()].map((p) => ({
        player_id: p.player_id,
        player_name: p.player_name || "Unknown",
        team_id: p.team_id,
      })),
    );
  }

  const playerSummary = path.match(/^\/player\/(\d+)\/summary$/);
  if (playerSummary) {
    const playerId = Number(playerSummary[1]);
    const events = await getRows<EventRow>(
      client
        .from("events")
        .select(
          "event_id,match_id,event_index,event_type,timestamp,period,player_id,player_name,team_id,team_name,location,pass_end_location,recipient_id,recipient_name,shot_outcome,shot_xg,pass_xg,goal_assist,card_type",
        )
        .eq("player_id", playerId),
    );
    if (!events.length) return json({ message: `Player ${playerId} not found.` }, 404);
    const shots = events.filter((e) => e.event_type === "Shot");
    const passes = events.filter((e) => e.event_type === "Pass");
    return json({
      player_id: playerId,
      player_name: events[0].player_name || "Unknown",
      team_name: events[0].team_name,
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
    });
  }

  // GET /player/:id/breakdown
  const playerBreakdown = path.match(/^\/player\/(\d+)\/breakdown$/);
  if (playerBreakdown) {
    const playerId = Number(playerBreakdown[1]);

    const events = await getRows<EventRow>(
      client
        .from("events")
        .select(
          "event_id,match_id,event_type,player_id,shot_outcome,shot_xg,pass_xg,goal_assist",
        )
        .eq("player_id", playerId),
    );
    if (!events.length) return json({ message: `Player ${playerId} not found.` }, 404);

    // Agregasi per match
    const byMatch = new Map<
      number,
      {
        match_id: number;
        goals: number;
        assists: number;
        shots: number;
        passes: number;
        xg: number;
        xa: number;
      }
    >();
    for (const e of events) {
      const entry = byMatch.get(e.match_id) ?? {
        match_id: e.match_id,
        goals: 0,
        assists: 0,
        shots: 0,
        passes: 0,
        xg: 0,
        xa: 0,
      };
      if (e.event_type === "Shot") {
        entry.shots += 1;
        entry.xg += Number(e.shot_xg) || 0;
        if (e.shot_outcome === "Goal") entry.goals += 1;
      } else if (e.event_type === "Pass") {
        entry.passes += 1;
        entry.xa += Number(e.pass_xg) || 0;
        if (e.goal_assist) entry.assists += 1;
      }
      byMatch.set(e.match_id, entry);
    }

    // Fetch match info
    const matchIds = [...byMatch.keys()];
    const { data: matches, error } = await client
      .from("matches")
      .select("match_id,home_team,away_team,home_score,away_score")
      .in("match_id", matchIds);
    if (error) throw new Error(error.message);

    const matchLookup = new Map(
      (matches ?? []).map((m) => [m.match_id, m]),
    );

    const result = [...byMatch.values()]
      .map((s) => {
        const m = matchLookup.get(s.match_id);
        return {
          ...s,
          home_team: m?.home_team ?? "Unknown",
          away_team: m?.away_team ?? "Unknown",
          home_score: Number(m?.home_score) || 0,
          away_score: Number(m?.away_score) || 0,
          xg: Number(s.xg.toFixed(2)),
          xa: Number(s.xa.toFixed(2)),
        };
      })
      .sort((a, b) => b.match_id - a.match_id);

    return json({
      player_id: playerId,
      total_matches: result.length,
      matches: result,
    });
  }

  return null;
}