import { useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchTraces, type TraceListItem } from "../api/client";

const SPAN_KINDS = [
  "llm",
  "workflow",
  "agent",
  "tool",
  "task",
  "embedding",
  "retrieval",
] as const;

const KIND_COLORS: Record<string, string> = {
  llm: "bg-blue-500/20 text-blue-400 ring-blue-500/30",
  workflow: "bg-amber-500/20 text-amber-400 ring-amber-500/30",
  agent: "bg-purple-500/20 text-purple-400 ring-purple-500/30",
  tool: "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30",
  task: "bg-zinc-500/20 text-zinc-400 ring-zinc-500/30",
  embedding: "bg-cyan-500/20 text-cyan-400 ring-cyan-500/30",
  retrieval: "bg-orange-500/20 text-orange-400 ring-orange-500/30",
};

const PAGE_SIZE = 50;

// ── Helpers ────────────────────────────────────────────────────────────────

function KindBadge({ kind }: { kind: string }) {
  const cls = KIND_COLORS[kind] ?? "bg-zinc-700 text-zinc-300 ring-zinc-600/30";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {kind}
    </span>
  );
}

function relativeTime(nsStr: string): string {
  const ms = Number(BigInt(nsStr) / 1_000_000n);
  const diff = Date.now() - ms;
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ms).toLocaleDateString();
}

function formatDuration(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatCost(cost: number | null): string {
  if (cost == null || cost === 0) return "—";
  return `$${cost.toFixed(4)}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export function TracesPage({ appName = "" }: { appName?: string }) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [offset, setOffset] = useState(0);

  const hasFilters = search !== "" || kind !== "" || errorsOnly;

  const queryParams = useMemo(
    () => ({
      ...(appName ? { appName } : {}),
      ...(search ? { search } : {}),
      ...(kind ? { kind } : {}),
      ...(errorsOnly ? { hasError: true as const } : {}),
      limit: PAGE_SIZE,
      offset,
    }),
    [appName, search, kind, errorsOnly, offset],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["traces", queryParams],
    queryFn: () => fetchTraces(queryParams),
    placeholderData: keepPreviousData,
  });

  const traces = data?.traces ?? [];
  const hasMore = traces.length === PAGE_SIZE;

  function clearFilters() {
    setSearch("");
    setKind("");
    setErrorsOnly(false);
    setOffset(0);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-100">Traces</h2>
        {isFetching && !isLoading && (
          <span className="text-xs text-zinc-500 animate-pulse">Refreshing…</span>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
        {/* Search */}
        <div className="relative flex-1 min-w-50">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            placeholder="Search traces…"
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 py-1.5 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          />
        </div>

        {/* Kind filter */}
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setOffset(0);
          }}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        >
          <option value="">All kinds</option>
          {SPAN_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        {/* Error toggle */}
        <button
          type="button"
          onClick={() => {
            setErrorsOnly((v) => !v);
            setOffset(0);
          }}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            errorsOnly
              ? "border-red-500/50 bg-red-500/15 text-red-400"
              : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${errorsOnly ? "bg-red-400" : "bg-zinc-600"}`}
          />
          Errors only
        </button>

        {/* Clear filters */}
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md px-2.5 py-1.5 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-md bg-zinc-800/60"
            />
          ))}
        </div>
      )}

      {/* Table */}
      {!isLoading && (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-left text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Name</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Kind</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">App</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-right">
                    Duration
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-right">
                    Cost
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-right">
                    Spans
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-right">
                    Time
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {traces.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-zinc-500"
                    >
                      {hasFilters
                        ? "No traces match the current filters."
                        : "No traces found."}
                    </td>
                  </tr>
                )}
                {traces.map((t: TraceListItem) => (
                  <tr
                    key={t.traceId}
                    className="group transition-colors hover:bg-zinc-800/40"
                  >
                    <td className="max-w-xs truncate px-4 py-2.5">
                      <Link
                        to={`/traces/${t.traceId}`}
                        className="font-mono text-xs text-amber-400 hover:text-amber-300 hover:underline"
                      >
                        {t.rootSpanName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <KindBadge kind={t.kind} />
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400">{t.appName}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-zinc-300">
                      {formatDuration(t.durationMs)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-zinc-400">
                      {formatCost(t.totalCost)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-400">
                      {t.spanCount}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-zinc-500">
                      {relativeTime(t.startNs)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {t.hasError ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                          Error
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && (traces.length > 0 || offset > 0) && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">
            Showing {offset + 1}–{offset + traces.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!hasMore}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
