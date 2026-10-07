// supabase/functions/api/routes/analytics.ts
import { getRows, json, numeric } from "../lib/core.ts";
import type { SupabaseClient } from "../lib/core.ts";
import type { EventRow } from "../lib/types.ts";
import { euclideanDistance, kMeans, standardize } from "../lib/ml.ts";

export async function analyticsRoutes(
  client: SupabaseClient,
  path: string,
  url: URL,
): Promise<Response | null> {
  // GET /teams
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
      [...teams]
        .map(([team_id, team_name]) => ({ team_id, team_name }))
        .sort((a, b) => a.team_name.localeCompare(b.team_name)),
    );
  }

  // GET /compare/teams?team_ids=1,2
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

  // GET /players/bulk?match_id=X
  if (path === "/players/bulk") {
    const matchId = numeric(url.searchParams.get("match_id"));

    if (matchId === null) {
      const { data: stats, error: statsError } = await client.rpc("player_stats_all");
      if (statsError) throw new Error(statsError.message);

      const players = (stats ?? [])
        .map((s: Record<string, unknown>) => ({
          player_id: Number(s.player_id),
          player_name: String(s.player_name ?? "Unknown"),
          team_name: s.team_name ? String(s.team_name) : null,
          goals: Number(s.goals ?? 0),
          assists: Number(s.assists ?? 0),
          shots: Number(s.shots ?? 0),
          passes: Number(s.passes ?? 0),
          xG: Number(Number(s.xg ?? 0).toFixed(2)),
          xA: Number(Number(s.xa ?? 0).toFixed(2)),
        }))
        .filter((p) => p.shots + p.passes > 0)
        .sort((a, b) => b.goals - a.goals || b.assists - a.assists);

      return json(players);
    }

    const events = await getRows<EventRow>(
      client
        .from("events")
        .select("player_id,player_name,team_id,event_type,shot_outcome,shot_xg,pass_xg,goal_assist")
        .eq("match_id", matchId),
    );

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
        .map((p) => ({
          ...p,
          xG: Number(p.xG.toFixed(2)),
          xA: Number(p.xA.toFixed(2)),
        }))
        .sort((a, b) => b.goals - a.goals || b.assists - a.assists),
    );
  }
  // GET /players/compare?ids=1,2,3
  if (path === "/players/compare") {
    const idsParam = url.searchParams.get("ids") ?? "";
    const playerIds = idsParam
      .split(",")
      .map((s) => numeric(s))
      .filter((n): n is number => n !== null);
    if (playerIds.length < 2 || playerIds.length > 4) {
      return json({ message: "Compare 2-4 players." }, 400);
    }

    const events = await getRows<EventRow>(
      client
        .from("events")
        .select(
          "player_id,player_name,team_id,team_name,event_type,shot_outcome,shot_xg,pass_xg,goal_assist",
        )
        .in("player_id", playerIds),
    );

    // Agregasi per player
    const acc = new Map<
      number,
      {
        player_id: number;
        player_name: string;
        team_name: string | null;
        goals: number;
        assists: number;
        shots: number;
        passes: number;
        xg: number;
        xa: number;
        tackles: number;
        interceptions: number;
        clearances: number;
        dribbles: number;
      }
    >();
    for (const e of events) {
      if (e.player_id === null) continue;
      const entry = acc.get(e.player_id) ?? {
        player_id: e.player_id,
        player_name: e.player_name ?? "Unknown",
        team_name: e.team_name,
        goals: 0,
        assists: 0,
        shots: 0,
        passes: 0,
        xg: 0,
        xa: 0,
        tackles: 0,
        interceptions: 0,
        clearances: 0,
        dribbles: 0,
      };
      switch (e.event_type) {
        case "Shot":
          entry.shots += 1;
          entry.xg += Number(e.shot_xg) || 0;
          if (e.shot_outcome === "Goal") entry.goals += 1;
          break;
        case "Pass":
          entry.passes += 1;
          entry.xa += Number(e.pass_xg) || 0;
          if (e.goal_assist) entry.assists += 1;
          break;
        case "Dribble":
          entry.dribbles += 1;
          break;
        case "Tackle":
          entry.tackles += 1;
          break;
        case "Interception":
          entry.interceptions += 1;
          break;
        case "Clearance":
          entry.clearances += 1;
          break;
      }
      acc.set(e.player_id, entry);
    }

    const players = playerIds
      .map((id) => acc.get(id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);
    if (players.length < 2) {
      return json({ message: "Players not found." }, 404);
    }

    // Similarity matrix
    const featureKeys = [
      "goals",
      "assists",
      "shots",
      "passes",
      "xg",
      "xa",
    ] as const;
    const matrix = players.map((p) => featureKeys.map((k) => p[k]));
    const scaled = standardize(matrix);
    const similarities: Array<{
      player_a: string;
      player_b: string;
      distance: number;
      similarity_pct: number;
    }> = [];
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const dist = euclideanDistance(scaled[i], scaled[j]);
        similarities.push({
          player_a: players[i].player_name,
          player_b: players[j].player_name,
          distance: Number(dist.toFixed(2)),
          similarity_pct: Number(Math.max(0, 100 - dist * 20).toFixed(1)),
        });
      }
    }

    return json({
      players: players.map((p) => ({
        ...p,
        xg: Number(p.xg.toFixed(2)),
        xa: Number(p.xa.toFixed(2)),
      })),
      similarities,
    });
  }
   // GET /players/clustering?n_clusters=4
  if (path === "/players/clustering") {
    const nClusters = Math.min(
      Math.max(Number(url.searchParams.get("n_clusters") ?? 4), 2),
      10,
    );

    const { data: stats, error: statsError } = await client.rpc("player_stats_all");
    if (statsError) throw new Error(statsError.message);

    type PlayerStats = {
      player_id: number;
      player_name: string;
      team_name: string | null;
      goals: number;
      assists: number;
      shots: number;
      passes: number;
      xg: number;
      xa: number;
      dribbles: number;
    };

    const players: PlayerStats[] = (stats ?? [])
      .map((s: Record<string, unknown>) => ({
        player_id: Number(s.player_id),
        player_name: String(s.player_name ?? "Unknown"),
        team_name: s.team_name ? String(s.team_name) : null,
        goals: Number(s.goals),
        assists: Number(s.assists),
        shots: Number(s.shots),
        passes: Number(s.passes),
        xg: Number(s.xg),
        xa: Number(s.xa),
        dribbles: Number(s.dribbles),
      }))
      .filter((p) => p.shots + p.passes + p.dribbles > 0);

    if (players.length < nClusters) {
      return json({ message: "Too few players for clustering." }, 404);
    }

    const features = ["goals", "assists", "shots", "passes", "xg", "xa"] as const;
    const matrix = players.map((p) => features.map((k) => p[k]));
    const scaled = standardize(matrix);
    const { labels } = kMeans(scaled, nClusters, 42, 10);

    const clusterData = new Map<number, PlayerStats[]>();
    for (let i = 0; i < players.length; i++) {
      const c = labels[i];
      if (!clusterData.has(c)) clusterData.set(c, []);
      clusterData.get(c)!.push(players[i]);
    }

    const clusterLabels = new Map<number, string>();
    for (const [c, members] of clusterData) {
      const avgGoals = members.reduce((s, p) => s + p.goals, 0) / members.length;
      const avgAssists = members.reduce((s, p) => s + p.assists, 0) / members.length;
      const avgShots = members.reduce((s, p) => s + p.shots, 0) / members.length;
      const avgPasses = members.reduce((s, p) => s + p.passes, 0) / members.length;

      let label: string;
      if (avgGoals > 1 && avgShots > 3) label = "Finisher";
      else if (avgAssists > 1 && avgPasses > 100) label = "Playmaker";
      else if (avgPasses > 200 && avgShots < 5) label = "Deep-Lying Playmaker";
      else if (avgShots > 5 && avgGoals < 1) label = "Ball-Winning Defender";
      else label = `Cluster ${c + 1}`;
      clusterLabels.set(c, label);
    }

    const result = players.map((p, i) => ({
      player_id: p.player_id,
      player_name: p.player_name,
      team_name: p.team_name,
      goals: p.goals,
      assists: p.assists,
      shots: p.shots,
      passes: p.passes,
      xg: Number(p.xg.toFixed(2)),
      xa: Number(p.xa.toFixed(2)),
      cluster: labels[i],
      cluster_label: clusterLabels.get(labels[i]) ?? `Cluster ${labels[i] + 1}`,
    }));

    return json({ n_clusters: nClusters, players: result });
  }
  return null;
}