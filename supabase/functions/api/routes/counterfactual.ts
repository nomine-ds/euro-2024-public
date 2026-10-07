// supabase/functions/api/routes/counterfactual.ts
import { json, numeric } from "../lib/core.ts";
import type { SupabaseClient } from "../lib/core.ts";
import { mulberry32, seededGaussian } from "../lib/ml.ts";

const VALID_ACTIONS = ["pass", "shoot", "dribble", "cross", "through_ball"] as const;
type Action = (typeof VALID_ACTIONS)[number];

function estimateXgAlternative(
  ctx: { shot_xg: number; location: [number, number] },
  action: Action,
): number {
  const originalXg = ctx.shot_xg;
  const [x, y] = ctx.location;
  const distToGoal = Math.sqrt(Math.pow(x - 120, 2) + Math.pow(y - 40, 2));
  const distanceFactor = Math.max(0.1, 1 - distToGoal / 100);

  const alternatives: Record<Action, number> = {
    pass: originalXg * 0.7 + 0.05,
    shoot: originalXg * 1.1,
    dribble: originalXg * 0.9 + 0.03,
    cross: originalXg * 0.85 + 0.04,
    through_ball: originalXg * 1.3 + distanceFactor * 0.1,
  };

  return Math.max(0, Math.min(alternatives[action], 1));
}

function monteCarloSimulate(
  ctx: { shot_xg: number; location: [number, number]; event_id: string },
  action: Action,
  n: number = 1000,
): {
  base_xg: number;
  mean_xg: number;
  std_xg: number;
  percentile_25: number;
  percentile_75: number;
  probability_goal: number;
  n_simulations: number;
} {
  const baseXg = estimateXgAlternative(ctx, action);
  const seedInput = `${ctx.event_id}-${action}-${ctx.shot_xg}`;
  let seed = 0;
  for (let i = 0; i < seedInput.length; i++) {
    seed = (seed * 31 + seedInput.charCodeAt(i)) | 0;
  }
  const rng = mulberry32(seed);

  const samples: number[] = [];
  for (let i = 0; i < n; i++) {
    const noise = seededGaussian(rng, 0, 0.03);
    samples.push(Math.max(0, Math.min(baseXg + noise, 1)));
  }
  samples.sort((a, b) => a - b);

  const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
  const variance =
    samples.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / samples.length;
  const std = Math.sqrt(variance);

  return {
    base_xg: Number(baseXg.toFixed(3)),
    mean_xg: Number(mean.toFixed(3)),
    std_xg: Number(std.toFixed(3)),
    percentile_25: Number(samples[Math.floor(n * 0.25)].toFixed(3)),
    percentile_75: Number(samples[Math.floor(n * 0.75)].toFixed(3)),
    probability_goal: Number(mean.toFixed(3)),
    n_simulations: n,
  };
}

export async function counterfactualRoutes(
  client: SupabaseClient,
  path: string,
  url: URL,
): Promise<Response | null> {
  if (path !== "/counterfactual/simulate") return null;

  const matchId = numeric(url.searchParams.get("match_id"));
  const eventId = url.searchParams.get("event_id");
  const alternative = (url.searchParams.get("alternative") ?? "pass") as Action;

  if (matchId === null || !eventId) {
    return json({ message: "match_id and event_id are required." }, 400);
  }
  if (!VALID_ACTIONS.includes(alternative)) {
    return json(
      {
        message: `Invalid alternative '${alternative}'. Must be one of: ${VALID_ACTIONS.join(", ")}`,
      },
      422,
    );
  }

  const { data: event, error } = await client
    .from("events")
    .select("event_id,match_id,event_type,location,shot_xg,shot_outcome")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!event) return json({ message: `Event ${eventId} not found.` }, 404);

  const loc: [number, number] = Array.isArray(event.location) && event.location.length >= 2
    ? [Number(event.location[0]), Number(event.location[1])]
    : [60, 40];

  const originalXg = Number(event.shot_xg) || 0.1;
  const ctx = { shot_xg: originalXg, location: loc, event_id: eventId };

  const originalAction: Action =
    event.event_type === "Shot"
      ? "shoot"
      : (VALID_ACTIONS.includes((event.event_type ?? "").toLowerCase() as Action)
          ? (event.event_type!.toLowerCase() as Action)
          : "shoot");

  const originalResult = monteCarloSimulate(ctx, originalAction, 1000);
  const alternativeResult = monteCarloSimulate(ctx, alternative, 1000);

  const delta = alternativeResult.mean_xg - originalResult.mean_xg;

  return json({
    match_id: matchId,
    event_id: eventId,
    original: {
      action: originalAction,
      mean_xg: originalResult.mean_xg,
      probability_goal: originalResult.probability_goal,
    },
    alternative: {
      action: alternative,
      mean_xg: alternativeResult.mean_xg,
      probability_goal: alternativeResult.probability_goal,
    },
    delta_xg: Number(delta.toFixed(3)),
    delta_percent: Number(
      ((delta / Math.max(originalResult.mean_xg, 0.01)) * 100).toFixed(1),
    ),
    simulation_details: alternativeResult,
    message: `If '${alternative}' was chosen, ΔxG = ${delta >= 0 ? "+" : ""}${delta.toFixed(3)}`,
  });
}