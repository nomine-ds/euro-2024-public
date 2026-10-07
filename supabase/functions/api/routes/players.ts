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
      [...uniquePlayers.values()].map((player) => ({
        player_id: player.player_id,
        player_name: player.player_name || "Unknown",
        team_id: player.team_id,
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
  return null;
}