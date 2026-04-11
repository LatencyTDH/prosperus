import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import {
  fetchTraceSpans,
  fetchSpanEvaluations,
  type SpanRow,
  type EvaluationRow,
} from "../api/client";
import { useState, useMemo } from "react";

const EMPTY_SPANS: SpanRow[] = [];

// ── Kind colors (matches TracesPage) ───────────────────────────────────────

const KIND_COLORS: Record<string, string> = {
  llm: "bg-blue-500/20 text-blue-400",
  workflow: "bg-amber-500/20 text-amber-400",
  agent: "bg-purple-500/20 text-purple-400",
  tool: "bg-emerald-500/20 text-emerald-400",
  task: "bg-zinc-500/20 text-zinc-400",
  embedding: "bg-cyan-500/20 text-cyan-400",
  retrieval: "bg-orange-500/20 text-orange-400",
};

const KIND_BAR_COLORS: Record<string, string> = {
  llm: "bg-blue-500",
  workflow: "bg-amber-500",
  agent: "bg-purple-500",
  tool: "bg-emerald-500",
  task: "bg-zinc-500",
  embedding: "bg-cyan-500",
  retrieval: "bg-orange-500",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function nsToMs(ns: string): number {
  return Number(BigInt(ns) / 1_000_000n);
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatCost(cost: number | null): string {
  if (cost === null || cost === undefined) return "—";
  return `$${cost.toFixed(6)}`;
}

function KindBadge({ kind }: { kind: string }) {
  const cls = KIND_COLORS[kind] ?? "bg-zinc-700 text-zinc-300";
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {kind}
    </span>
  );
}

// ── Tree helpers ───────────────────────────────────────────────────────────

interface SpanNode {
  span: SpanRow;
  children: SpanNode[];
  depth: number;
}

function buildTree(spans: SpanRow[]): SpanNode[] {
  const byId = new Map<string, SpanNode>();
  for (const s of spans) {
    byId.set(s.spanId, { span: s, children: [], depth: 0 });
  }
  const roots: SpanNode[] = [];
  for (const node of byId.values()) {
    if (node.span.parentId && byId.has(node.span.parentId)) {
      byId.get(node.span.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function setDepth(nodes: SpanNode[], d: number) {
    for (const n of nodes) {
      n.depth = d;
      setDepth(n.children, d + 1);
    }
  }
  setDepth(roots, 0);
  return roots;
}

function flattenTree(nodes: SpanNode[]): SpanNode[] {
  const result: SpanNode[] = [];
  function walk(list: SpanNode[]) {
    for (const n of list) {
      result.push(n);
      walk(n.children);
    }
  }
  walk(nodes);
  return result;
}

// ── Detail Tabs ────────────────────────────────────────────────────────────

const TAB_NAMES = [
  "Overview",
  "Input/Output",
  "Errors",
  "Metrics",
  "Tags",
  "Metadata",
  "Prompt",
  "Evaluations",
] as const;
type TabName = (typeof TAB_NAMES)[number];

function OverviewTab({ span }: { span: SpanRow }) {
  const durationMs = nsToMs(span.endNs) - nsToMs(span.startNs);
  const rows: [string, React.ReactNode][] = [
    ["Span ID", <span className="font-mono text-xs">{span.spanId}</span>],
    ["Name", span.name],
    ["Kind", <KindBadge kind={span.kind} />],
    ["Duration", formatDuration(durationMs)],
    ["Model", span.modelName ?? "—"],
    ["Provider", span.modelProvider ?? "—"],
    ["App", span.appName],
    ["Session ID", span.sessionId ?? "—"],
    [
      "Start",
      new Date(nsToMs(span.startNs)).toLocaleString(),
    ],
    ["Input Cost", formatCost(span.inputCost)],
    ["Output Cost", formatCost(span.outputCost)],
    ["Total Cost", formatCost(span.totalCost)],
  ];
  return (
    <dl className="grid grid-cols-[140px_1fr] gap-y-2 gap-x-4 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-zinc-500">{label}</dt>
          <dd className="text-zinc-200">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  if (data === null || data === undefined)
    return <p className="text-zinc-500 text-sm italic">No data</p>;
  return (
    <pre className="text-xs font-mono text-zinc-300 bg-zinc-950 rounded-lg p-3 overflow-auto max-h-96 whitespace-pre-wrap wrap-break-word">
      {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
    </pre>
  );
}

function InputOutputTab({ span }: { span: SpanRow }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Input
        </h4>
        <JsonBlock data={span.inputData} />
      </div>
      <div>
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Output
        </h4>
        <JsonBlock data={span.outputData} />
      </div>
    </div>
  );
}

function ErrorsTab({ span }: { span: SpanRow }) {
  if (!span.error)
    return <p className="text-zinc-500 text-sm italic">No errors</p>;
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-1">
      <p className="text-red-400 font-semibold text-sm">{span.error.type}</p>
      <p className="text-red-300 text-sm">{span.error.message}</p>
    </div>
  );
}

function MetricsTab({ span }: { span: SpanRow }) {
  const entries = Object.entries(span.metrics ?? {});
  if (entries.length === 0)
    return <p className="text-zinc-500 text-sm italic">No metrics</p>;
  return (
    <dl className="grid grid-cols-[180px_1fr] gap-y-1.5 gap-x-4 text-sm">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-zinc-500 font-mono text-xs">{k}</dt>
          <dd className="text-zinc-200 tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function TagsTab({ span }: { span: SpanRow }) {
  const entries = Object.entries(span.tags ?? {});
  if (entries.length === 0)
    return <p className="text-zinc-500 text-sm italic">No tags</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([k, v]) => (
        <span
          key={k}
          className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1 text-xs"
        >
          <span className="text-zinc-400">{k}:</span>
          <span className="text-zinc-200">{v}</span>
        </span>
      ))}
    </div>
  );
}

function MetadataTab({ span }: { span: SpanRow }) {
  return <JsonBlock data={span.metadata} />;
}

function PromptTab({ span }: { span: SpanRow }) {
  if (!span.prompt)
    return <p className="text-zinc-500 text-sm italic">No prompt template</p>;
  return <JsonBlock data={span.prompt} />;
}

function EvaluationsTab({ spanId }: { spanId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["span-evaluations", spanId],
    queryFn: () => fetchSpanEvaluations(spanId),
  });

  if (isLoading) return <p className="text-zinc-500 text-sm">Loading…</p>;
  const evals = data?.evaluations ?? [];
  if (evals.length === 0)
    return <p className="text-zinc-500 text-sm italic">No evaluations</p>;

  return (
    <div className="space-y-3">
      {evals.map((ev: EvaluationRow) => (
        <div
          key={ev.id}
          className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-200">
              {ev.label}
            </span>
            <span className="text-xs text-zinc-500">{ev.metricType}</span>
          </div>
          {ev.numericValue !== null && (
            <p className="text-amber-400 font-mono text-sm tabular-nums">
              {ev.numericValue}
            </p>
          )}
          {ev.stringValue && (
            <p className="text-zinc-300 text-sm">{ev.stringValue}</p>
          )}
          {ev.assessment && (
            <p className="text-zinc-400 text-xs">
              Assessment: {ev.assessment}
            </p>
          )}
          {ev.reasoning && (
            <p className="text-zinc-500 text-xs">{ev.reasoning}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Waterfall Bar ──────────────────────────────────────────────────────────

function WaterfallRow({
  node,
  traceStartMs,
  traceDurationMs,
  isSelected,
  onSelect,
}: {
  node: SpanNode;
  traceStartMs: number;
  traceDurationMs: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const startMs = nsToMs(node.span.startNs);
  const endMs = nsToMs(node.span.endNs);
  const durationMs = endMs - startMs;
  const offsetPct =
    traceDurationMs > 0
      ? ((startMs - traceStartMs) / traceDurationMs) * 100
      : 0;
  const widthPct =
    traceDurationMs > 0
      ? Math.max((durationMs / traceDurationMs) * 100, 0.5)
      : 100;
  const barColor = KIND_BAR_COLORS[node.span.kind] ?? "bg-zinc-600";

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left group flex items-center gap-2 py-1 px-2 rounded transition-colors ${
        isSelected
          ? "bg-zinc-800 ring-1 ring-amber-500/50"
          : "hover:bg-zinc-800/50"
      }`}
    >
      {/* Label area */}
      <div
        className="shrink-0 flex items-center gap-1.5 min-w-0"
        style={{ paddingLeft: `${node.depth * 20}px`, width: "260px" }}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${barColor}`}
          aria-hidden
        />
        <span className="text-xs text-zinc-300 truncate">{node.span.name}</span>
        <KindBadge kind={node.span.kind} />
      </div>

      {/* Timeline bar area */}
      <div className="flex-1 relative h-6 bg-zinc-900 rounded overflow-hidden">
        <div
          className={`absolute top-1 bottom-1 rounded ${barColor} opacity-80 group-hover:opacity-100 transition-opacity`}
          style={{
            left: `${offsetPct}%`,
            width: `${widthPct}%`,
            minWidth: "2px",
          }}
        />
        <span
          className="absolute top-0.5 text-[10px] text-zinc-400 font-mono leading-5 pointer-events-none"
          style={{ left: `${Math.min(offsetPct + widthPct + 0.5, 92)}%` }}
        >
          {formatDuration(durationMs)}
        </span>
      </div>
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function TraceDetailPage() {
  const { traceId } = useParams<{ traceId: string }>();
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>("Overview");

  const { data, isLoading } = useQuery({
    queryKey: ["trace", traceId],
    queryFn: () => fetchTraceSpans(traceId!),
    enabled: !!traceId,
  });

  const spans = data?.spans ?? EMPTY_SPANS;

  const flatNodes = useMemo(() => {
    if (spans.length === 0) return [];
    return flattenTree(buildTree(spans));
  }, [spans]);

  const selectedSpan = useMemo(
    () => spans.find((s) => s.spanId === selectedSpanId) ?? null,
    [spans, selectedSpanId],
  );

  // Trace-level aggregates
  const traceStartMs = useMemo(
    () =>
      spans.length > 0
        ? Math.min(...spans.map((s) => nsToMs(s.startNs)))
        : 0,
    [spans],
  );
  const traceEndMs = useMemo(
    () =>
      spans.length > 0
        ? Math.max(...spans.map((s) => nsToMs(s.endNs)))
        : 0,
    [spans],
  );
  const traceDurationMs = traceEndMs - traceStartMs;
  const totalCost = useMemo(
    () =>
      spans.reduce(
        (sum, s) => sum + (s.totalCost ?? 0),
        0,
      ),
    [spans],
  );
  const hasError = spans.some((s) => s.error !== null);
  const appName = spans[0]?.appName ?? "—";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-500">Loading trace…</p>
      </div>
    );
  }

  if (!data || spans.length === 0) {
    return (
      <div className="space-y-4">
        <Link
          to="/traces"
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Traces
        </Link>
        <p className="text-zinc-500">Trace not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          to="/traces"
          className="text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Traces
        </Link>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-300 font-mono text-xs">
          Trace {traceId?.slice(0, 12)}…
        </span>
      </div>

      {/* Summary bar */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
            Trace ID
          </span>
          <span className="font-mono text-xs text-zinc-300">
            {traceId}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
            Duration
          </span>
          <span className="text-sm text-zinc-200 tabular-nums">
            {formatDuration(traceDurationMs)}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
            Total Cost
          </span>
          <span className="text-sm text-zinc-200 tabular-nums">
            {formatCost(totalCost || null)}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
            Spans
          </span>
          <span className="text-sm text-zinc-200 tabular-nums">
            {spans.length}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
            App
          </span>
          <span className="text-sm text-zinc-200">{appName}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
            Status
          </span>
          {hasError ? (
            <span className="text-red-400 text-sm font-medium">● Error</span>
          ) : (
            <span className="text-emerald-400 text-sm font-medium">● OK</span>
          )}
        </div>
      </div>

      {/* Waterfall / Flame view */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Waterfall
          </h3>
          <span className="text-[10px] text-zinc-600 font-mono tabular-nums">
            {formatDuration(traceDurationMs)}
          </span>
        </div>
        <div className="p-2 max-h-105 overflow-y-auto">
          {flatNodes.map((node) => (
            <WaterfallRow
              key={node.span.spanId}
              node={node}
              traceStartMs={traceStartMs}
              traceDurationMs={traceDurationMs}
              isSelected={node.span.spanId === selectedSpanId}
              onSelect={() => {
                setSelectedSpanId(node.span.spanId);
                setActiveTab("Overview");
              }}
            />
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selectedSpan ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-zinc-800 overflow-x-auto">
            {TAB_NAMES.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === tab
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab}
                {tab === "Errors" && selectedSpan.error && (
                  <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4">
            {activeTab === "Overview" && <OverviewTab span={selectedSpan} />}
            {activeTab === "Input/Output" && (
              <InputOutputTab span={selectedSpan} />
            )}
            {activeTab === "Errors" && <ErrorsTab span={selectedSpan} />}
            {activeTab === "Metrics" && <MetricsTab span={selectedSpan} />}
            {activeTab === "Tags" && <TagsTab span={selectedSpan} />}
            {activeTab === "Metadata" && <MetadataTab span={selectedSpan} />}
            {activeTab === "Prompt" && <PromptTab span={selectedSpan} />}
            {activeTab === "Evaluations" && (
              <EvaluationsTab spanId={selectedSpan.spanId} />
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-zinc-500 text-sm">
            Click a span in the waterfall to view details
          </p>
        </div>
      )}
    </div>
  );
}
