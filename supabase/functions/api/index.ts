import { createClient } from "npm:@supabase/supabase-js@2";

type EventRow = {
  event_id: string;
  match_id: number;
  event_index: number;
  event_type: string | null;
  timestamp: string | null;
  period: number | null;
  player_id: number | null;
  player_name: string | null;
  team_id: number | null;
  team_name: string | null;
  location: unknown;
  pass_end_location: unknown;
  recipient_id: number | null;
  recipient_name: string | null;
  shot_outcome: string | null;
  shot_xg: number | null;
  pass_xg: number | null;
  goal_assist: boolean;
  card_type: string | null;
  has_360: boolean;
};

type MatchRow = {
  match_id: number;
  match_date: string | null;
  home_team: string;
  away_team: string;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number;
  away_score: number;
  has_360: boolean;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    throw new Error("Supabase URL and anonymous key are not configured.");
  }
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getRows<T>(
  query: {
    range: (from: number, to: number) => PromiseLike<{
      data: T[] | null;
      error: { message: string } | null;
    }>;
  },
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query.range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

function numeric(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function coordinates(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const x = Number(value[0]);
  const y = Number(value[1]);
  return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
}

function eventResponse(event: EventRow) {
  const [x, y] = coordinates(event.location) ?? [0, 0];
  return {
    event_id: event.event_id,
    match_id: event.match_id,
    timestamp: event.timestamp,
    period: event.period,
    player_name: event.player_name,
    team_name: event.team_name,
    event_type: event.event_type,
    outcome: event.shot_outcome,
    is_goal: event.event_type === "Shot" && event.shot_outcome === "Goal",
    card_type: event.card_type,
    x,
    y,
    has_360: event.has_360,
  };
}

async function matchRoutes(
  client: ReturnType<typeof getClient>,
  path: string,
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
            "event_id,match_id,event_index,event_type,timestamp,period,player_id,player_name,team_id,team_name,location,pass_end_location,recipient_id,recipient_name,shot_outcome,shot_xg,pass_xg,goal_assist,card_type",
          )
          .eq("match_id", matchId)
          .order("event_index"),
      ),
    ]);
    if (matchError) throw new Error(matchError.message);
    if (!match) return json({ message: `Match ${matchId} not found.` }, 404);
    const shots = events.filter((event) => event.event_type === "Shot");
    const passes = events.filter((event) => event.event_type === "Pass");
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
        shots.reduce((sum, event) => sum + (Number(event.shot_xg) || 0), 0).toFixed(2),
      ),
    });
  }
  return null;
}

async function eventRoutes(
  client: ReturnType<typeof getClient>,
  path: string,
  url: URL,
): Promise<Response | null> {
  const eventMatch = path.match(/^\/events\/(\d+)$/);
  if (eventMatch) {
    const matchId = Number(eventMatch[1]);
    let query = client
      .from("events")
      .select(
        "event_id,match_id,event_index,event_type,timestamp,period,player_name,team_name,location,shot_outcome,shot_xg,card_type,has_360",
      )
      .eq("match_id", matchId)
      .order("event_index");
    const eventType = url.searchParams.get("event_type");
    if (eventType) query = query.eq("event_type", eventType);
    const events = await getRows<EventRow>(query);
    return json(events.map(eventResponse));
  }

  const frameMatch = path.match(/^\/360\/([0-9a-f-]+)$/i);
  if (frameMatch) {
    const eventId = frameMatch[1];
    const matchId = numeric(url.searchParams.get("match_id"));
    let query = client
      .from("freeze_frames")
      .select("event_id,match_id,timestamp,period,ball_location,players")
      .eq("event_id", eventId);
    if (matchId !== null) query = query.eq("match_id", matchId);
    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return json({ message: "Event not found or has no 360 data." }, 404);

    const { data: event, error: eventError } = await client
      .from("events")
      .select("timestamp,period,location")
      .eq("event_id", eventId)
      .maybeSingle();
    if (eventError) throw new Error(eventError.message);
    const [ballX, ballY] =
      coordinates(data.ball_location) ?? coordinates(event?.location) ?? [0, 0];
    const players = Array.isArray(data.players) ? data.players : [];
    const toPlayer = (player: Record<string, unknown>) => {
      const [x, y] = coordinates(player.location) ?? [0, 0];
      const playerInfo =
        typeof player.player === "object" && player.player !== null
          ? (player.player as Record<string, unknown>)
          : {};
      return {
        player_id: Number(playerInfo.id) || 0,
        player_name: String(playerInfo.name || "Unknown"),
        x,
        y,
        teammate: Boolean(player.teammate),
        jersey: Number(playerInfo.jersey_number) || 0,
      };
    };
    return json({
      event_id: data.event_id,
      match_id: data.match_id,
      timestamp: data.timestamp || event?.timestamp,
      period: data.period || event?.period,
      possession_team: players
        .filter((player) => Boolean((player as Record<string, unknown>).teammate))
        .map((player) => toPlayer(player as Record<string, unknown>)),
      opponent_team: players
        .filter((player) => !Boolean((player as Record<string, unknown>).teammate))
        .map((player) => toPlayer(player as Record<string, unknown>)),
      ball_x: ballX,
      ball_y: ballY,
    });
  }
  return null;
}

async function playerRoutes(
  client: ReturnType<typeof getClient>,
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
    const events = await getRows<Pick<EventRow, "player_id" | "player_name" | "team_id">>(
      query,
    );
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
    const shots = events.filter((event) => event.event_type === "Shot");
    const passes = events.filter((event) => event.event_type === "Pass");
    return json({
      player_id: playerId,
      player_name: events[0].player_name || "Unknown",
      team_name: events[0].team_name,
      goals: shots.filter((event) => event.shot_outcome === "Goal").length,
      assists: passes.filter((event) => event.goal_assist).length,
      shots: shots.length,
      passes: passes.length,
      xG: Number(
        shots.reduce((sum, event) => sum + (Number(event.shot_xg) || 0), 0).toFixed(2),
      ),
      xA: Number(
        passes.reduce((sum, event) => sum + (Number(event.pass_xg) || 0), 0).toFixed(2),
      ),
    });
  }
  return null;
}

async function passNetwork(
  client: ReturnType<typeof getClient>,
  matchId: number,
  teamId: number | null,
): Promise<Response> {
  let query = client
    .from("events")
    .select(
      "player_id,player_name,team_id,event_type,location,pass_end_location,recipient_id,recipient_name",
    )
    .eq("match_id", matchId)
    .eq("event_type", "Pass")
    .order("event_index");
  if (teamId !== null) query = query.eq("team_id", teamId);
  const events = await getRows<
    Pick<
      EventRow,
      | "player_id"
      | "player_name"
      | "team_id"
      | "event_type"
      | "location"
      | "pass_end_location"
      | "recipient_id"
      | "recipient_name"
    >
  >(query);

  const names = new Map<number, string>();
  const positions = new Map<number, Array<[number, number]>>();
  const edges = new Map<string, { source: number; target: number; count: number }>();
  for (const event of events) {
    if (event.player_id === null || event.recipient_id === null) continue;
    names.set(event.player_id, event.player_name || "Unknown");
    names.set(event.recipient_id, event.recipient_name || "Unknown");
    for (const [playerId, location] of [
      [event.player_id, event.location],
      [event.recipient_id, event.pass_end_location],
    ] as const) {
      const point = coordinates(location);
      if (point) positions.set(playerId, [...(positions.get(playerId) ?? []), point]);
    }
    const key = `${event.player_id}:${event.recipient_id}`;
    const edge = edges.get(key) ?? {
      source: event.player_id,
      target: event.recipient_id,
      count: 0,
    };
    edge.count += 1;
    edges.set(key, edge);
  }
  return json({
    match_id: matchId,
    team_id: teamId,
    total_passes: [...edges.values()].reduce((sum, edge) => sum + edge.count, 0),
    nodes: [...names].map(([id, name]) => {
      const samples = positions.get(id) ?? [];
      return {
        id,
        name,
        avg_x: samples.length
          ? Number(
              (samples.reduce((sum, point) => sum + point[0], 0) / samples.length).toFixed(2),
            )
          : 60,
        avg_y: samples.length
          ? Number(
              (samples.reduce((sum, point) => sum + point[1], 0) / samples.length).toFixed(2),
            )
          : 40,
      };
    }),
    edges: [...edges.values()],
    ...(events.length ? {} : { message: "No passes found." }),
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return json({ message: "Method not allowed." }, 405);
  }

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/(?:functions\/v1\/)?api/, "") || "/";
    const client = getClient();

    const matchResponse = await matchRoutes(client, path);
    if (matchResponse) return matchResponse;
    const eventResponseValue = await eventRoutes(client, path, url);
    if (eventResponseValue) return eventResponseValue;
    const playerResponse = await playerRoutes(client, path, url);
    if (playerResponse) return playerResponse;

    const network = path.match(/^\/passnetwork\/(\d+)$/);
    if (network) {
      return await passNetwork(
        client,
        Number(network[1]),
        numeric(url.searchParams.get("team_id")),
      );
    }

    return json({ message: "This API endpoint has not been migrated to Supabase yet." }, 501);
  } catch (error) {
    console.error("Supabase API request failed:", error);
    return json({ message: "The Supabase API request failed." }, 500);
  }
});
