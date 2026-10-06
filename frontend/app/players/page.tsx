// frontend/app/players/page.tsx
"use client";
import { TableSkeleton } from "@/components/Skeleton";
import { useState, useEffect } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";

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
}

type SortKey = "goals" | "assists" | "shots" | "passes" | "xg" | "xa";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("goals");

  useEffect(() => {
    const load = async () => {
      try {
        console.log("🔄 Loading players from", `${API_BASE}/players/bulk`);
        const res = await fetch(`${API_BASE}/players/bulk`);
        console.log("📡 Response status:", res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log("✅ Loaded players:", data.length, "items");
        setPlayers(Array.isArray(data) ? data : []);
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : "Failed to load player data.";
        console.error("❌ Error:", msg);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const teams = Array.from(
    new Set(players.map((p) => p.team_name).filter(Boolean))
  ).sort() as string[];

  const filtered = players
    .filter((p) =>
      p.player_name.toLowerCase().includes(search.toLowerCase())
    )
    .filter((p) => (teamFilter ? p.team_name === teamFilter : true))
    .sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));

  if (loading) {
  return (
    <main className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="mt-2 h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <TableSkeleton rows={12} />
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
            👤 Euro 2024 Players
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {players.length} players • {teams.length} teams
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <p className="text-red-800 dark:text-red-300 text-sm">❌ {error}</p>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Search Players
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Player name..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Filter Team
              </label>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Teams</option>
                {teams.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Urutkan
              </label>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="goals">⚽ Goals</option>
                <option value="assists">🎯 Assists</option>
                <option value="shots">🎪 Shots</option>
                <option value="passes">🎾 Passes</option>
                <option value="xg">📊 xG</option>
                <option value="xa">🎨 xA</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3 text-right">⚽</th>
                  <th className="px-4 py-3 text-right">🎯</th>
                  <th className="px-4 py-3 text-right">🎪</th>
                  <th className="px-4 py-3 text-right">🎾</th>
                  <th className="px-4 py-3 text-right">xG</th>
                  <th className="px-4 py-3 text-right">xA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.slice(0, 100).map((p, idx) => (
                  <tr
                    key={p.player_id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <td className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      <Link
                        href={`/player/${p.player_id}`}
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition"
                      >
                        {p.player_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {p.team_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                      {p.goals || 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                      {p.assists || 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                      {p.shots || 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                      {p.passes || 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                      {(p.xg || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                      {(p.xa || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
              No players match the current filter.
            </div>
          )}

          {filtered.length > 100 && (
            <div className="px-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
              Showing 100 of {filtered.length} players.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}