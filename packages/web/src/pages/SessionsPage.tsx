import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchSessions, type SessionListItem } from "../api/client";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function duration(first: string, last: string): string {
  const ms = new Date(last).getTime() - new Date(first).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

export function SessionsPage({ appName }: { appName: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["sessions", appName],
    queryFn: () => fetchSessions(appName || undefined),
  });

  const sessions = data?.sessions ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Sessions</h2>
      <p className="text-zinc-400 text-sm">
        User sessions grouped by session ID across your traces.
      </p>

      {isLoading && <p className="text-zinc-500">Loading sessions…</p>}

      {!isLoading && sessions.length === 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-zinc-400">No sessions found.</p>
          <p className="text-zinc-500 text-sm mt-1">
            Sessions are created automatically when traces include a session_id.
          </p>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Session ID</th>
                <th className="px-4 py-2 font-medium text-right">Traces</th>
                <th className="px-4 py-2 font-medium text-right">Spans</th>
                <th className="px-4 py-2 font-medium">Duration</th>
                <th className="px-4 py-2 font-medium">First Seen</th>
                <th className="px-4 py-2 font-medium">Last Seen</th>
                <th className="px-4 py-2 font-medium">App</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sessions.map((s: SessionListItem) => (
                <tr key={s.sessionId} className="hover:bg-zinc-900/60">
                  <td className="px-4 py-2">
                    <Link
                      to={`/traces?session_id=${encodeURIComponent(s.sessionId)}`}
                      className="text-amber-400 hover:underline font-mono text-xs"
                    >
                      {s.sessionId}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{s.traceCount}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{s.spanCount}</td>
                  <td className="px-4 py-2 text-zinc-400 text-xs">
                    {duration(s.firstSeen, s.lastSeen)}
                  </td>
                  <td className="px-4 py-2 text-zinc-500 text-xs">{formatDate(s.firstSeen)}</td>
                  <td className="px-4 py-2 text-zinc-500 text-xs">{formatDate(s.lastSeen)}</td>
                  <td className="px-4 py-2 text-zinc-400">{s.appName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
