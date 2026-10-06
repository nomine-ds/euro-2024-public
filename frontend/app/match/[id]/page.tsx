"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "@/lib/api";

interface MatchSummary {
  match_id: number;
  home_team: string;
  away_team: string;
  home_goals: number;
  away_goals: number;
  total_goals: number;
  total_events: number;
  shots: number;
  passes: number;
  total_xG: number;
}

interface Event {
  event_id: string;
  match_id: number;
  timestamp: string;
  period: number;
  player_name: string | null;
  team_name: string | null;
  event_type: string;
  outcome: string | null;
  is_goal: boolean;
  card_type: string | null;
  x: number;
  y: number;
  has_360: boolean;
}

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params?.id as string;

  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!matchId) return;

    const load = async () => {
      try {
        const [summaryRes, eventsRes] = await Promise.all([
          fetch(`${API_BASE}/match/${matchId}/summary`),
          fetch(`${API_BASE}/events/${matchId}`),
        ]);

        if (!summaryRes.ok) throw new Error(`Summary HTTP ${summaryRes.status}`);
        if (!eventsRes.ok) throw new Error(`Events HTTP ${eventsRes.status}`);

        const summaryData = await summaryRes.json();
        const eventsData = await eventsRes.json();

        setSummary(summaryData);
        setEvents(eventsData || []);
      } catch (err: any) {
        const msg =
          err instanceof Error ? err.message : "Failed to load match data.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [matchId]);

  const filteredEvents =
    filter === "all"
      ? events
      : filter === "goals"
      ? events.filter((e) => e.is_goal)
      : filter === "cards"
      ? events.filter((e) => e.card_type)
      : events.filter((e) => e.event_type === filter);

 if (loading) {
  return (
    <main className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <MatchDetailSkeleton />
      </div>
    </main>
  );
}

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
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

  if (!summary) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-gray-500">
        Match not found.
      </div>
    );
  }

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          ← Back
        </Link>

        {/* Header Score */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 mt-4 mb-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-center">
              <div className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                {summary.home_team}
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white">
                {summary.home_goals} – {summary.away_goals}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Match ID: {summary.match_id}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                {summary.away_team}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Total Events
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {summary.total_events}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Shots
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {summary.shots}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">
             Passes
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {summary.passes}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Total xG
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {summary.total_xG?.toFixed(2) ?? "—"}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href={`/tactical/${matchId}`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            📊 Tactical
          </Link>
            <Link
    href={`/passnetwork/${matchId}`}
    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition"
  >
    🔗 Pass Network
  </Link>
          <Link
            href={`/ghost/${matchId}`}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
          >
            👻 Ghost
          </Link>
        </div>

        {/* Events Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Timeline Events ({filteredEvents.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All" },
                { key: "goals", label: "⚽ Goals" },
                { key: "cards", label: "🟨 Cards" },
                { key: "Shot", label: "🎪 Shots" },
                { key: "Pass", label: "🎾 Passes" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`text-xs px-3 py-1.5 rounded-full transition ${
                    filter === f.key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
            {filteredEvents.slice(0, 200).map((e) => (
              <li
                key={e.event_id}
                className="px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-12 text-xs text-gray-400 dark:text-gray-500">
                    {e.timestamp || "—"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {e.player_name || "—"}
                      </span>
                      {e.team_name && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({e.team_name})
                        </span>
                      )}
                      {e.is_goal && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-medium">
                          ⚽ GOL
                        </span>
                      )}
                      {e.card_type && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            e.card_type.includes("Red")
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                              : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                          }`}
                        >
                          {e.card_type.includes("Red") ? "🟥" : "🟨"}{" "}
                          {e.card_type}
                        </span>
                      )}
                      {e.has_360 && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                          📊 360
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {e.event_type}
                      {e.outcome && ` · ${e.outcome}`}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {filteredEvents.length > 200 && (
            <div className="px-6 py-3 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
              Showing 200 of {filteredEvents.length} events.
            </div>
          )}

          {filteredEvents.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              No events for this filter.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
function MatchDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header Score Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="flex justify-center">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
          <div className="flex justify-center">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
          <div className="flex justify-center">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center"
          >
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mx-auto mb-2"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
          </div>
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <div className="flex gap-2">
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-28"></div>
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-28"></div>
      </div>

      {/* Events Timeline Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
        </div>
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {[1, 2, 3, 4, 5].map((i) => (
            <li key={i} className="px-6 py-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}