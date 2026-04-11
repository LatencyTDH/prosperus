import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { fetchTraceSpans, type SpanRow } from "../api/client";
import { SpanTree } from "../components/SpanTree";
import { SpanDetail } from "../components/SpanDetail";
import { useState } from "react";

export function TraceDetailPage() {
  const { traceId } = useParams<{ traceId: string }>();
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["trace", traceId],
    queryFn: () => fetchTraceSpans(traceId!),
    enabled: !!traceId,
  });

  if (isLoading || !data) {
    return <p className="text-zinc-500">Loading trace…</p>;
  }

  const spans = data.spans;
  const selectedSpan = spans.find((s) => s.spanId === selectedSpanId) ?? null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold font-mono">
        Trace <span className="text-amber-400">{traceId?.slice(0, 8)}…</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Span tree / flame graph */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 overflow-auto">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Span Tree</h3>
          <SpanTree
            spans={spans}
            selectedSpanId={selectedSpanId}
            onSelect={setSelectedSpanId}
          />
        </div>

        {/* Span detail panel */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          {selectedSpan ? (
            <SpanDetail span={selectedSpan} />
          ) : (
            <p className="text-zinc-500 text-sm">Select a span to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
