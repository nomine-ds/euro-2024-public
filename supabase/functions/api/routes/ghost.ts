// supabase/functions/api/routes/ghost.ts
import { getRows, json } from "../lib/core.ts";
import type { SupabaseClient } from "../lib/core.ts";

const TOP_N_GHOSTS = 20;
const MIN_SAMPLES = 100;
const MAX_MATCH_DISTANCE = 25.0;
const MAX_COAST_FRAMES = 1;

type FreezeFrameRow = {
  event_id: string;
  match_id: number;
  timestamp: string | null;
  ball_location: unknown;
  players: unknown;
};

type Detection = {
  x: number;
  y: number;
  teammate: boolean;
  keeper: boolean;
};

type Track = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hits: number;
  coast: number;
  teammateVotes: boolean[];
  keeperVotes: boolean[];
  xs: number[];
  ys: number[];
};

function coords(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const x = Number(value[0]);
  const y = Number(value[1]);
  return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
}

function parseDetections(raw: unknown): Detection[] {
  if (!Array.isArray(raw)) return [];
  const out: Detection[] = [];
  for (const p of raw) {
    if (typeof p !== "object" || p === null) continue;
    const player = p as Record<string, unknown>;
    const loc = coords(player.location);
    if (!loc) continue;
    out.push({
      x: loc[0],
      y: loc[1],
      teammate: Boolean(player.teammate),
      keeper: Boolean(player.keeper),
    });
  }
  return out;
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export async function ghostRoutes(
  client: SupabaseClient,
  path: string,
): Promise<Response | null> {
  const match = path.match(/^\/ghost\/(\d+)$/);
  if (!match) return null;
  const matchId = Number(match[1]);

  const frames = await getRows<FreezeFrameRow>(
    client
      .from("freeze_frames")
      .select("event_id,match_id,timestamp,ball_location,players")
      .eq("match_id", matchId),
  );

  if (!frames.length) {
    return json(
      { message: `Match ${matchId} not found or has no 360 data.` },
      404,
    );
  }

  // === Tracking state ===
  const tracks = new Map<number, Track>();
  let nextId = 0;
  let framesProcessed = 0;

  for (const frame of frames) {
    const detections = parseDetections(frame.players);
    if (!detections.length) continue;
    framesProcessed += 1;

    // Predict track position (simple velocity prediction)
    for (const t of tracks.values()) {
      t.x += t.vx;
      t.y += t.vy;
    }

    // Greedy nearest-neighbor matching
    const unmatchedTracks = new Set(tracks.keys());
    const unmatchedDets = new Set(detections.keys());
    const matchedPairs: Array<{ trackId: number; detIdx: number; dist: number }> = [];

    for (const [trackId, t] of tracks) {
      let best: { detIdx: number; dist: number } | null = null;
      for (const detIdx of unmatchedDets) {
        const d = distance(t.x, t.y, detections[detIdx].x, detections[detIdx].y);
        if (d > MAX_MATCH_DISTANCE) continue;
        if (!best || d < best.dist) best = { detIdx, dist: d };
      }
      if (best) {
        matchedPairs.push({ trackId, detIdx: best.detIdx, dist: best.dist });
        unmatchedTracks.delete(trackId);
        unmatchedDets.delete(best.detIdx);
      }
    }

    // Update matched
    for (const { trackId, detIdx } of matchedPairs) {
      const t = tracks.get(trackId)!;
      const d = detections[detIdx];
      const newVx = d.x - t.x;
      const newVy = d.y - t.y;
      t.vx = 0.5 * t.vx + 0.5 * newVx;
      t.vy = 0.5 * t.vy + 0.5 * newVy;
      t.x = d.x;
      t.y = d.y;
      t.hits += 1;
      t.coast = 0;
      t.teammateVotes.push(d.teammate);
      t.keeperVotes.push(d.keeper);
      t.xs.push(d.x);
      t.ys.push(d.y);
    }

    // Coast unmatched tracks
    const toDelete: number[] = [];
    for (const trackId of unmatchedTracks) {
      const t = tracks.get(trackId)!;
      t.coast += 1;
      if (t.coast > MAX_COAST_FRAMES) toDelete.push(trackId);
    }
    for (const id of toDelete) tracks.delete(id);

    // Birth: new tracks
    for (const detIdx of unmatchedDets) {
      const d = detections[detIdx];
      tracks.set(nextId, {
        id: nextId,
        x: d.x,
        y: d.y,
        vx: 0,
        vy: 0,
        hits: 1,
        coast: 0,
        teammateVotes: [d.teammate],
        keeperVotes: [d.keeper],
        xs: [d.x],
        ys: [d.y],
      });
      nextId += 1;
    }
  }

  // Compute vacuum score per track
  const computeVacuum = (avgDist: number): number => {
    return Math.max(0, 5 * (1 - avgDist / 25));
  };

  type GhostEntry = {
    player_id: string;
    player_name: string;
    is_teammate: boolean;
    is_keeper: boolean;
    vacuum_created: number;
    raw_avg_distance: number;
    avg_x: number;
    avg_y: number;
    sample_count: number;
  };

  // Per-track stats
  const ghostEntries: GhostEntry[] = [];
  for (const t of tracks.values()) {
    if (t.hits < 2) continue;
    const avgX = t.xs.reduce((s, v) => s + v, 0) / t.xs.length;
    const avgY = t.ys.reduce((s, v) => s + v, 0) / t.ys.length;
    const teammateVote = t.teammateVotes.filter(Boolean).length > t.teammateVotes.length / 2;
    const keeperVote = t.keeperVotes.filter(Boolean).length > t.keeperVotes.length / 2;

    ghostEntries.push({
      player_id: `P_${t.id}`,
      player_name: "Unknown",
      is_teammate: teammateVote,
      is_keeper: keeperVote,
      vacuum_created: 0,
      raw_avg_distance: 0,
      avg_x: Number(avgX.toFixed(2)),
      avg_y: Number(avgY.toFixed(2)),
      sample_count: t.hits,
    });
  }

  // Per-frame density calculation (approximation)
  // For performance, use avg distance from sampled frames
  const framesForDensity = frames.slice(0, Math.min(frames.length, 500));
  for (const entry of ghostEntries) {
    let sumDist = 0;
    let count = 0;
    for (const frame of framesForDensity) {
      const dets = parseDetections(frame.players);
      // Find nearest detection to average track position
      let nearest: Detection | null = null;
      let nearestDist = Infinity;
      for (const d of dets) {
        const dd = distance(entry.avg_x, entry.avg_y, d.x, d.y);
        if (dd < nearestDist) {
          nearestDist = dd;
          nearest = d;
        }
      }
      if (!nearest || nearestDist > 15) continue;
      // Compute avg distance to all other detections in this frame
      let frameSum = 0;
      let frameCount = 0;
      for (const other of dets) {
        if (other === nearest) continue;
        frameSum += distance(nearest.x, nearest.y, other.x, other.y);
        frameCount += 1;
      }
      if (frameCount > 0) {
        sumDist += frameSum / frameCount;
        count += 1;
      }
    }
    const avgDist = count > 0 ? sumDist / count : 0;
    entry.raw_avg_distance = Number(avgDist.toFixed(2));
    entry.vacuum_created = Number(computeVacuum(avgDist).toFixed(3));
  }

  // Filter persistent
  let persistent = ghostEntries.filter((g) => g.sample_count >= MIN_SAMPLES);
  if (persistent.length < 5) {
    persistent = [...ghostEntries]
      .sort((a, b) => b.sample_count - a.sample_count)
      .slice(0, 30);
  }

  persistent.sort((a, b) => b.vacuum_created - a.vacuum_created);
  const top = persistent.slice(0, TOP_N_GHOSTS);

  // Renumber names
  let tN = 0;
  let oN = 0;
  let kN = 0;
  for (const g of top) {
    if (g.is_keeper) {
      kN += 1;
      g.player_name = kN === 1 ? "Keeper" : `Keeper ${kN}`;
    } else if (g.is_teammate) {
      tN += 1;
      g.player_name = `Teammate #${tN}`;
    } else {
      oN += 1;
      g.player_name = `Opponent #${oN}`;
    }
  }

  // Insights
  const totalAppearances = top.reduce((s, g) => s + g.sample_count, 0);
  const avgCrowding =
    top.reduce((s, g) => s + g.vacuum_created, 0) / top.length;
  const avgDistance =
    top.reduce((s, g) => s + g.raw_avg_distance, 0) / top.length;

  const sortedByCrowd = [...top].sort(
    (a, b) => a.vacuum_created - b.vacuum_created,
  );
  const mostCrowded = sortedByCrowd[sortedByCrowd.length - 1] ?? null;
  const leastCrowded = sortedByCrowd[0] ?? null;

  return json({
    match_id: matchId,
    ghost_movements: top,
    message: `Top ${top.length} persistent tracks by spatial density (360 file).`,
    source: "three-sixty",
    total_frames: framesProcessed,
    insights: {
      total_appearances: totalAppearances,
      avg_crowding_score: Number(avgCrowding.toFixed(2)),
      avg_distance_to_nearest: Number(avgDistance.toFixed(2)),
      most_crowded: mostCrowded
        ? { name: mostCrowded.player_name, score: mostCrowded.vacuum_created }
        : null,
      least_crowded: leastCrowded
        ? { name: leastCrowded.player_name, score: leastCrowded.vacuum_created }
        : null,
    },
    disclaimer:
      "StatsBomb 360 freeze-frames show only the ~20 players nearest the ball at each event. Identity tracking across frames is approximate. Scores below reflect position frequency, not stable player identity.",
  });
}