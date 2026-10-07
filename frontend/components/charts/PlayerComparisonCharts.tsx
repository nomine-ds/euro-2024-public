"use client";

import { useLayoutEffect, useRef, useState } from "react";
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

export const COMPARISON_COLORS = [
  "#10b981", // emerald
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#f59e0b", // amber
];

const CHART_HEIGHT = 380;

function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const update = () => setWidth(ref.current?.clientWidth ?? 0);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

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

export function RadarChartWrapper({
  data,
  players,
}: {
  data: Record<string, string | number>[];
  players: Player[];
}) {
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
              stroke={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
              fill={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
              fillOpacity={0.3}
              isAnimationActive={false}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: "13px", paddingTop: "8px" }} />
          <Tooltip
            formatter={(value) => `${Number(value ?? 0).toFixed(0)}%`}
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

export function BarChartWrapper({
  data,
  players,
}: {
  data: Record<string, string | number>[];
  players: Player[];
}) {
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
        <BarChart
          width={width}
          height={CHART_HEIGHT}
          data={data}
          margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" opacity={0.3} />
          <XAxis dataKey="metric" tick={{ fontSize: 13, fill: "#4b5563" }} />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            formatter={(value, name) => {
              const pct = Number(value ?? 0).toFixed(0);
              return [`${pct}% (of 0-100 scale)`, String(name)];
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
              fill={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
              isAnimationActive={false}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      )}
    </div>
  );
}