// frontend/app/counterfactual/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";

interface Match {
  match_id: number;
  home_team: string;
  away_team: string;
  date: string;
}

interface Event {
  event_id: string;
  player_name: string;
  team_name: string;
  event_type: string;
  outcome: string | null;
  is_goal: boolean;
  timestamp: string;
}

interface OriginalResult {
  action: string;
  mean_xg: number;
  probability_goal: number;
}

interface SimulationDetails {
  base_xg: number;
  mean_xg: number;
  std_xg: number;
  percentile_25: number;
  percentile_75: number;
  probability_goal: number;
  n_simulations: number;
}

interface SimulationResult {
  match_id: number;
  event_id: string;
  original: OriginalResult;
  alternative: OriginalResult;
  delta_xg: number;
  delta_percent: number;
  simulation_details?: SimulationDetails;
  message: string;
}

const ALTERNATIVES = [
  { value: "pass", label: "🎾 Pass", desc: "Pass to a teammate" },
  { value: "dribble", label: "🏃 Dribble", desc: "Carry the ball yourself" },
  { value: "cross", label: "📤 Cross", desc: "Cross into the box" },
  { value: "through_ball", label: "⚡ Through Ball", desc: "Through ball into space" },
];

export default function CounterfactualPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | "">("");
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [alternative, setAlternative] = useState("pass");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch matches once on mount; no dependencies by design
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/matches`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMatches(data || []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError("Failed to load matches: " + msg);
      } finally {
        setLoadingMatches(false);
      }
    };
    load();
  }, []);

  // Load events when match changes
  useEffect(() => {
    if (!selectedMatchId) {
      setEvents([]);
      setSelectedEvent(null);
      setResult(null);
      return;
    }

    const load = async () => {
      setLoadingEvents(true);
      setSelectedEvent(null);
      setResult(null);
      try {
        const res = await fetch(
          `${API_BASE}/events/${selectedMatchId}?event_type=Shot`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // Keep goals on top so key moments are visible first
        const sorted = (data || []).sort((a: Event, b: Event) => {
          if (a.is_goal !== b.is_goal) return a.is_goal ? -1 : 1;
          return (a.timestamp || "").localeCompare(b.timestamp || "");
        });
        setEvents(sorted);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError("Failed to load events: " + msg);
      } finally {
        setLoadingEvents(false);
      }
    };
    load();
  }, [selectedMatchId]);

  const simulate = async () => {
    if (!selectedMatchId || !selectedEvent) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(
        `${API_BASE}/counterfactual/simulate?match_id=${selectedMatchId}&event_id=${selectedEvent.event_id}&alternative=${alternative}`
      );
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (ts: string) => {
    if (!ts) return "—";
    // Format: "HH:MM:SS.mmm"
    const parts = String(ts).split(":");
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
    return ts;
  };

  const formatNumber = (val: unknown) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          ← Back
        </Link>

        <div className="mt-2 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            🧠 Counterfactual Engine
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Select match → select moment → see what happens if action differed
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <p className="text-red-800 dark:text-red-300 text-sm">❌ {error}</p>
          </div>
        )}

        {/* Step 1 — Select Match */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              1
            </span>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Select Match
            </h2>
          </div>

          <select
            value={selectedMatchId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedMatchId(val ? Number(val) : "");
            }}
            disabled={loadingMatches || matches.length === 0}
            aria-label="Select match"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
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

          {!loadingMatches && matches.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              ⚠️ No matches available.
            </p>
          )}
        </div>

        {/* Step 2 — Select Moment */}
        {selectedMatchId && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                2
              </span>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Select Key Moment
              </h2>
              <span className="text-xs text-gray-500 ml-auto">
                {events.length} shots
              </span>
            </div>

            {loadingEvents ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2 text-sm">Loading moments...</p>
              </div>
            ) : events.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">
                No shots in this match.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                {events.map((ev) => (
                  <button
                    key={ev.event_id}
                    onClick={() => {
                      setSelectedEvent(ev);
                      setResult(null);
                    }}
                    className={`text-left px-4 py-3 rounded-lg border transition ${
                      selectedEvent?.event_id === ev.event_id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {ev.player_name || "Unknown"}
                      </div>
                      {ev.is_goal && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-medium shrink-0">
                          ⚽ GOAL
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                      <span>{ev.team_name || "—"}</span>
                      <span>•</span>
                      <span>{formatTimestamp(ev.timestamp)}</span>
                      {ev.outcome && !ev.is_goal && (
                        <>
                          <span>•</span>
                          <span>{ev.outcome}</span>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Select Alternative */}
        {selectedEvent && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                3
              </span>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                What if the action differed?
              </h2>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Selected moment:
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedEvent.player_name} ({selectedEvent.team_name}) —{" "}
                {formatTimestamp(selectedEvent.timestamp)}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {ALTERNATIVES.map((alt) => (
                <button
                  key={alt.value}
                  onClick={() => setAlternative(alt.value)}
                  aria-pressed={alternative === alt.value}
                  className={`px-3 py-3 rounded-lg text-sm font-medium transition border ${
                    alternative === alt.value
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <div>{alt.label}</div>
                  <div
                    className={`text-xs mt-1 ${
                      alternative === alt.value
                        ? "text-blue-100"
                        : "text-gray-500 dark:text-gray-500"
                    }`}
                  >
                    {alt.desc}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={simulate}
              disabled={loading}
              aria-label="Run counterfactual simulation"
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
            >
              {loading ? "⏳ Simulating..." : "🧠 Run Simulation"}
            </button>
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
                📊 Simulation Results
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {result.message}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="text-xs text-blue-600 dark:text-blue-400 uppercase font-medium mb-2">
                    🎯 World A (Actual)
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {formatNumber(result.original?.mean_xg).toFixed(3)}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Goal Probability:{" "}
                    {Math.round(formatNumber(result.original?.probability_goal) * 100)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Action: <strong>{result.original?.action ?? "—"}</strong>
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-medium mb-2">
                    🔮 World B (Alternative)
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {formatNumber(result.alternative?.mean_xg).toFixed(3)}
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    Goal Probability:{" "}
                    {Math.round(formatNumber(result.alternative?.probability_goal) * 100)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Action: <strong>{result.alternative?.action ?? "—"}</strong>
                  </div>
                </div>
              </div>

              <div
                className={`mt-4 p-4 rounded-lg border ${
                  result.delta_xg > 0
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : result.delta_xg < 0
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                    : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="text-sm font-medium">
                  {result.delta_xg > 0
                    ? "📈 Better"
                    : result.delta_xg < 0
                    ? "📉 Worse"
                    : "➖ Unchanged"}{" "}
                  — ΔxG:{" "}
                  <span
                    className={`text-lg font-bold ${
                      result.delta_xg > 0
                        ? "text-green-700 dark:text-green-300"
                        : result.delta_xg < 0
                        ? "text-red-700 dark:text-red-300"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {result.delta_xg > 0 ? "+" : ""}
                    {formatNumber(result.delta_xg).toFixed(3)}
                  </span>{" "}
                  <span className="text-gray-500">
                    ({result.delta_percent > 0 ? "+" : ""}
                    {formatNumber(result.delta_percent).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            {result.simulation_details ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
                  📈 Monte Carlo Details (
                  {result.simulation_details.n_simulations ?? "—"} simulations)
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Mean xG
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {result.simulation_details.mean_xg ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Std Dev
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {result.simulation_details.std_xg ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Percentile 25
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {result.simulation_details.percentile_25 ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Percentile 75
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {result.simulation_details.percentile_75 ?? "—"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-blue-800 dark:text-blue-300 text-sm">
                  ℹ️ Monte Carlo details not available. The simulation result
                  above is sufficient.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}