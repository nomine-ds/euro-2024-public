// frontend/app/ghost/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

import { API_BASE } from "@/lib/api";

const PITCH_X = 120;
const PITCH_Y = 80;

interface GhostMovement {
  player_id: string;
  player_name: string;
  vacuum_created: number;
  sample_count: number;
  raw_avg_distance: number;
  avg_x?: number;
  avg_y?: number;
  is_teammate?: boolean;
  is_keeper?: boolean;
}

interface Insights {
  total_appearances: number;
  avg_crowding_score: number;
  avg_distance_to_nearest: number;
  most_crowded: { name: string; score: number } | null;
  least_crowded: { name: string; score: number } | null;
}

interface GhostData {
  match_id: number;
  ghost_movements: GhostMovement[];
  message: string;
  source?: string;
  total_frames?: number;
  insights?: Insights;
  disclaimer?: string;
}

type FilterMode = "all" | "teammate" | "opponent";

export default function GhostPage() {
  const { id } = useParams<{ id: string }>();
  const matchId = id;
  const [data, setData] = useState<GhostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!matchId) return;
    const loadGhost = async () => {
      try {
        const res = await fetch(`${API_BASE}/ghost/${matchId}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? `HTTP ${res.status}`);
        }
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    loadGhost();
  }, [matchId]);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    drawPitch(ctx, width, height);

    const margin = 20;
    const innerW = width - 2 * margin;
    const innerH = height - 2 * margin;

    const visible = data.ghost_movements.filter((p) => {
      if (filter === "all") return true;
      if (filter === "teammate") return p.is_teammate === true;
      return p.is_teammate === false;
    });

    const maxVacuum = Math.max(...visible.map((p) => p.vacuum_created), 0.1);

    visible.forEach((p) => {
      const sbx = p.avg_x ?? 60;
      const sby = p.avg_y ?? 40;
      const cx = margin + (sbx / PITCH_X) * innerW;
      const cy = margin + (sby / PITCH_Y) * innerH;

      const isTeammate = p.is_teammate === true;
      const isKeeper = p.is_keeper === true;
      const radius = 5 + (p.vacuum_created / maxVacuum) * 14;

      let fillColor: string;
      if (isKeeper) fillColor = "rgba(250, 204, 21, 0.85)";
      else if (isTeammate) fillColor = "rgba(59, 130, 246, 0.85)";
      else fillColor = "rgba(239, 68, 68, 0.85)";

      if (p.vacuum_created > maxVacuum * 0.7) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = fillColor.replace("0.85", "0.25");
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "white";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 3;
      ctx.fillText(p.player_name, cx, cy - radius - 5);
      ctx.shadowBlur = 0;
    });

    drawLegend(ctx, width, visible, maxVacuum);
  }, [data, filter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-500">Loading Position Density...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-4xl mx-auto bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800">
          <p className="text-red-800 dark:text-red-300">❌ {error}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!data || data.ghost_movements.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-4xl mx-auto bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-300">
            ⚠️ No position density data for this match.
          </p>
          <Link
            href={`/match/${matchId}`}
            className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Match Detail
          </Link>
        </div>
      </div>
    );
  }

  const teammateCount = data.ghost_movements.filter(
    (p) => p.is_teammate === true
  ).length;
  const opponentCount = data.ghost_movements.length - teammateCount;
  const insights = data.insights;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <Link
          href={`/match/${matchId}`}
          className="text-blue-600 dark:text-blue-400 hover:underline inline-block mb-6"
        >
          ← Back to Match Detail
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
            📍 Player Position Density
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Spatial distribution of players from 360 freeze-frames.
            {data.source && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs">
                {data.source}
              </span>
            )}
            {data.total_frames && (
              <span className="ml-2 text-xs text-gray-400">
                {data.total_frames} frames
              </span>
            )}
          </p>
        </div>

        {/* Insights cards */}
        {insights && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Total appearances
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {insights.total_appearances}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Avg crowding score
              </div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {insights.avg_crowding_score.toFixed(2)}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Avg dist to nearest
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {insights.avg_distance_to_nearest.toFixed(1)}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Most crowded
              </div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                {insights.most_crowded?.name ?? "—"}
              </div>
              <div className="text-xs text-gray-400">
                score {insights.most_crowded?.score ?? "—"}
              </div>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
              filter === "all"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400"
            }`}
          >
            All ({data.ghost_movements.length})
          </button>
          <button
            onClick={() => setFilter("teammate")}
            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
              filter === "teammate"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400"
            }`}
          >
            🔵 Teammate ({teammateCount})
          </button>
          <button
            onClick={() => setFilter("opponent")}
            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
              filter === "opponent"
                ? "bg-red-600 text-white border-red-600"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-red-400"
            }`}
          >
            🔴 Opponent ({opponentCount})
          </button>
        </div>

        {/* Canvas */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 mb-6">
          <canvas
            ref={canvasRef}
            width={900}
            height={560}
            className="w-full h-auto rounded-lg"
          />
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
          <p className="text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
            ⚠️ <strong>Data limitation:</strong>{" "}
            {data.disclaimer ??
              "StatsBomb 360 freeze-frames only show the ~20 players nearest the ball at each event."}
          </p>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Player</th>
                <th className="text-right px-4 py-3 font-medium">Crowding</th>
                <th className="text-right px-4 py-3 font-medium">Avg Dist</th>
                <th className="text-right px-4 py-3 font-medium">Samples</th>
                <th className="text-right px-4 py-3 font-medium">Avg X</th>
                <th className="text-right px-4 py-3 font-medium">Avg Y</th>
              </tr>
            </thead>
            <tbody>
              {data.ghost_movements.map((p) => {
                const isTeammate = p.is_teammate === true;
                const isKeeper = p.is_keeper === true;
                let dotColor = isTeammate ? "bg-blue-500" : "bg-red-500";
                if (isKeeper) dotColor = "bg-yellow-400";
                return (
                  <tr
                    key={p.player_id}
                    className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-2 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                      <span className="text-gray-900 dark:text-white">
                        {p.player_name}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-900 dark:text-white">
                      {p.vacuum_created.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-500 dark:text-gray-400">
                      {p.raw_avg_distance.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-500 dark:text-gray-400">
                      {p.sample_count}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-500 dark:text-gray-400">
                      {p.avg_x?.toFixed(1) ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-500 dark:text-gray-400">
                      {p.avg_y?.toFixed(1) ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function drawPitch(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#2e7d32");
  gradient.addColorStop(1, "#1b5e20");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.5;

  const margin = 20;
  ctx.strokeRect(margin, margin, width - 2 * margin, height - 2 * margin);

  ctx.beginPath();
  ctx.moveTo(width / 2, margin);
  ctx.lineTo(width / 2, height - margin);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 50, 0, Math.PI * 2);
  ctx.stroke();

  const penaltyW = (width - 2 * margin) * 0.14;
  const penaltyH = (height - 2 * margin) * 0.5;
  ctx.strokeRect(margin, height / 2 - penaltyH / 2, penaltyW, penaltyH);
  ctx.strokeRect(
    width - margin - penaltyW,
    height / 2 - penaltyH / 2,
    penaltyW,
    penaltyH
  );

  const goalW = penaltyW * 0.4;
  const goalH = penaltyH * 0.5;
  ctx.strokeRect(margin, height / 2 - goalH / 2, goalW, goalH);
  ctx.strokeRect(
    width - margin - goalW,
    height / 2 - goalH / 2,
    goalW,
    goalH
  );
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  width: number,
  visible: GhostMovement[],
  maxVacuum: number
) {
  const lx = width - 210;
  const ly = 30;
  const lw = 190;
  const lh = 130;

  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(lx, ly, lw, lh);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.strokeRect(lx, ly, lw, lh);

  ctx.textAlign = "left";
  ctx.font = "bold 11px sans-serif";
  ctx.fillStyle = "white";
  ctx.fillText("Legend", lx + 10, ly + 18);

  ctx.font = "11px sans-serif";

  ctx.beginPath();
  ctx.arc(lx + 16, ly + 36, 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(59, 130, 246, 0.85)";
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.fillText("Teammate", lx + 28, ly + 40);

  ctx.beginPath();
  ctx.arc(lx + 16, ly + 56, 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.fillText("Opponent", lx + 28, ly + 60);

  ctx.beginPath();
  ctx.arc(lx + 16, ly + 76, 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(250, 204, 21, 0.85)";
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.fillText("Keeper", lx + 28, ly + 80);

  ctx.font = "10px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(`Size = crowding (max ${maxVacuum.toFixed(2)})`, lx + 10, ly + 100);
  ctx.fillText(`Visible: ${visible.length} players`, lx + 10, ly + 116);
}