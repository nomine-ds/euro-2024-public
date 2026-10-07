// supabase/functions/api/routes/analytics.ts
import { getRows, json, numeric } from "../lib/core.ts";
import type { SupabaseClient } from "../lib/core.ts";
import type { EventRow } from "../lib/types.ts";

export async function analyticsRoutes(
  client: SupabaseClient,
  path: string,
  url: URL,
): Promise<Response | null> {
  if (path === "/teams") {
    const { data, error } = await client
      .from("matches")
      .select("home_team_id,home_team,away_team_id,away_team");
    if (error) throw new Error(error.message);
    const teams = new Map<number, string>();
    for (const m of data ?? []) {
      if (m.home_team_id) teams.set(m.home_team_id, m.home_team);
      if (m.away_team_id) teams.set(m.away_team_id, m.away_team);
    }
    return json(
      [...teams].map(([team_id, team_name]) => ({ team_id, team_name })).sort((a, b) =>
        a.team_name.localeCompare(b.team_name),
      ),
    );
  }

  if (path === "/compare/teams") {
    const idsParam = url.searchParams.get("team_ids") ?? "";
    const teamIds = idsParam
      .split(",")
      .map((s) => numeric(s))
      .filter((n): n is number => n !== null);
    if (teamIds.length !== 2) {
      return json({ message: "team_ids must contain exactly 2 ids." }, 400);
    }
    const stats = await Promise.all(
      teamIds.map(async (teamId) => {
        const events = await getRows<EventRow>(
          client
            .from("events")
            .select(
              "event_id,match_id,event_type,player_id,player_name,team_id,location,shot_outcome,shot_xg,pass_xg,goal_assist",
            )
            .eq("team_id", teamId),
        );
        const shots = events.filter((e) => e.event_type === "Shot");
        const passes = events.filter((e) => e.event_type === "Pass");
        return {
          team_id: teamId,
          goals: shots.filter((e) => e.shot_outcome === "Goal").length,
          shots: shots.length,
          passes: passes.length,
          xG: Number(
            shots.reduce((s, e) => s + (Number(e.shot_xg) || 0), 0).toFixed(2),
          ),
        };
      }),
    );
    return json({ team_a: stats[0], team_b: stats[1] });
  }

  if (path === "/players/bulk") {
    const matchId = numeric(url.searchParams.get("match_id"));
    let query = client
      .from("events")
      .select(
        "player_id,player_name,team_id,event_type,shot_outcome,shot_xg,pass_xg,goal_assist",
      );
    if (matchId !== null) query = query.eq("match_id", matchId);
    const events = await getRows<EventRow>(query);

    const acc = new Map<
      number,
      {
        player_id: number;
        player_name: string;
        team_id: number | null;
        goals: number;
        assists: number;
        shots: number;
        passes: number;
        xG: number;
        xA: number;
      }
    >();
    for (const e of events) {
      if (e.player_id === null) continue;
      const entry = acc.get(e.player_id) ?? {
        player_id: e.player_id,
        player_name: e.player_name ?? "Unknown",
        team_id: e.team_id,
        goals: 0,
        assists: 0,
        shots: 0,
        passes: 0,
        xG: 0,
        xA: 0,
      };
      if (e.event_type === "Shot") {
        entry.shots += 1;
        entry.xG += Number(e.shot_xg) || 0;
        if (e.shot_outcome === "Goal") entry.goals += 1;
      } else if (e.event_type === "Pass") {
        entry.passes += 1;
        entry.xA += Number(e.pass_xg) || 0;
        if (e.goal_assist) entry.assists += 1;
      }
      acc.set(e.player_id, entry);
    }
    return json(
      [...acc.values()]
        .map((p) => ({ ...p, xG: Number(p.xG.toFixed(2)), xA: Number(p.xA.toFixed(2)) }))
        .sort((a, b) => b.goals - a.goals || b.assists - a.assists),
    );
  }

  return null;
}