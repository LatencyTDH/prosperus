import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchEvaluations, type EvaluationRow } from "../api/client";

const MANAGED_EVALS = [
  "toxicity",
  "hallucination",
  "topic relevancy",
  "sentiment",
  "failure-to-answer",
  "prompt injection",
];

function AssessmentBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-zinc-600">—</span>;
  const pass = value.toLowerCase() === "pass";
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
        pass
          ? "bg-emerald-500/20 text-emerald-400"
          : "bg-red-500/20 text-red-400"
      }`}
    >
      {value}
    </span>
  );
}

function TypeBadge({ metricType }: { metricType: string }) {
  const isScore = metricType === "score";
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
        isScore
          ? "bg-blue-500/20 text-blue-400"
          : "bg-violet-500/20 text-violet-400"
      }`}
    >
      {metricType}
    </span>
  );
}

function formatValue(row: EvaluationRow): string {
  if (row.numericValue != null) return row.numericValue.toFixed(3);
  if (row.stringValue != null) return row.stringValue;
  return "—";
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function truncate(text: string | null, max: number): string {
  if (!text) return "—";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

interface SummaryStats {
  total: number;
  passRate: number;
  labelStats: Map<string, { count: number; passes: number; avgScore: number | null }>;
}

function computeStats(rows: EvaluationRow[]): SummaryStats {
  const labelStats = new Map<
    string,
    { count: number; passes: number; scoreSum: number; scoreCount: number }
  >();

  let totalAssessed = 0;
  let totalPasses = 0;

  for (const r of rows) {
    let entry = labelStats.get(r.label);
    if (!entry) {
      entry = { count: 0, passes: 0, scoreSum: 0, scoreCount: 0 };
      labelStats.set(r.label, entry);
    }
    entry.count++;
    if (r.assessment) {
      totalAssessed++;
      if (r.assessment.toLowerCase() === "pass") {
        totalPasses++;
        entry.passes++;
      }
    }
    if (r.numericValue != null) {
      entry.scoreSum += r.numericValue;
      entry.scoreCount++;
    }
  }

  const merged = new Map<
    string,
    { count: number; passes: number; avgScore: number | null }
  >();
  for (const [label, e] of labelStats) {
    merged.set(label, {
      count: e.count,
      passes: e.passes,
      avgScore: e.scoreCount > 0 ? e.scoreSum / e.scoreCount : null,
    });
  }

  return {
    total: rows.length,
    passRate: totalAssessed > 0 ? totalPasses / totalAssessed : 0,
    labelStats: merged,
  };
}

export function EvaluationsPage({ appName }: { appName: string }) {
  const [selectedLabel, setSelectedLabel] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["evaluations", appName, selectedLabel],
    queryFn: () =>
      fetchEvaluations({
        appName: appName || undefined,
        label: selectedLabel || undefined,
      }),
  });

  const evaluations = data?.evaluations ?? [];

  const labels = useMemo(() => {
    const set = new Set<string>();
    for (const e of evaluations) set.add(e.label);
    return Array.from(set).sort();
  }, [evaluations]);

  const filtered = useMemo(
    () =>
      selectedLabel
        ? evaluations.filter((e) => e.label === selectedLabel)
        : evaluations,
    [evaluations, selectedLabel],
  );

  const stats = useMemo(() => computeStats(filtered), [filtered]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Evaluations</h2>
        <p className="text-zinc-400 text-sm mt-1">
          Managed evaluations, custom LLM-as-Judge rules, and external
          evaluation results.
        </p>
      </div>

      {/* ── Info Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="font-medium text-amber-400">Managed Evaluations</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Built-in quality checks run automatically on your spans.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {MANAGED_EVALS.map((e) => (
              <span
                key={e}
                className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
              >
                {e}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="font-medium text-blue-400">Custom LLM-as-Judge</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Define evaluation criteria in natural language. Run them at scale
            across traces with your own scoring rubrics.
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="font-medium text-emerald-400">External Evaluations</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Submit evaluations from your own systems via the API. Centralize
            results from RAGAS, custom pipelines, or annotation queues.
          </p>
        </div>
      </div>

      {/* ── Summary Stats ──────────────────────────────────────── */}
      {!isLoading && evaluations.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">
              Total
            </p>
            <p className="text-2xl font-semibold tabular-nums mt-1">
              {stats.total}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">
              Pass Rate
            </p>
            <p className="text-2xl font-semibold tabular-nums mt-1">
              {(stats.passRate * 100).toFixed(1)}%
            </p>
          </div>
          {Array.from(stats.labelStats)
            .filter(([, s]) => s.avgScore != null)
            .slice(0, 2)
            .map(([label, s]) => (
              <div
                key={label}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
              >
                <p className="text-xs text-zinc-500 uppercase tracking-wide truncate">
                  Avg {label}
                </p>
                <p className="text-2xl font-semibold tabular-nums mt-1">
                  {s.avgScore!.toFixed(3)}
                </p>
              </div>
            ))}
        </div>
      )}

      {/* ── Label Filter ───────────────────────────────────────── */}
      {labels.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedLabel("")}
            className={`rounded px-3 py-1 text-xs font-medium transition ${
              selectedLabel === ""
                ? "bg-amber-400 text-zinc-950"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            All
          </button>
          {labels.map((l) => (
            <button
              key={l}
              onClick={() => setSelectedLabel(l)}
              className={`rounded px-3 py-1 text-xs font-medium transition ${
                selectedLabel === l
                  ? "bg-amber-400 text-zinc-950"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────── */}
      {isLoading && <p className="text-zinc-500 text-sm">Loading evaluations…</p>}

      {!isLoading && evaluations.length === 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-10 text-center">
          <p className="text-zinc-400 text-sm">No evaluations found.</p>
          <p className="text-zinc-600 text-xs mt-1">
            Run managed evaluations, submit external results, or create a custom
            LLM-as-Judge to get started.
          </p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="rounded-lg border border-zinc-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Label</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium text-right">Value</th>
                <th className="px-4 py-2 font-medium text-center">
                  Assessment
                </th>
                <th className="px-4 py-2 font-medium">Reasoning</th>
                <th className="px-4 py-2 font-medium">Span</th>
                <th className="px-4 py-2 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-900/60">
                  <td className="px-4 py-2 font-medium text-zinc-200">
                    {row.label}
                  </td>
                  <td className="px-4 py-2">
                    <TypeBadge metricType={row.metricType} />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-300">
                    {formatValue(row)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <AssessmentBadge value={row.assessment} />
                  </td>
                  <td
                    className="px-4 py-2 text-zinc-500 text-xs max-w-[240px] truncate"
                    title={row.reasoning ?? undefined}
                  >
                    {truncate(row.reasoning, 80)}
                  </td>
                  <td className="px-4 py-2">
                    {row.spanId && row.traceId ? (
                      <Link
                        to={`/traces/${row.traceId}`}
                        className="text-amber-400 hover:underline font-mono text-xs"
                      >
                        {row.spanId.slice(0, 8)}
                      </Link>
                    ) : (
                      <span className="text-zinc-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-500 text-xs whitespace-nowrap">
                    {formatTimestamp(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
