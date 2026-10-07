// supabase/functions/api/routes/tactical.ts
import { getRows, json } from "../lib/core.ts";
import type { SupabaseClient } from "../lib/core.ts";
import type { EventRow } from "../lib/types.ts";
import { standardize } from "../lib/ml.ts";

const TACTICAL_WINDOW_MINUTES = 5;
const ATT_THIRD_X = 80.0;
const DEF_THIRD_X = 40.0;
const MIN_EVENTS_FOR_TACTICAL = 5;
const PELT_PENALTY = 3.0;
const MIN_CP_SEPARATION = 2;
const PRESS_DEF_ACTIONS = new Set([
  "Block",
  "Interception",
  "Clearance",
  "Pressure",
  "Tackle",
  "Duel",
  "Foul Committed",
]);

type ParsedEvent = { minute: number; event: EventRow };

function parseTimestamp(timestamp: string | null): number | null {
  if (!timestamp || !timestamp.includes(":")) return null;
  const parts = timestamp.split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  let minute = h * 60 + m;
  if (parts.length > 2) {
    const sec = Number(parts[2]);
    if (Number.isFinite(sec)) minute += sec / 60;
  }
  return minute;
}

function l2Cost(signal: number[][]): number {
  if (signal.length === 0) return 0;
  const dim = signal[0].length;
  let cost = 0;
  for (let d = 0; d < dim; d++) {
    let sum = 0;
    for (const row of signal) sum += row[d];
    const mean = sum / signal.length;
    for (const row of signal) cost += Math.pow(row[d] - mean, 2);
  }
  return cost;
}

function binarySegmentation(
  signal: number[][],
  threshold: number,
  minSize: number = 2,
): number[] {
  const n = signal.length;
  if (n < 2 * minSize) return [];
  const changePoints: number[] = [];
  const segments: Array<[number, number]> = [[0, n]];

  while (segments.length) {
    const [start, end] = segments.pop()!;
    const len = end - start;
    if (len < 2 * minSize) continue;

    const seg = signal.slice(start, end);
    const baseCost = l2Cost(seg);
    let bestGain = 0;
    let bestSplit = -1;

    for (let i = minSize; i <= len - minSize; i++) {
      const cost = l2Cost(seg.slice(0, i)) + l2Cost(seg.slice(i));
      const gain = baseCost - cost;
      if (gain > bestGain) {
        bestGain = gain;
        bestSplit = i;
      }
    }

    if (bestSplit > 0 && bestGain > threshold) {
      const absSplit = start + bestSplit;
      changePoints.push(absSplit);
      segments.push([start, absSplit]);
      segments.push([absSplit, end]);
    }
  }

  changePoints.sort((a, b) => a - b);
  return changePoints;
}

async function getRollingStats(
  client: SupabaseClient,
  matchId: number,
): Promise<{
  bins: number[];
  xg_rolling: number[];
  ppda_rolling: (number | null)[];
  field_tilt_rolling: number[];
  window_minutes: number;
} | null> {
  const events = await getRows<EventRow>(
    client
      .from("events")
      .select("event_id,timestamp,event_type,location,shot_xg")
      .eq("match_id", matchId)
      .order("event_index"),
  );

  const parsed: ParsedEvent[] = [];
  for (const ev of events) {
    const minute = parseTimestamp(ev.timestamp);
    if (minute !== null) parsed.push({ minute, event: ev });
  }
  if (parsed.length < MIN_EVENTS_FOR_TACTICAL) return null;

  const maxMinute = Math.max(...parsed.map((p) => p.minute));
  const bins: number[] = [];
  for (let b = 0; b <= maxMinute; b += TACTICAL_WINDOW_MINUTES) bins.push(b);
  if (!bins.length) return null;

  const xgPerBin: number[] = [];
  const passesPerBin: number[] = [];
  const defPerBin: number[] = [];
  const ftPasses: number[] = [];
  const dtPasses: number[] = [];

  for (const binStart of bins) {
    const binEnd = binStart + TACTICAL_WINDOW_MINUTES;
    const subset = parsed.filter(
      (p) => p.minute >= binStart && p.minute < binEnd,
    );

    let xgSum = 0;
    let passes = 0;
    let defActions = 0;
    let ft = 0;
    let dt = 0;

    for (const { event } of subset) {
      const typeName = event.event_type;
      if (typeName === "Shot") {
        const xg = Number(event.shot_xg);
        if (Number.isFinite(xg)) xgSum += xg;
      } else if (typeName === "Pass") {
        passes += 1;
        if (Array.isArray(event.location) && event.location.length > 0) {
          const x = Number(event.location[0]);
          if (Number.isFinite(x)) {
            if (x > ATT_THIRD_X) ft += 1;
            else if (x < DEF_THIRD_X) dt += 1;
          }
        }
      } else if (typeName && PRESS_DEF_ACTIONS.has(typeName)) {
        defActions += 1;
      }
    }

    xgPerBin.push(Number(xgSum.toFixed(4)));
    passesPerBin.push(passes);
    defPerBin.push(defActions);
    ftPasses.push(ft);
    dtPasses.push(dt);
  }

  const ppdaPerBin: (number | null)[] = passesPerBin.map((p, i) =>
    defPerBin[i] > 0 ? Number((p / defPerBin[i]).toFixed(2)) : null,
  );

  const fieldTiltPerBin: number[] = ftPasses.map((ft, i) => {
    const total = ft + dtPasses[i];
    return total > 0 ? Number((ft / total).toFixed(3)) : 0.5;
  });

  return {
    bins,
    xg_rolling: xgPerBin,
    ppda_rolling: ppdaPerBin,
    field_tilt_rolling: fieldTiltPerBin,
    window_minutes: TACTICAL_WINDOW_MINUTES,
  };
}

export async function tacticalRoutes(
  client: SupabaseClient,
  path: string,
): Promise<Response | null> {
  const match = path.match(/^\/tactical\/(\d+)$/);
  if (!match) return null;
  const matchId = Number(match[1]);

  const rolling = await getRollingStats(client, matchId);
  if (!rolling) {
    return json(
      { message: `Match ${matchId} not found or has insufficient event data.` },
      404,
    );
  }

  const xgs = rolling.xg_rolling;
  const ppdas = rolling.ppda_rolling;
  const fts = rolling.field_tilt_rolling;
  const nBins = xgs.length;

  if (nBins < 3) {
    return json(
      { message: `Match ${matchId} not found or has insufficient event data.` },
      404,
    );
  }

  const validPpda = ppdas.filter((v): v is number => v !== null);
  const meanPpda = validPpda.length
    ? validPpda.reduce((s, v) => s + v, 0) / validPpda.length
    : 0;
  const ppdaFilled = ppdas.map((v) => (v !== null ? v : meanPpda));

  const rawSignal: number[][] = xgs.map((xg, i) => [
    xg,
    ppdaFilled[i],
    fts[i],
  ]);

  // Standardize agar binary segmentation stabil
  const signal = standardize(rawSignal);

  let changePoints: number[] = [];
  let method = "none";

  const threshold = PELT_PENALTY * 3;
  const cps = binarySegmentation(signal, threshold).filter(
    (cp) => cp > 0 && cp < nBins,
  );
  if (cps.length) {
    changePoints = cps;
    method = "binary_segmentation";
  }

  if (!changePoints.length) {
    const meanXg = xgs.reduce((s, v) => s + v, 0) / nBins;
    const xgThreshold = Math.max(meanXg * 2, 0.1);
    const candidates: number[] = [];
    for (let i = 1; i < nBins - 1; i++) {
      if (
        xgs[i] > xgThreshold &&
        xgs[i] >= xgs[i - 1] &&
        xgs[i] >= xgs[i + 1]
      ) {
        candidates.push(i);
      }
    }
    const filtered: number[] = [];
    for (const c of candidates) {
      if (!filtered.length || c - filtered[filtered.length - 1] >= MIN_CP_SEPARATION) {
        filtered.push(c);
      }
    }
    if (filtered.length) {
      changePoints = filtered;
      method = "xg_local_maxima";
    }
  }

  const changeTimes = changePoints
    .filter((cp) => cp > 0 && cp < nBins)
    .map((cp) => ({
      minute: Math.trunc(rolling.bins[cp]),
      index: cp,
      xg_before: cp > 0 ? xgs[cp - 1] : 0,
      xg_after: cp < nBins ? xgs[cp] : 0,
    }));

  const message = changeTimes.length
    ? `Detected ${changeTimes.length} match tempo shifts (method: ${method}, pen=${PELT_PENALTY}).`
    : "No significant tempo shifts detected.";

  return json({
    match_id: matchId,
    change_points: changeTimes,
    rolling_data: rolling,
    pen_used: PELT_PENALTY,
    detection_method: method,
    message,
  });
}