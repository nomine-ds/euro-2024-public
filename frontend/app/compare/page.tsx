// frontend/app/compare/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";

interface Team {
  team_id: number;
  team_name: string;
}

interface TeamStats {
  team_id: number;
  team_name: string;
  goals: number;
  shots: number;
  passes: number;
  xG: number;
  tackles: number;
  interceptions: number;
  clearances: number;
}

export default function ComparePage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [team1, setTeam1] = useState<number | "">("");
  const [team2, setTeam2] = useState<number | "">("");
  const [comparison, setComparison] = useState<TeamStats[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [error, setError] = useState<string | null>(null);

 // Load teams list — instantly from cache
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await fetch(`${API_BASE}/teams`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setTeams(Array.isArray(data) ? data : []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError("Failed to load teams: " + msg);
      } finally {
        setLoadingTeams(false);
      }
    };
    loadTeams();
  }, []);

  const handleCompare = async () => {
    if (!team1 || !team2) return;
    if (team1 === team2) {
      setError("Please pick two different teams.");
      setComparison(null);
      return;
    }
    setLoading(true);
    setError(null);
    setComparison(null);

    try {
      const res = await fetch(
        `${API_BASE}/compare/teams?team_ids=${team1},${team2}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setComparison([data.team_a, data.team_b]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError("Failed to compare: " + msg);
    } finally {
      setLoading(false);
    }
  };

  // Auto-trigger when both teams selected
  useEffect(() => {
    if (team1 && team2) handleCompare();
  }, [team1, team2]);

  const metrics: { key: keyof TeamStats; label: string }[] = [
    { key: "goals", label: "Goals" },
    { key: "shots", label: "Shots" },
    { key: "passes", label: "Passes" },
    { key: "xG", label: "xG" },
    { key: "tackles", label: "Tackles" },
    { key: "interceptions", label: "Interceptions" },
    { key: "clearances", label: "Clearances" },
  ];

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          ← Back
        </Link>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2 mb-2 text-gray-900 dark:text-white">
          ⚔️ Team Comparison
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Compare two teams head-to-head
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-5 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Team 1
              </label>
              <select
                value={team1}
                onChange={(e) =>
                  setTeam1(e.target.value ? Number(e.target.value) : "")
                }
                disabled={loadingTeams}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  {loadingTeams ? "-- Loading... --" : "-- Select Team 1 --"}
                </option>
                {teams.map((t) => (
                  <option key={t.team_id} value={t.team_id}>
                    {t.team_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-center text-2xl font-bold text-gray-300 dark:text-gray-600 pb-1">
              VS
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Team 2
              </label>
              <select
                value={team2}
                onChange={(e) =>
                  setTeam2(e.target.value ? Number(e.target.value) : "")
                }
                disabled={loadingTeams}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  {loadingTeams ? "-- Loading... --" : "-- Select Team 2 --"}
                </option>
                {teams.map((t) => (
                  <option key={t.team_id} value={t.team_id}>
                    {t.team_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {teams.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              {teams.length} teams available
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <p className="text-red-800 dark:text-red-300 text-sm">⚠️ {error}</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-3 text-sm">Comparing...</p>
          </div>
        )}

        {comparison && comparison.length === 2 && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <div className="p-4 text-right font-bold text-gray-900 dark:text-white text-sm md:text-base">
                {comparison[0].team_name}
              </div>
              <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">
                Statistik
              </div>
              <div className="p-4 text-left font-bold text-gray-900 dark:text-white text-sm md:text-base">
                {comparison[1].team_name}
              </div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {metrics.map((metric) => {
                const valA = (comparison[0][metric.key] as number) || 0;
                const valB = (comparison[1][metric.key] as number) || 0;
                const maxVal = Math.max(valA, valB, 0.01);
                const pctA = (valA / maxVal) * 100;
                const pctB = (valB / maxVal) * 100;
                const aWins = valA > valB;
                const bWins = valB > valA;
                const isDecimal = metric.key === "xG";

                return (
                  <div key={metric.key} className="grid grid-cols-3 items-center">
                    <div className="p-4">
                      <div
                        className={`text-right font-semibold ${
                          aWins
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {valA.toFixed(isDecimal ? 2 : 0)}
                      </div>
                      <div className="mt-1.5 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex justify-end">
                        <div
                          className={`h-full rounded-full ${
                            aWins
                              ? "bg-blue-500"
                              : "bg-gray-400 dark:bg-gray-500"
                          }`}
                          style={{ width: `${pctA}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-4 text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {metric.label}
                      </div>
                    </div>
                    <div className="p-4">
                      <div
                        className={`text-left font-semibold ${
                          bWins
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {valB.toFixed(isDecimal ? 2 : 0)}
                      </div>
                      <div className="mt-1.5 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            bWins
                              ? "bg-slate-500"
                              : "bg-gray-400 dark:bg-gray-500"
                          }`}
                          style={{ width: `${pctB}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}