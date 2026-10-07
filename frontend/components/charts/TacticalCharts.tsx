"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface ChartRow {
  minute: number;
  xg: number;
  ppda: number | null;
  field_tilt: number | null;
}

function TacticalTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean;
  payload?: { value?: number | string; name?: string }[];
  label?: number | string;
  metric: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2">
      <div className="font-medium mb-1">
        {label}
        &apos;
      </div>
      <div>
        {metric}: {Number(payload[0].value ?? 0).toFixed(2)}
      </div>
    </div>
  );
}

const gridProps = {
  strokeDasharray: "3 3",
  stroke: "#9ca3af",
  opacity: 0.25,
};

const xAxisProps = {
  dataKey: "minute",
  tick: { fontSize: 11, fill: "#6b7280" },
  tickFormatter: (v: number) => `${v}'`,
};

export function XgRollingChart({
  data,
  changeMinutes,
}: {
  data: ChartRow[];
  changeMinutes: number[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
        <defs>
          <linearGradient id="xgGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e11d48" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#e11d48" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis {...xAxisProps} />
        <YAxis
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickFormatter={(v) => Number(v).toFixed(2)}
        />
        <Tooltip content={<TacticalTooltip metric="xG" />} />
        <Area
          type="monotone"
          dataKey="xg"
          stroke="#e11d48"
          fill="url(#xgGrad)"
          strokeWidth={2}
          isAnimationActive={false}
        />
        {changeMinutes.map((m, i) => (
          <ReferenceLine
            key={`cp-xg-${i}`}
            x={m}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PpdaChart({
  data,
  changeMinutes,
}: {
  data: ChartRow[];
  changeMinutes: number[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis {...xAxisProps} />
        <YAxis
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickFormatter={(v) => Number(v).toFixed(1)}
        />
        <Tooltip content={<TacticalTooltip metric="PPDA" />} />
        <Line
          type="monotone"
          dataKey="ppda"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3, fill: "#10b981" }}
          connectNulls
          isAnimationActive={false}
        />
        {changeMinutes.map((m, i) => (
          <ReferenceLine
            key={`cp-ppda-${i}`}
            x={m}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function FieldTiltChart({
  data,
  changeMinutes,
}: {
  data: ChartRow[];
  changeMinutes: number[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis {...xAxisProps} />
        <YAxis
          domain={[0, 1]}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickFormatter={(v) => Number(v).toFixed(2)}
        />
        <Tooltip content={<TacticalTooltip metric="Field Tilt" />} />
        <Line
          type="monotone"
          dataKey="field_tilt"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3, fill: "#10b981" }}
          isAnimationActive={false}
        />
        {changeMinutes.map((m, i) => (
          <ReferenceLine
            key={`cp-ft-${i}`}
            x={m}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}