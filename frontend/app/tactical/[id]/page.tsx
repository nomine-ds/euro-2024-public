// frontend/app/tactical/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const XgRollingChart = dynamic(
  () =>
    import("@/components/charts/TacticalCharts").then((m) => ({
      default: m.XgRollingChart,
    })),
  { ssr: false },
);

const PpdaChart = dynamic(
  () =>
    import("@/components/charts/TacticalCharts").then((m) => ({
      default: m.PpdaChart,
    })),
  { ssr: false },
);

const FieldTiltChart = dynamic(
  () =>
    import("@/components/charts/TacticalCharts").then((m) => ({
      default: m.FieldTiltChart,
    })),
  { ssr: false },
);

import { API_BASE } from "@/lib/api";

interface ChangePoint {
  minute: number;
  index: number;
  xg_before: number;
  xg_after: number;
}

interface RollingData {
  bins: number[];
  xg_rolling: number[];
  ppda_rolling: (number | null)[];
  field_tilt_rolling: number[];
  window_minutes: number;
}

interface TacticalData {
  match_id: number;
  change_points: ChangePoint[];
  rolling_data: RollingData | null;
  pen_used?: number;
  detection_method?: string;
  message: string;
}

interface ChartRow {
  minute: number;
  xg: number;
  ppda: number | null;
  field_tilt: number;
}

export default function TacticalPage() {
  const { id } = useParams<{ id: string }>();
  const matchId = id;

  const [data, setData] = useState<TacticalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/tactical/${matchId}`);
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

  const chartRows: ChartRow[] = useMemo(() => {
    const rd = data?.rolling_data;
    if (!rd || !rd.bins) return [];
    return rd.bins.map((b, i) => ({
      minute: b,
      xg: Number(rd.xg_rolling[i] ?? 0),
      ppda: rd.ppda_rolling[i] === null ? null : Number(rd.ppda_rolling[i]),
      field_tilt: Number(rd.field_tilt_rolling[i] ?? 0.5),
    }));
  }, [data]);

  const stats = useMemo(() => {
    if (!data || chartRows.length === 0) return null;
    const xgs = chartRows.map((r) => r.xg);
    const ppdas = chartRows
      .map((r) => r.ppda)
      .filter((v): v is number => v !== null);
    const fts = chartRows.map((r) => r.field_tilt);
    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    return {
      totalXG: xgs.reduce((s, v) => s + v, 0),
      peakXG: xgs.length ? Math.max(...xgs) : 0,
      avgPPDA: avg(ppdas),
      avgFieldTilt: avg(fts),
      totalChangePoints: data.change_points.length,
    };
  }, [data, chartRows]);

  const narrative = useMemo(() => {
    if (!data) return [];
    return data.change_points.map((cp) => {
      const delta = cp.xg_after - cp.xg_before;
      let tone: "up" | "down" | "neutral" = "neutral";
      let text = "";
      if (delta >= 0.15) {
        tone = "up";
        text = `Tempo increased — xG up ${delta.toFixed(3)}`;
      } else if (delta <= -0.15) {
        tone = "down";
        text = `Tempo decreased — xG down ${Math.abs(delta).toFixed(3)}`;
      } else {
        tone = "neutral";
        text = `Minor shift — ΔxG ${delta >= 0 ? "+" : ""}${delta.toFixed(3)}`;
      }
      return { ...cp, tone, text, delta };
    });
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-500">Loading Tactical Timeline...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-4xl mx-auto bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800">
          <p className="text-red-800 dark:text-red-300">❌ {error}</p>
          <Link
            href={`/match/${matchId}`}
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            ← Back to Match Detail
          </Link>
        </div>
      </div>
    );
  }

  if (!data || !data.rolling_data || chartRows.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-4xl mx-auto bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-300">
            ⚠️ {data?.message ?? "Not enough rolling data for this match."}
          </p>
          <Link
            href={`/match/${matchId}`}
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            ← Back to Match Detail
          </Link>
        </div>
      </div>
    );
  }

  const windowMin = data.rolling_data.window_minutes || 5;
  const changeMinutes = data.change_points.map((cp) => cp.minute);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href={`/match/${matchId}`}
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          ← Back to Match Detail
        </Link>

        <div className="mt-2 mb-6">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
            📜 Tactical Timeline
          </h1>
          <p className="text-gray-500 dark:text-gray-500 mt-1 text-sm">
            Match-level aggregate across both teams — {windowMin}-minute
            rolling window. Multivariate change-point detection (PELT) on
            xG / PPDA / Field Tilt.
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Total xG"
              value={stats.totalXG.toFixed(2)}
              color="text-rose-600 dark:text-rose-400"
            />
            <StatCard
              label="Peak xG / bin"
              value={stats.peakXG.toFixed(2)}
              color="text-orange-600 dark:text-orange-400"
            />
            <StatCard
              label="Avg PPDA"
              value={stats.avgPPDA.toFixed(1)}
              color="text-blue-600 dark:text-blue-400"
              hint="Lower = more aggressive pressing"
            />
            <StatCard
              label="Tempo shifts"
              value={String(stats.totalChangePoints)}
              color="text-emerald-600 dark:text-emerald-400"
            />
          </div>
        )}

        {/* xG rolling */}
        <ChartCard
          title="xG Rolling"
          subtitle="Sum of expected goals in 5-minute window (both teams)"
          color="#e11d48"
        >
          <XgRollingChart data={chartRows} changeMinutes={changeMinutes} />
        </ChartCard>

        {/* PPDA */}
        <ChartCard
          title="PPDA"
          subtitle="Passes per defensive action. Lower = more aggressive pressing. Gaps = no defensive actions in that window."
          color="#2563eb"
        >
          <PpdaChart data={chartRows} changeMinutes={changeMinutes} />
        </ChartCard>

        {/* Field Tilt */}
        <ChartCard
          title="Field Tilt"
          subtitle="Share of final-third vs defensive-third passes. 0.5 = neutral. Higher = more dominant."
          color="#10b981"
        >
          <FieldTiltChart data={chartRows} changeMinutes={changeMinutes} />
        </ChartCard>

        {/* Narrative */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 mt-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            Match Narrative — Tempo Shifts
          </h2>

          {narrative.length === 0 && (
            <p className="text-gray-500 text-sm">
              No significant tempo shifts detected.
            </p>
          )}

          <div className="space-y-3">
            {narrative.map((n, i) => {
              const toneClass =
                n.tone === "up"
                  ? "border-l-4 border-rose-500 bg-rose-50 dark:bg-rose-900/20"
                  : n.tone === "down"
                  ? "border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-l-4 border-gray-300 bg-gray-50 dark:bg-gray-800";
              const badgeClass =
                n.tone === "up"
                  ? "text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/40"
                  : n.tone === "down"
                  ? "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40"
                  : "text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700";
              return (
                <div
                  key={i}
                  className={`rounded-lg p-4 ${toneClass} flex items-start gap-3`}
                >
                  <div
                    className={`text-xs px-2.5 py-1 rounded-full font-bold whitespace-nowrap ${badgeClass}`}
                  >
                    Minute {n.minute}&apos;
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                      {n.text}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono">
                      xG before: {n.xg_before.toFixed(3)} → after:{" "}
                      {n.xg_after.toFixed(3)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-6 leading-relaxed">
            <strong>How to read:</strong> Charts show the match&apos;s
            aggregate tempo. Orange line = detected change point (from
            multivariate PELT on xG, PPDA, Field Tilt).
            {data.pen_used !== undefined && (
              <>
                {" "}
                Method: <strong>{data.detection_method}</strong>, penalty:{" "}
                <strong>{data.pen_used}</strong>.
              </>
            )}{" "}
            Metrics are aggregated across both teams — this is a match-level
            view, not per-team pressing analysis.
          </p>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: string;
  color: string;
  hint?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
      <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">
        {label}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {hint && (
        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
          {hint}
        </div>
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  color,
  children,
}: {
  title: string;
  subtitle: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg p-5 border border-gray-100 dark:border-gray-800 mb-6">
      <div className="mb-4">
        <h2
          className="font-semibold text-gray-900 dark:text-white"
          style={{ color }}
        >
          {title}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
          {subtitle}
        </p>
      </div>
      <div style={{ width: "100%", height: 260 }}>{children}</div>
    </div>
  );
}
