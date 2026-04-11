import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchTraces, type TraceListItem } from "../api/client";

const KIND_COLORS: Record<string, string> = {
  llm: "bg-blue-500/20 text-blue-400",
  workflow: "bg-amber-500/20 text-amber-400",
  agent: "bg-purple-500/20 text-purple-400",
  tool: "bg-emerald-500/20 text-emerald-400",
  task: "bg-zinc-500/20 text-zinc-400",
  embedding: "bg-cyan-500/20 text-cyan-400",
  retrieval: "bg-orange-500/20 text-orange-400",
};

function KindBadge({ kind }: { kind: string }) {
  const cls = KIND_COLORS[kind] ?? "bg-zinc-700 text-zinc-300";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
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

export function TracesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["traces"],
    queryFn: () => fetchTraces(),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Traces</h2>

      {isLoading && <p className="text-zinc-500">Loading traces…</p>}

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Kind</th>
              <th className="px-4 py-2 font-medium">App</th>
              <th className="px-4 py-2 font-medium text-right">Spans</th>
              <th className="px-4 py-2 font-medium text-right">Time</th>
              <th className="px-4 py-2 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {data?.traces.map((t: TraceListItem) => (
              <tr key={t.traceId} className="hover:bg-zinc-900/60">
                <td className="px-4 py-2">
                  <Link
                    to={`/traces/${t.traceId}`}
                    className="text-amber-400 hover:underline font-mono text-xs"
                  >
                    {t.rootSpanName}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <KindBadge kind={t.kind} />
                </td>
                <td className="px-4 py-2 text-zinc-400">{t.appName}</td>
                <td className="px-4 py-2 text-right tabular-nums">{t.spanCount}</td>
                <td className="px-4 py-2 text-right text-zinc-500 text-xs">
                  {relativeTime(t.startNs)}
                </td>
                <td className="px-4 py-2 text-center">
                  {t.hasError ? (
                    <span className="text-red-400 text-xs">● Error</span>
                  ) : (
                    <span className="text-emerald-400 text-xs">● OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
