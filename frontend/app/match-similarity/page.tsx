// frontend/app/match-similarity/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";

interface Match {
  match_id: number;
  home_team: string;
  away_team: string;
  date?: string;
}

interface SimilarMatch {
  match_id: number;
  distance: number;
  stats: {
    total_goals: number;
    total_shots: number;
    total_passes: number;
    total_xg: number;
  };
}

export default function MatchSimilarityPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [similarMatches, setSimilarMatches] = useState<SimilarMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load matches list
  useEffect(() => {
    const loadMatches = async () => {
      try {
        const res = await fetch(`${API_BASE}/matches`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMatches(Array.isArray(data) ? data : []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to load matches: ${msg}`);
      } finally {
        setLoadingMatches(false);
      }
    };
    loadMatches();
  }, []);

  // Find similar matches when a match is selected
  useEffect(() => {
    if (!selectedMatchId) {
      setSimilarMatches([]);
      return;
    }

    const findSimilar = async () => {
      setLoadingSimilar(true);
      setError(null);
      setSimilarMatches([]);

      try {
        const res = await fetch(
          `${API_BASE}/matches/similar/${selectedMatchId}?top_n=5`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSimilarMatches(data.similar_matches || []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to find similar matches: ${msg}`);
      } finally {
        setLoadingSimilar(false);
      }
    };

    findSimilar();
  }, [selectedMatchId]);

  const getMatch = (id: number) => matches.find((m) => m.match_id === id);
  const selectedMatch = selectedMatchId ? getMatch(selectedMatchId) : null;

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          ← Back
        </Link>

        <h1 className="text-3xl font-bold mt-2 mb-2 text-gray-900 dark:text-white">
          Match Similarity
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Find the most similar matches to the one you selected.
        </p>

        {/* Debug Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 text-xs text-blue-800 dark:text-blue-300">
          Total matches loaded: <strong>{matches.length}</strong>
          {loadingMatches && " (loading...)"}
        </div>

        {/* Match selector */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Match
          </label>
          <select
            value={selectedMatchId || ""}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedMatchId(val ? parseInt(val) : null);
            }}
            disabled={loadingMatches}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">
              {loadingMatches ? "-- Loading... --" : "-- Select Match --"}
            </option>
            {matches.map((m) => (
              <option key={m.match_id} value={m.match_id}>
                {m.home_team} vs {m.away_team}
              </option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-xl mb-6 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Loading Similar */}
        {loadingSimilar && (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 animate-pulse"
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          </div>
        </div>
      </div>
    ))}
  </div>
)}

        {/* Similar results */}
        {!loadingSimilar && similarMatches.length > 0 && selectedMatch && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Referensi: {selectedMatch.home_team} vs {selectedMatch.away_team}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Top 5 matches with most similar statistical patterns
              </p>
            </div>

            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {similarMatches.map((s, idx) => {
                const m = getMatch(s.match_id);
                return (
                  <li key={s.match_id}>
                    <Link
                      href={`/match/${s.match_id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {m
                            ? `${m.home_team} vs ${m.away_team}`
                            : `Match ${s.match_id}`}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Jarak statistik:{" "}
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {typeof s.distance === "number"
                              ? s.distance.toFixed(2)
                              : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="hidden sm:grid grid-cols-4 gap-3 text-xs text-center">
                        <div>
                          <div className="text-gray-500 text-xs font-medium">Goals</div>
                          <div className="font-medium text-gray-700 dark:text-gray-300">
                            {s.stats?.total_goals ?? "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs font-medium">Shots</div>
                          <div className="font-medium text-gray-700 dark:text-gray-300">
                            {s.stats?.total_shots ?? "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs font-medium">Passes</div>
                          <div className="font-medium text-gray-700 dark:text-gray-300">
                            {s.stats?.total_passes ?? "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs font-medium">xG</div>
                          <div className="font-medium text-gray-700 dark:text-gray-300">
                            {typeof s.stats?.total_xg === "number"
                              ? s.stats.total_xg.toFixed(2)
                              : "—"}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Empty state message */}
        {!loadingSimilar &&
          !error &&
          selectedMatchId &&
          similarMatches.length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
              <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                No similar matches found.
              </p>
            </div>
          )}
      </div>
    </main>
  );
}