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
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

// ── Constants ──────────────────────────────────────────────────────────────

const PERIODS = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
  { label: "30d", hours: 720 },
] as const;

const PIE_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#ec4899",
];

const CHART_GRID = "rgba(63,63,70,0.4)";
const TOOLTIP_STYLE = {
  background: "#18181b",
  border: "1px solid #3f3f46",
  borderRadius: 8,
  color: "#e4e4e7",
  fontSize: 12,
};
const AXIS_TICK = { fill: "#71717a", fontSize: 11 };

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtCost(n: number | null | undefined): string {
  if (n == null) return "$0.00";
  return `$${n.toFixed(2)}`;
}

function coerceNumeric(value: string | number | Array<string | number> | null | undefined): number | null {
  if (value == null) return null;
  const candidate = Array.isArray(value) ? value[0] : value;
  const numeric = typeof candidate === "number" ? candidate : Number(candidate);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatModelUsageTooltip(
  value: string | number | Array<string | number>,
  _name: string,
  entry?: { payload?: { cost?: number | null } },
): [string, string] {
  const count = coerceNumeric(value) ?? 0;
  const cost = entry?.payload?.cost ?? 0;
  return [`${count} calls · ${fmtCost(cost)}`, "Usage"];
}

function formatEvaluationTooltip(
  value: string | number | Array<string | number> | null,
  name: string,
): [string, string] {
  const numeric = coerceNumeric(value);
  const label = name === "avgScore" ? "Avg Score" : "Count";

  if (name === "avgScore") {
    return [numeric == null ? "—" : numeric.toFixed(2), label];
  }

  return [numeric == null ? String(value ?? "—") : String(numeric), label];
}

function fmtBucket(bucket: string, periodHours: number): string {
  const d = new Date(bucket);
  if (periodHours <= 24) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (periodHours <= 168) return d.toLocaleDateString([], { weekday: "short", hour: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums text-zinc-100">{value}</span>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4 ${className}`}
    >
      <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
      {children}
    </div>
  );
}

function PeriodSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (h: number) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
      {PERIODS.map((p) => (
        <button
          key={p.hours}
          onClick={() => onChange(p.hours)}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value === p.hours
              ? "bg-amber-400/15 text-amber-400"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── Time-series charts ─────────────────────────────────────────────────────

function TimeSeriesArea({
  data,
  dataKey,
  periodHours,
  color = "#f59e0b",
  formatter,
}: {
  data: TimeSeriesPoint[];
  dataKey: keyof TimeSeriesPoint;
  periodHours: number;
  color?: string;
  formatter?: (v: number) => string;
}) {
  const fmt = formatter ?? ((v: number) => v.toLocaleString());
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
        <XAxis
          dataKey="bucket"
          tickFormatter={(b) => fmtBucket(b, periodHours)}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(b) => new Date(b).toLocaleString()}
          formatter={(v: number) => [fmt(v), String(dataKey)]}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${dataKey})`}
          dot={false}
          activeDot={{ r: 4, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Error rate derived series ──────────────────────────────────────────────

function ErrorRateChart({
  data,
  periodHours,
}: {
  data: TimeSeriesPoint[];
  periodHours: number;
}) {
  const derived = data.map((p) => ({
    bucket: p.bucket,
    errorRate: p.traces > 0 ? (p.errors / p.traces) * 100 : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={derived}>
        <defs>
          <linearGradient id="grad-errorRate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
        <XAxis
          dataKey="bucket"
          tickFormatter={(b) => fmtBucket(b, periodHours)}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(b) => new Date(b).toLocaleString()}
          formatter={(v: number) => [`${v.toFixed(2)}%`, "Error Rate"]}
        />
        <Area
          type="monotone"
          dataKey="errorRate"
          stroke="#ef4444"
          strokeWidth={2}
          fill="url(#grad-errorRate)"
          dot={false}
          activeDot={{ r: 4, fill: "#ef4444" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export function DashboardPage({ appName: rawAppName = "" }: { appName?: string }) {
  const appName = rawAppName || "default";
  const [periodHours, setPeriodHours] = useState(24);

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["metrics", appName],
    queryFn: () => fetchMetrics(appName),
  });

  const { data: tsData, isLoading: tsLoading } = useQuery({
    queryKey: ["timeseries", appName, periodHours],
    queryFn: () => fetchTimeSeries(appName, periodHours),
  });

  const m: MetricsSnapshot | undefined = metrics;
  const ts: TimeSeriesPoint[] = tsData?.timeseries ?? [];

  const loading = metricsLoading || tsLoading;

  return (
    <div className="space-y-6 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Operational Insights</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Application: <span className="text-zinc-300">{appName}</span>
          </p>
        </div>
        <PeriodSelector value={periodHours} onChange={setPeriodHours} />
      </div>

      {loading || !m ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-zinc-500">
            <svg
              className="animate-spin h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading metrics…
          </div>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Total Traces" value={fmtNum(m.totalTraces)} />
            <StatCard label="Total Spans" value={fmtNum(m.totalSpans)} />
            <StatCard
              label="Error Rate"
              value={`${(m.errorRate * 100).toFixed(1)}%`}
            />
            <StatCard
              label="Avg Duration"
              value={`${m.avgDurationMs.toFixed(0)} ms`}
            />
            <StatCard
              label="Total Tokens"
              value={fmtNum(m.totalInputTokens + m.totalOutputTokens)}
              sub={`In: ${fmtNum(m.totalInputTokens)} · Out: ${fmtNum(m.totalOutputTokens)}`}
            />
            <StatCard label="Est. Cost" value={fmtCost(m.totalCost)} />
          </div>

          {/* Time-series charts — 2×2 + 1 row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Request Volume">
              <TimeSeriesArea
                data={ts}
                dataKey="traces"
                periodHours={periodHours}
                color="#f59e0b"
              />
            </ChartCard>

            <ChartCard title="Error Rate">
              <ErrorRateChart data={ts} periodHours={periodHours} />
            </ChartCard>

            <ChartCard title="Avg Latency (ms)">
              <TimeSeriesArea
                data={ts}
                dataKey="avgDurationMs"
                periodHours={periodHours}
                color="#3b82f6"
                formatter={(v) => `${v.toFixed(1)} ms`}
              />
            </ChartCard>

            <ChartCard title="Token Usage">
              <TimeSeriesArea
                data={ts}
                dataKey="totalTokens"
                periodHours={periodHours}
                color="#8b5cf6"
                formatter={(v) => fmtNum(v)}
              />
            </ChartCard>

            <ChartCard title="Cost" className="lg:col-span-2">
              <TimeSeriesArea
                data={ts}
                dataKey="totalCost"
                periodHours={periodHours}
                color="#10b981"
                formatter={(v) => fmtCost(v)}
              />
            </ChartCard>
          </div>

          {/* Breakdowns — 3-column row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Model usage pie */}
            <ChartCard title="Model Usage">
              {m.modelBreakdown.length === 0 ? (
                <p className="text-zinc-600 text-sm py-12 text-center">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={m.modelBreakdown}
                      dataKey="count"
                      nameKey="model"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      strokeWidth={0}
                      label={({ model, percent }) =>
                        `${model} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={{ stroke: "#52525b" }}
                    >
                      {m.modelBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={formatModelUsageTooltip}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Span kind breakdown */}
            <ChartCard title="Span Kind Breakdown">
              {m.spanKindBreakdown.length === 0 ? (
                <p className="text-zinc-600 text-sm py-12 text-center">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={m.spanKindBreakdown}
                    layout="vertical"
                    margin={{ left: 8 }}
                  >
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="kind"
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      width={72}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Evaluation breakdown */}
            <ChartCard title="Evaluation Breakdown">
              {m.evaluationBreakdown.length === 0 ? (
                <p className="text-zinc-600 text-sm py-12 text-center">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={m.evaluationBreakdown}>
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={48}
                    />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={formatEvaluationTooltip}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
                      formatter={(v) => (v === "avgScore" ? "Avg Score" : "Count")}
                    />
                    <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="avgScore" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
