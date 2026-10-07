"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface PlayerSummary {
  player_id: number;
  player_name: string;
  team_name: string | null;
  goals: number;
  assists: number;
  shots: number;
  passes: number;
  xG: number;
  xA: number;
}

interface BulkPlayer {
  player_id: number;
  player_name: string;
  team_name: string | null;
  goals: number;
  assists: number;
  shots: number;
  passes: number;
  xg: number;
  xa: number;
}

interface MatchBreakdown {
  match_id: number;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  goals: number;
  assists: number;
  shots: number;
  passes: number;
  xg: number;
  xa: number;
}

interface BreakdownData {
  player_id: number;
  total_matches: number;
  matches: MatchBreakdown[];
}

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const playerId = id;

  const [summary, setSummary] = useState<PlayerSummary | null>(null);
  const [allPlayers, setAllPlayers] = useState<BulkPlayer[]>([]);
  const [breakdown, setBreakdown] = useState<BreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) return;

    const load = async () => {
      try {
        const [summaryRes, bulkRes, breakdownRes] = await Promise.all([
          fetch(`${API_BASE}/player/${playerId}/summary`),
          fetch(`${API_BASE}/players/bulk`),
          fetch(`${API_BASE}/player/${playerId}/breakdown`),
        ]);

        if (!summaryRes.ok) throw new Error(`Summary HTTP ${summaryRes.status}`);

        const summaryData = await summaryRes.json();
        setSummary(summaryData);

        if (bulkRes.ok) {
          const bulkData = await bulkRes.json();
          setAllPlayers(bulkData || []);
        }

        if (breakdownRes.ok) {
          const breakdownData = await breakdownRes.json();
          setBreakdown(breakdownData);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load player data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [playerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-500">Loading player data...</span>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-4xl mx-auto bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800">
          <p className="text-red-800 dark:text-red-300">
            ❌ {error || "Player not found."}
          </p>
          <Link
            href="/players"
            className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Player List
          </Link>
        </div>
      </div>
    );
  }

  // ---- Compute average & max for comparison ----
  const n = allPlayers.length || 1;
  const avg = {
    goals: allPlayers.reduce((s, p) => s + (p.goals || 0), 0) / n,
    assists: allPlayers.reduce((s, p) => s + (p.assists || 0), 0) / n,
    shots: allPlayers.reduce((s, p) => s + (p.shots || 0), 0) / n,
    passes: allPlayers.reduce((s, p) => s + (p.passes || 0), 0) / n,
    xg: allPlayers.reduce((s, p) => s + (p.xg || 0), 0) / n,
    xa: allPlayers.reduce((s, p) => s + (p.xa || 0), 0) / n,
  };

  const max = {
    goals: Math.max(...allPlayers.map((p) => p.goals || 0), 1),
    assists: Math.max(...allPlayers.map((p) => p.assists || 0), 1),
    shots: Math.max(...allPlayers.map((p) => p.shots || 0), 1),
    passes: Math.max(...allPlayers.map((p) => p.passes || 0), 1),
    xg: Math.max(...allPlayers.map((p) => p.xg || 0), 1),
    xa: Math.max(...allPlayers.map((p) => p.xa || 0), 1),
  };

  // ---- Data radar chart ----
  const radarData = [
    { metric: "Goals", player: (summary.goals / max.goals) * 100, avg: (avg.goals / max.goals) * 100 },
    { metric: "Assists", player: (summary.assists / max.assists) * 100, avg: (avg.assists / max.assists) * 100 },
    { metric: "Shots", player: (summary.shots / max.shots) * 100, avg: (avg.shots / max.shots) * 100 },
    { metric: "Passes", player: (summary.passes / max.passes) * 100, avg: (avg.passes / max.passes) * 100 },
    { metric: "xG", player: (summary.xG / max.xg) * 100, avg: (avg.xg / max.xg) * 100 },
    { metric: "xA", player: (summary.xA / max.xa) * 100, avg: (avg.xa / max.xa) * 100 },
  ];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/players"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          ← Back to Player List
        </Link>

        {/* Header */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 md:p-8 mt-4 mb-6 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-300 text-3xl font-bold flex-shrink-0">
              {summary.player_name?.charAt(0) || "?"}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {summary.player_name}
              </h1>
              {summary.team_name && (
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  🏟️ {summary.team_name}
                </p>
              )}
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                Player ID: {summary.player_id}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/player-comparison?ids=${summary.player_id}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
              >
                ⚖️ Compare
              </Link>
            </div>
          </div>
        </div>

        {/* Stat Cards dengan mini bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="⚽ Goals"
            value={summary.goals}
            avg={avg.goals}
            max={max.goals}
            color="text-blue-600 dark:text-blue-400"
            barColor="bg-blue-500"
          />
          <StatCard
            label="🎯 Assists"
            value={summary.assists}
            avg={avg.assists}
            max={max.assists}
            color="text-emerald-600 dark:text-emerald-400"
            barColor="bg-emerald-500"
          />
          <StatCard
            label="🎪 Shots"
            value={summary.shots}
            avg={avg.shots}
            max={max.shots}
            color="text-emerald-600 dark:text-emerald-400"
            barColor="bg-slate-500"
          />
          <StatCard
            label="⚡ Passes"
            value={summary.passes}
            avg={avg.passes}
            max={max.passes}
            color="text-orange-600 dark:text-orange-400"
            barColor="bg-orange-500"
          />
        </div>

        {/* xG / xA */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Expected Goals (xG)
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {summary.xG.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Average: {avg.xg.toFixed(2)}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Expected Assists (xA)
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {summary.xA.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Average: {avg.xa.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            📊 Profile vs Player Average
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#9ca3af" opacity={0.3} />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                />
                <Radar
                  name={summary.player_name}
                  dataKey="player"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.5}
                />
                <Radar
                  name="Average"
                  dataKey="avg"
                  stroke="#9ca3af"
                  fill="#9ca3af"
                  fillOpacity={0.25}
                />
                <Legend />
                <Tooltip
                  formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                  contentStyle={{
                    backgroundColor: "rgba(17, 24, 39, 0.95)",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "12px",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Scale 0–100% of the maximum value among all players.
          </p>
        </div>

        {/* Breakdown per match */}
        {breakdown && breakdown.matches.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                📅 Performance Per Match ({breakdown.total_matches} match)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Match</th>
                    <th className="text-right px-3 py-3 font-medium">Score</th>
                    <th className="text-right px-3 py-3 font-medium">⚽</th>
                    <th className="text-right px-3 py-3 font-medium">🎯</th>
                    <th className="text-right px-3 py-3 font-medium">🎪</th>
                    <th className="text-right px-3 py-3 font-medium">⚡</th>
                    <th className="text-right px-3 py-3 font-medium">xG</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.matches.map((m) => (
                    <tr
                      key={m.match_id}
                      className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-2">
                        <Link
                          href={`/match/${m.match_id}`}
                          className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {m.home_team} vs {m.away_team}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                        {m.home_score} – {m.away_score}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                        {m.goals}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                        {m.assists}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-500 dark:text-gray-400">
                        {m.shots}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-500 dark:text-gray-400">
                        {m.passes}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-500 dark:text-gray-400">
                        {m.xg.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ringkasan */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
            📋 Performance Summary
          </h2>
          <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
            <li>
              ⚽ {summary.goals} goals from {summary.shots} shots (
              {summary.shots > 0
                ? ((summary.goals / summary.shots) * 100).toFixed(0)
                : 0}
              % conversion).
            </li>
            <li>
              🎯 {summary.assists} assists from {summary.passes} passes.
            </li>
            <li>
              📊 xG: {summary.xG.toFixed(2)} · xA: {summary.xA.toFixed(2)}
              {summary.xG > avg.xg && (
                <span className="ml-2 text-emerald-600 dark:text-emerald-400 text-xs">
                  ↑ above average
                </span>
              )}
            </li>
          </ul>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            Data from all Euro 2024 matches.
          </p>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  avg,
  max,
  color,
  barColor,
}: {
  label: string;
  value: number;
  avg: number;
  max: number;
  color: string;
  barColor: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const avgPct = max > 0 ? (avg / max) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="mt-2 relative h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        ></div>
        <div
          className="absolute top-0 h-full w-0.5 bg-gray-400 dark:bg-gray-500"
          style={{ left: `${Math.min(avgPct, 100)}%` }}
          title={`Average: ${avg.toFixed(1)}`}
        ></div>
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        Average: {avg.toFixed(1)}
      </div>
    </div>
  );
}