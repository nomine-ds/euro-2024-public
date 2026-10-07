"use client";

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

export interface RadarPoint {
  metric: string;
  player: number;
  avg: number;
}

interface Props {
  data: RadarPoint[];
  playerName: string;
}

export default function PlayerRadarChart({ data, playerName }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data}>
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
          name={playerName}
          dataKey="player"
          stroke="#10b981"
          fill="#10b981"
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
          formatter={(value) => `${Number(value ?? 0).toFixed(1)}%`}
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
  );
}