// supabase/functions/api/routes/passnetwork.ts
import { coordinates, getRows, json } from "../lib/core.ts";
import type { SupabaseClient } from "../lib/core.ts";
import type { EventRow } from "../lib/types.ts";

export async function passNetwork(
  client: SupabaseClient,
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
    total_passes: [...edges.values()].reduce((s, e) => s + e.count, 0),
    nodes: [...names].map(([id, name]) => {
      const samples = positions.get(id) ?? [];
      return {
        id,
        name,
        avg_x: samples.length
          ? Number(
              (samples.reduce((s, p) => s + p[0], 0) / samples.length).toFixed(2),
            )
          : 60,
        avg_y: samples.length
          ? Number(
              (samples.reduce((s, p) => s + p[1], 0) / samples.length).toFixed(2),
            )
          : 40,
      };
    }),
    edges: [...edges.values()],
    ...(events.length ? {} : { message: "No passes found." }),
  });
}