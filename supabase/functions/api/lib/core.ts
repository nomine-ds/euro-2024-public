// supabase/functions/api/lib/core.ts
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export type { SupabaseClient };

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export function getClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    throw new Error("Supabase URL and anonymous key are not configured.");
  }
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getRows<T>(
  query: {
    range: (from: number, to: number) => PromiseLike<{
      data: T[] | null;
      error: { message: string } | null;
    }>;
  },
  maxRows = 50_000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += 1000) {
    const { data, error } = await query.range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
  throw new Error(`Query exceeded ${maxRows} rows.`);
}

export function numeric(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function coordinates(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const x = Number(value[0]);
  const y = Number(value[1]);
  return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
}

export function eventResponse(event: {
  event_id: string;
  match_id: number;
  timestamp: string | null;
  period: number | null;
  player_name: string | null;
  team_name: string | null;
  event_type: string | null;
  shot_outcome: string | null;
  card_type: string | null;
  location: unknown;
  has_360: boolean;
}) {
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