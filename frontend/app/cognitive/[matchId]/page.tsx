// frontend/app/cognitive/[matchId]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

import { API_BASE } from "@/lib/api";

interface CognitiveEvent {
  event_id: string;
  player_name: string;
  team_name: string;
  event_type: string;
  minute: number;
  pressure: number;
  nearest_opponent_dist: number;
  outcome_score: number;
  decision_quality: number;
  label: string;
}

interface Summary {
  avg_dq: number;
  count_excellent: number;
  count_neutral: number;
  count_under_pressure: number;
  count_mistake: number;
  pct_excellent: number;
  pct_neutral: number;
  pct_under_pressure: number;
  pct_mistake: number;
}

interface CognitiveData {
  match_id: number;
  total_events_analyzed: number;
  events: CognitiveEvent[];
  summary: Summary;
}

type Filter = "all" | "excellent" | "neutral" | "under_pressure" | "mistake";

export default function CognitivePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [data, setData] = useState<CognitiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!matchId) return;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/cognitive/${matchId}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? `HTTP ${res.status}`);
        }
        setData(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [matchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-500">Loading Cognitive Mirror...</span>
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

  if (!data) return null;

  const filtered = data.events.filter(
    (e) => filter === "all" || e.label === filter
  );
  const s = data.summary;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline inline-block mb-6"
        >
          ← Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          🧠 Cognitive Mirror
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Decision Quality (DQ) analysis — quality of decisions under opponent
          pressure. Analyzed {data.total_events_analyzed} events.
        </p>

        {/* Summary — Avg DQ + 4 label cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Avg Decision Quality
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {s.avg_dq.toFixed(3)}
            </div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
            <div className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">
              🌟 Excellent
            </div>
            <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
              {s.count_excellent}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              {s.pct_excellent}%
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              ⚖️ Neutral
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              {s.count_neutral}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {s.pct_neutral}%
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
            <div className="text-xs text-red-700 dark:text-red-300 mb-1">
              😰 Under Pressure
            </div>
            <div className="text-2xl font-bold text-red-800 dark:text-red-200">
              {s.count_under_pressure}
            </div>
            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
              {s.pct_under_pressure}%
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
            <div className="text-xs text-amber-700 dark:text-amber-300 mb-1">
              ❌ Mistake
            </div>
            <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">
              {s.count_mistake}
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {s.pct_mistake}%
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <p className="text-blue-800 dark:text-blue-300 text-xs leading-relaxed">
            <strong>How to read:</strong>{" "}
            <span className="font-medium">🌟 Excellent</span> = successful
            decision under high pressure.{" "}
            <span className="font-medium">😰 Under Pressure</span> = failed
            decision under high pressure.{" "}
            <span className="font-medium">⚖️ Neutral</span> = routine success
            (no pressure).{" "}
            <span className="font-medium">❌ Mistake</span> = unforced error
            (failed with no pressure).
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(["all", "excellent", "neutral", "under_pressure", "mistake"] as Filter[]).map(
            (f) => {
              const labels: Record<Filter, string> = {
                all: `All (${data.total_events_analyzed})`,
                excellent: `🌟 Excellent (${s.count_excellent})`,
                neutral: `⚖️ Neutral (${s.count_neutral})`,
                under_pressure: `😰 Under Pressure (${s.count_under_pressure})`,
                mistake: `❌ Mistake (${s.count_mistake})`,
              };
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400"
                  }`}
                >
                  {labels[f]}
                </button>
              );
            }
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="text-right px-3 py-3 font-medium">Minute</th>
                  <th className="text-left px-3 py-3 font-medium">Player</th>
                  <th className="text-left px-3 py-3 font-medium">Type</th>
                  <th className="text-right px-3 py-3 font-medium">Pressure</th>
                  <th className="text-right px-3 py-3 font-medium">Nearest</th>
                  <th className="text-right px-3 py-3 font-medium">DQ</th>
                  <th className="text-left px-3 py-3 font-medium">Label</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((e) => {
                  const styleMap: Record<string, string> = {
                    excellent:
                      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300",
                    neutral:
                      "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
                    under_pressure:
                      "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
                    mistake:
                      "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
                  };
                  const textMap: Record<string, string> = {
                    excellent: "🌟 Excellent",
                    neutral: "⚖️ Neutral",
                    under_pressure: "😰 Under Pressure",
                    mistake: "❌ Mistake",
                  };
                  const labelStyle = styleMap[e.label] ?? styleMap.neutral;
                  const labelText = textMap[e.label] ?? e.label;
                  return (
                    <tr
                      key={e.event_id}
                      className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-3 py-2 text-right font-mono text-gray-500 dark:text-gray-400">
                        {e.minute}&apos;
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-gray-900 dark:text-white">
                          {e.player_name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {e.team_name}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {e.event_type}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                        {e.pressure.toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-500 dark:text-gray-400">
                        {e.nearest_opponent_dist.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                        {e.decision_quality.toFixed(3)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${labelStyle}`}
                        >
                          {labelText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">
              No events with this label.
            </p>
          )}
          {filtered.length > 200 && (
            <div className="px-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
              Showing 200 of {filtered.length} events.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}