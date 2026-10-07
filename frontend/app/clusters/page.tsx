// frontend/app/clusters/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CardGridSkeleton } from "@/components/Skeleton";
import { API_BASE } from "@/lib/api";

interface Player {
  player_id: number;
  player_name: string;
  goals: number;
  assists: number;
  shots: number;
  passes: number;
  xg: number;
  xa: number;
  cluster: number;
  cluster_label: string;
}

export default function ClustersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [nClusters, setNClusters] = useState(4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE}/players/clustering?n_clusters=${nClusters}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPlayers(data.players || []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [nClusters]);

  const grouped = new Map<string, Player[]>();
  players.forEach((p) => {
    const label = p.cluster_label || `Cluster ${p.cluster + 1}`;
    if (!grouped.has(label)) grouped.set(label, []);
    grouped.get(label)!.push(p);
  });

  const COLORS = [
    "bg-emerald-600",
    "bg-emerald-500",
    "bg-emerald-700",
    "bg-slate-700",
    "bg-slate-600",
    "bg-teal-600",
    "bg-cyan-700",
    "bg-emerald-800",
  ];

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          ← Back
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-2 text-gray-900 dark:text-white">
          Player Clustering
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Players grouped by playing style using K-Means
        </p>

        {/* Cluster count slider */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4 flex-wrap">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Cluster count:
          </label>
          <input
            type="range"
            min={2}
            max={8}
            value={nClusters}
            onChange={(e) => setNClusters(Number(e.target.value))}
            className="flex-1 max-w-xs accent-blue-600"
          />
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-bold text-sm">
            {nClusters}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {players.length} players
          </span>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <p className="text-red-800 dark:text-red-300 text-sm">❌ {error}</p>
          </div>
        )}

        {loading ? (
  <CardGridSkeleton cards={4} />
) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from(grouped.entries()).map(([label, list], idx) => (
              <div
                key={label}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
              >
                <div
                  className={`${
                    COLORS[idx % COLORS.length]
                  } px-5 py-4`}
                >
                  <h2 className="font-bold text-white text-lg">{label}</h2>
                  <p className="text-white/80 text-xs mt-0.5">
                    {list.length} players
                  </p>
                </div>

                <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700 border-b border-gray-100 dark:border-gray-700">
                  <div className="p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Avg Goals
                    </div>
                    <div className="font-bold text-gray-900 dark:text-white text-sm">
                      {(
                        list.reduce((a, p) => a + (p.goals || 0), 0) /
                        list.length
                      ).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Avg 🎯
                    </div>
                    <div className="font-bold text-gray-900 dark:text-white text-sm">
                      {(
                        list.reduce((a, p) => a + (p.assists || 0), 0) /
                        list.length
                      ).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Avg xG
                    </div>
                    <div className="font-bold text-gray-900 dark:text-white text-sm">
                      {(
                        list.reduce((a, p) => a + (p.xg || 0), 0) / list.length
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>

                <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
                  {list
                    .sort((a, b) => b.goals - a.goals)
                    .map((p) => (
                      <li key={p.player_id}>
                        <Link
                          href={`/player/${p.player_id}`}
                          className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                        >
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {p.player_name}
                          </span>
                          <span className="flex gap-2 text-xs shrink-0">
                            <span className="text-blue-600 dark:text-blue-400">
                              {p.goals} Goals
                            </span>
                            <span className="text-green-600 dark:text-green-400">
                              🎯 {p.assists}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}