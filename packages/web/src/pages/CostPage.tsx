import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchMetrics,
  fetchTimeSeries,
  type MetricsSnapshot,
  type TimeSeriesPoint,
} from "../api/client";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const PERIODS: { label: string; hours: number }[] = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
  { label: "30d", hours: 720 },
];

const TOOLTIP_STYLE = { background: "#18181b", border: "1px solid #3f3f46" };

function CostCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function formatCost(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function formatBucket(bucket: string): string {
  const d = new Date(bucket);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function CostPage({ appName }: { appName: string }) {
  const [periodHours, setPeriodHours] = useState(24);
  const effectiveApp = appName || "default";

  const { data: metrics } = useQuery({
    queryKey: ["metrics", effectiveApp],
    queryFn: () => fetchMetrics(effectiveApp),
  });

  const { data: tsData } = useQuery({
    queryKey: ["timeseries", effectiveApp, periodHours],
    queryFn: () => fetchTimeSeries(effectiveApp, periodHours),
  });

  const m: MetricsSnapshot | undefined = metrics;
  const ts: TimeSeriesPoint[] = tsData?.timeseries ?? [];

  const costPerTrace =
    m && m.totalTraces > 0 ? m.totalCost / m.totalTraces : 0;

  const chartData = ts.map((p) => ({
    ...p,
    label: formatBucket(p.bucket),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Cost</h2>
          <p className="text-zinc-400 text-sm">
            Monitor LLM spend across models and time.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.hours}
              onClick={() => setPeriodHours(p.hours)}
              className={`rounded px-3 py-1 text-xs font-medium transition ${
                periodHours === p.hours
                  ? "bg-amber-400 text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      {m && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CostCard label="Total Cost" value={formatCost(m.totalCost)} />
          <CostCard label="Cost / Trace" value={formatCost(costPerTrace)} />
          <CostCard
            label="Input Token Cost"
            value={`${m.totalInputTokens.toLocaleString()} tokens`}
          />
          <CostCard
            label="Output Token Cost"
            value={`${m.totalOutputTokens.toLocaleString()} tokens`}
          />
        </div>
      )}

      {/* Cost over time */}
      {chartData.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Cost Over Time</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickFormatter={(v: number) => `$${v}`}
                tickLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCost(v)} />
              <Area
                type="monotone"
                dataKey="totalCost"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cost by model */}
      {m && m.modelBreakdown.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Cost by Model</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={m.modelBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="model"
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickFormatter={(v: number) => `$${v}`}
                tickLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCost(v)} />
              <Bar dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Token usage over time */}
      {chartData.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Token Usage Over Time</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickFormatter={(v: number) => v.toLocaleString()}
                tickLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="totalTokens"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
