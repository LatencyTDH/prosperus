import { useQuery } from "@tanstack/react-query";
import { fetchMetrics, type MetricsSnapshot } from "../api/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"];

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const appName = "default"; // TODO: app selector
  const { data, isLoading } = useQuery({
    queryKey: ["metrics", appName],
    queryFn: () => fetchMetrics(appName),
  });

  if (isLoading || !data) {
    return <p className="text-zinc-500">Loading metrics…</p>;
  }

  const m: MetricsSnapshot = data;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Operational Insights</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Traces" value={m.totalTraces.toLocaleString()} />
        <StatCard label="Total Spans" value={m.totalSpans.toLocaleString()} />
        <StatCard label="Error Rate" value={`${(m.errorRate * 100).toFixed(1)}%`} />
        <StatCard label="Avg Duration" value={`${m.avgDurationMs.toFixed(0)} ms`} />
      </div>

      {/* Token usage */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Input Tokens" value={m.totalInputTokens.toLocaleString()} />
        <StatCard label="Output Tokens" value={m.totalOutputTokens.toLocaleString()} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model usage pie chart */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Model Usage</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={m.modelBreakdown}
                dataKey="count"
                nameKey="model"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ model }) => model}
              >
                {m.modelBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Span kind breakdown bar chart */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Span Kinds</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={m.spanKindBreakdown}>
              <XAxis dataKey="kind" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }}
              />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
