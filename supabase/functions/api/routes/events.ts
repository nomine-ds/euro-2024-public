// supabase/functions/api/routes/events.ts
import { coordinates, eventResponse, getRows, json, numeric } from "../lib/core.ts";
import type { SupabaseClient } from "../lib/core.ts";
import type { EventRow } from "../lib/types.ts";

export async function eventRoutes(
  client: SupabaseClient,
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
        .filter((p) => Boolean((p as Record<string, unknown>).teammate))
        .map((p) => toPlayer(p as Record<string, unknown>)),
      opponent_team: players
        .filter((p) => !Boolean((p as Record<string, unknown>).teammate))
        .map((p) => toPlayer(p as Record<string, unknown>)),
      ball_x: ballX,
      ball_y: ballY,
    });
  }
  return null;
}