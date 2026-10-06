// frontend/app/player-comparison/page.tsx
"use client";

import { ChartSkeleton } from "@/components/Skeleton";
import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Player {
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

interface Similarity {
  player_a: string;
  player_b: string;
  distance: number;
  similarity_pct: number;
}

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"];
const CHART_HEIGHT = 400;

// ================================================================
// HOOK: measure width sekali + window resize (debounced).
// ================================================================
function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      if (ref.current) {
        const w = ref.current.clientWidth;
        if (w > 0) setWidth(w);
      }
    };

    measure();

    let timer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(measure, 300);
    };

    window.addEventListener("resize", onResize);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return { ref, width };
}

// ================================================================
// WRAPPERS
// ================================================================
function RadarChartWrapper({ data, players }: { data: any[]; players: Player[] }) {
  const { ref, width } = useContainerWidth<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="w-full"
      style={{
        height: CHART_HEIGHT,
        overflow: "hidden",
        contain: "layout paint",
      }}
    >
      {width > 0 && (
        <RadarChart
          width={width}
          height={CHART_HEIGHT}
          data={data}
          outerRadius="78%"
        >
          <PolarGrid stroke="#9ca3af" opacity={0.35} />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fontSize: 14, fontWeight: 600, fill: "#4b5563" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "#9ca3af", fontSize: 10 }}
          />
          {players.map((p, i) => (
            <Radar
              key={p.player_id}
              name={p.player_name}
              dataKey={p.player_name}
              stroke={COLORS[i]}
              fill={COLORS[i]}
              fillOpacity={0.3}
              isAnimationActive={false}
            />
          ))}
          <Legend
            wrapperStyle={{ fontSize: "13px", paddingTop: "8px" }}
          />
          <Tooltip
            formatter={(value: any) => `${Number(value).toFixed(0)}%`}
            contentStyle={{
              backgroundColor: "rgba(17, 24, 39, 0.95)",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontSize: "12px",
            }}
          />
        </RadarChart>
      )}
    </div>
  );
}

function BarChartWrapper({
  data,
  players,
  rawData,
}: {
  data: any[];
  players: Player[];
  rawData: any[];
}) {
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  void rawData;

  return (
    <div
      ref={ref}
      className="w-full"
      style={{
        height: CHART_HEIGHT,
        overflow: "hidden",
        contain: "layout paint",
      }}
    >
      {width > 0 && (
        <BarChart
          width={width}
          height={CHART_HEIGHT}
          data={data}
          margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" opacity={0.3} />
          <XAxis
            dataKey="metric"
            tick={{ fontSize: 13, fill: "#4b5563" }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            formatter={(value: any, name: any) => {
              const pct = Number(value).toFixed(0);
              // Look up raw value from rawData by metric + player
              return [`${pct}% (of 0-100 scale)`, name];
            }}
            contentStyle={{
              backgroundColor: "rgba(17, 24, 39, 0.95)",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "13px", paddingTop: "8px" }} />
          {players.map((p, i) => (
            <Bar
              key={p.player_id}
              dataKey={p.player_name}
              fill={COLORS[i]}
              isAnimationActive={false}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      )}
    </div>
  );
}

// ================================================================
// SIMILARITY BADGE
// ================================================================
function similarityBadge(pct: number) {
  if (pct >= 70) {
    return {
      emoji: "🟢",
      label: "High Similarity",
      color: "text-emerald-700 dark:text-emerald-300",
      bg: "bg-emerald-100 dark:bg-emerald-900/40",
    };
  }
  if (pct >= 40) {
    return {
      emoji: "🟡",
      label: "Moderate Similarity",
      color: "text-amber-700 dark:text-amber-300",
      bg: "bg-amber-100 dark:bg-amber-900/40",
    };
  }
  return {
    emoji: "🔴",
    label: "Low Similarity",
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-100 dark:bg-red-900/40",
  };
}

// ================================================================
// MAIN PAGE
// ================================================================
export default function PlayerComparisonPage() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comparedPlayers, setComparedPlayers] = useState<Player[]>([]);
  const [similarities, setSimilarities] = useState<Similarity[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const initialized = useRef(false);

  // Load players once
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/players/bulk`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAllPlayers(data || []);

        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const idsParam = params.get("ids");
          if (idsParam) {
            const ids = idsParam
              .split(",")
              .map(Number)
              .filter((x) => !isNaN(x));
            if (ids.length >= 2 && ids.length <= 4) {
              setSelectedIds(ids);
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError("Failed to load player data: " + msg);
      } finally {
        setLoadingPlayers(false);
      }
    };
    load();
  }, []);

  // Fetch comparison when selectedIds changes
  useEffect(() => {
    if (selectedIds.length < 2) {
      setComparedPlayers([]);
      setSimilarities([]);
      return;
    }

    let cancelled = false;

    const compare = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE}/players/compare?ids=${selectedIds.join(",")}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (cancelled) return;

        setComparedPlayers(data.players || []);
        setSimilarities(data.similarities || []);

        if (typeof window !== "undefined") {
          const newUrl = `/player-comparison?ids=${selectedIds.join(",")}`;
          window.history.replaceState({}, "", newUrl);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError("Failed to compare: " + msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    compare();

    return () => {
      cancelled = true;
    };
  }, [selectedIds]);

  const addPlayer = (id: number) => {
    if (selectedIds.includes(id)) return;
    if (selectedIds.length >= 4) return;
    setSelectedIds([...selectedIds, id]);
  };

  const removePlayer = (id: number) => {
    setSelectedIds(selectedIds.filter((x) => x !== id));
  };

  const copyLink = () => {
    const url = `${window.location.origin}/player-comparison?ids=${selectedIds.join(",")}`;
    navigator.clipboard.writeText(url);
    alert("Link disalin: " + url);
  };

  const comparisonKey = useMemo(
    () => comparedPlayers.map((p) => p.player_id).join("-"),
    [comparedPlayers]
  );

  // -------- RADAR DATA (0-100) --------
  const radarData = useMemo(() => {
    if (comparedPlayers.length === 0) return [];
    const metrics: (keyof Player)[] = ["goals", "assists", "shots", "passes", "xg", "xa"];
    const labels: Record<string, string> = {
      goals: "Goals",
      assists: "Assists",
      shots: "Shots",
      passes: "Passes",
      xg: "xG",
      xa: "xA",
    };

    const maxByMetric: Record<string, number> = {};
    metrics.forEach((m) => {
      maxByMetric[m as string] = Math.max(
        ...comparedPlayers.map((p) => Number(p[m]) || 0),
        1
      );
    });

    return metrics.map((m) => {
      const entry: any = { metric: labels[m as string] };
      comparedPlayers.forEach((p) => {
        entry[p.player_name] = Math.round(
          ((Number(p[m]) || 0) / maxByMetric[m as string]) * 100
        );
      });
      return entry;
    });
  }, [comparedPlayers]);

 // BAR DATA (0-100, NORMALIZED)
  const barDataNormalized = useMemo(() => {
    if (comparedPlayers.length === 0) return [];
    const metrics: { key: keyof Player; label: string }[] = [
      { key: "goals", label: "Goals" },
      { key: "assists", label: "Assists" },
      { key: "shots", label: "Shots" },
      { key: "passes", label: "Passes" },
      { key: "xg", label: "xG" },
      { key: "xa", label: "xA" },
    ];

    // Find max per metric among the compared players
    const maxByMetric: Record<string, number> = {};
    metrics.forEach((m) => {
      maxByMetric[m.key as string] = Math.max(
        ...comparedPlayers.map((p) => Number(p[m.key]) || 0),
        0.001
      );
    });

    return metrics.map((m) => {
      const entry: any = { metric: m.label };
      comparedPlayers.forEach((p) => {
        const val = Number(p[m.key]) || 0;
        entry[p.player_name] = Math.round(
          (val / maxByMetric[m.key as string]) * 100
        );
      });
      return entry;
    });
  }, [comparedPlayers]);

  const filteredPlayers = allPlayers
    .filter((p) => p.player_name.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => !selectedIds.includes(p.player_id))
    .slice(0, 20);

  if (loadingPlayers) {
    return (
      <main className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ChartSkeleton height={400} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          ← Back
        </Link>

        <div className="mt-2 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            🆚 Player Comparison
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Compare 2–4 players with radar chart, bar chart, and similarity score
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <p className="text-red-800 dark:text-red-300 text-sm">❌ {error}</p>
          </div>
        )}

        {/* ---- Selected Players (chip + team_name) ---- */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
            Selected Players ({selectedIds.length}/4)
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedIds.map((id, i) => {
              const p = allPlayers.find((x) => x.player_id === id);
              if (!p) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: COLORS[i] + "20",
                    color: COLORS[i],
                  }}
                >
                  <span>
                    {p.player_name}
                    {p.team_name && (
                      <span className="ml-1.5 text-xs opacity-75 font-normal">
                        · {p.team_name}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => removePlayer(id)}
                    className="hover:bg-black/10 rounded-full w-5 h-5 flex items-center justify-center"
                    aria-label={`Hapus ${p.player_name}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
            {selectedIds.length === 0 && (
              <span className="text-gray-400 dark:text-gray-500 text-sm">
                No players selected yet. Search below.
              </span>
            )}
          </div>

          {selectedIds.length >= 2 && (
            <button
              onClick={copyLink}
              className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              📋 Copy Comparison Link
            </button>
          )}
        </div>

        {/* ---- Search Players ---- */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
            Search Players
          </h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a player name..."
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
            {filteredPlayers.map((p) => (
              <button
                key={p.player_id}
                onClick={() => addPlayer(p.player_id)}
                disabled={selectedIds.length >= 4}
                className="text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-sm disabled:opacity-50"
              >
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {p.player_name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {p.team_name || "Unknown"} · ⚽ {p.goals}
                </div>
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="space-y-6">
            <ChartSkeleton height={400} />
            <ChartSkeleton height={400} />
          </div>
        )}

        {comparedPlayers.length >= 2 && !loading && (
          <>
            {/* ---- Radar Chart ---- */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
                📊 Radar Chart (Normalized 0–100)
              </h2>
              <RadarChartWrapper
                key={comparisonKey}
                data={radarData}
                players={comparedPlayers}
              />
            </div>

            {/* Bar Chart (NORMALIZED) */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  📈 Head-to-Head per Metric
                </h2>
                <span className="text-xs text-gray-400">
                  Scale 0–100 (per metric)
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                   Each metric is normalized 0–100 so comparison between metrics
                is balanced. 100 = best player in that metric (among
                those compared).
              </p>
              <BarChartWrapper
                key={`bar-${comparisonKey}`}
                data={barDataNormalized}
                players={comparedPlayers}
                rawData={barDataNormalized}
              />
            </div>

            {/* Similarity Matrix with interpretation */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
                🎯 Similarity Matrix
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {similarities.map((s, i) => {
                  const badge = similarityBadge(s.similarity_pct);
                  return (
                    <div
                      key={i}
                      className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {s.player_a} vs {s.player_b}
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.bg} ${badge.color}`}
                        >
                          {badge.emoji} {badge.label}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(s.similarity_pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 min-w-[52px] text-right">
                          {s.similarity_pct}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        Jarak Euclidean: {s.distance} (semakin kecil, semakin mirip)
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}