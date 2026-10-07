// supabase/functions/api/routes/matches.ts
import { getRows, json } from "../lib/core.ts";
import type { SupabaseClient } from "../lib/core.ts";
import type { EventRow, MatchRow } from "../lib/types.ts";

export async function matchRoutes(
  client: SupabaseClient,
  path: string,
  url: URL,
): Promise<Response | null> {
  if (path === "/matches" || path === "/matches/with360") {
    let query = client
      .from("matches")
      .select(
        "match_id,home_team,away_team,match_date,home_team_id,away_team_id,home_score,away_score,has_360",
      )
      .order("match_date", { ascending: true });
    if (path.endsWith("/with360")) query = query.eq("has_360", true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return json(
      (data as MatchRow[]).map((match) => ({
        match_id: match.match_id,
        home_team: match.home_team,
        away_team: match.away_team,
        date: match.match_date,
      })),
    );
  }

  const has360 = path.match(/^\/match\/(\d+)\/has360$/);
  if (has360) {
    const matchId = Number(has360[1]);
    const { data, error } = await client
      .from("matches")
      .select("match_id,has_360")
      .eq("match_id", matchId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data
      ? json({ match_id: matchId, has_360: data.has_360 })
      : json({ message: `Match ${matchId} not found.` }, 404);
  }

  const summary = path.match(/^\/match\/(\d+)\/summary$/);
  if (summary) {
    const matchId = Number(summary[1]);
    const [{ data: match, error: matchError }, events] = await Promise.all([
      client.from("matches").select("*").eq("match_id", matchId).maybeSingle(),
      getRows<EventRow>(
        client
          .from("events")
          .select(
            "event_id,match_id,event_index,event_type,timestamp,period,player_id,player_name,team_id,team_name,location,pass_end_location,recipient_id,recipient_name,shot_outcome,shot_xg,pass_xg,goal_assist,card_type,has_360",
          )
          .eq("match_id", matchId)
          .order("event_index"),
      ),
    ]);
    if (matchError) throw new Error(matchError.message);
    if (!match) return json({ message: `Match ${matchId} not found.` }, 404);
    const shots = events.filter((e) => e.event_type === "Shot");
    const passes = events.filter((e) => e.event_type === "Pass");
    const homeGoals = Number(match.home_score) || 0;
    const awayGoals = Number(match.away_score) || 0;
    return json({
      match_id: matchId,
      home_team: match.home_team,
      away_team: match.away_team,
      home_goals: homeGoals,
      away_goals: awayGoals,
      total_goals: homeGoals + awayGoals,
      total_events: shots.length + passes.length,
      shots: shots.length,
      passes: passes.length,
      total_xG: Number(
        shots.reduce((s, e) => s + (Number(e.shot_xg) || 0), 0).toFixed(2),
      ),
    });
  }

  // GET /matches/similar/:id
  const similar = path.match(/^\/matches\/similar\/(\d+)$/);
  if (similar) {
    const matchId = Number(similar[1]);
    const topN = Math.min(
      Math.max(Number(url.searchParams.get("top_n") ?? 5), 1),
      20,
    );

    const { data: stats, error: statsError } = await client.rpc("match_stats_all");
    if (statsError) throw new Error(statsError.message);

    const perMatch = new Map<
      number,
      { match_id: number; goals: number; shots: number; passes: number; xg: number }
    >();
    for (const s of (stats ?? []) as Array<{
      match_id: number;
      goals: number;
      shots: number;
      passes: number;
      xg: number;
    }>) {
      perMatch.set(s.match_id, {
        match_id: s.match_id,
        goals: Number(s.goals),
        shots: Number(s.shots),
        passes: Number(s.passes),
        xg: Number(s.xg),
      });
    }

    const target = perMatch.get(matchId);
    if (!target) {
      return json({ message: `Match ${matchId} not found.` }, 404);
    }

    const features = ["goals", "shots", "passes", "xg"] as const;

    const similarities = [...perMatch.values()]
      .filter((m) => m.match_id !== matchId)
      .map((m) => {
        let diff = 0;
        for (const k of features) {
          const range = Math.max(Math.abs(target[k]) + Math.abs(m[k]), 1);
          diff += Math.pow((target[k] - m[k]) / range, 2);
        }
        const dist = Math.sqrt(diff);
        return {
          match_id: m.match_id,
          goals: m.goals,
          shots: m.shots,
          passes: m.passes,
          xg: Number(m.xg.toFixed(2)),
          distance: Number(dist.toFixed(3)),
          similarity_pct: Number(Math.max(0, (1 - dist) * 100).toFixed(1)),
        };
      })
      .sort((a, b) => b.similarity_pct - a.similarity_pct)
      .slice(0, topN);

    return json({ match_id: matchId, similar_matches: similarities });
  }

  return null;
}