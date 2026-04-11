import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchPrompts,
  fetchPromptVersions,
  type PromptSummary,
  type PromptVersion,
} from "../api/client";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function VersionDetail({ version }: { version: PromptVersion }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-950 p-3 space-y-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-medium text-amber-400">v{version.version}</span>
        <span className="text-zinc-500">{relativeTime(version.createdAt)}</span>
      </div>

      {version.template && (
        <div>
          <p className="text-zinc-500 uppercase tracking-wide mb-1">Template</p>
          <pre className="whitespace-pre-wrap rounded bg-zinc-900 p-2 text-zinc-300">
            {version.template}
          </pre>
        </div>
      )}

      {version.chatTemplate && version.chatTemplate.length > 0 && (
        <div>
          <p className="text-zinc-500 uppercase tracking-wide mb-1">Chat Template</p>
          <div className="space-y-1">
            {version.chatTemplate.map((msg, i) => (
              <div key={i} className="rounded bg-zinc-900 p-2">
                <span className="text-amber-400 font-medium">{msg.role}:</span>{" "}
                <span className="text-zinc-300">{msg.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(version.variables).length > 0 && (
        <div>
          <p className="text-zinc-500 uppercase tracking-wide mb-1">Variables</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(version.variables).map(([k, v]) => (
              <span key={k} className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">
                {k}={v}
              </span>
            ))}
          </div>
        </div>
      )}

      {Object.keys(version.tags).length > 0 && (
        <div>
          <p className="text-zinc-500 uppercase tracking-wide mb-1">Tags</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(version.tags).map(([k, v]) => (
              <span key={k} className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-400">
                {k}: {v}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DiffView({ a, b }: { a: PromptVersion; b: PromptVersion }) {
  const textA = a.template ?? a.chatTemplate?.map((m) => `${m.role}: ${m.content}`).join("\n") ?? "";
  const textB = b.template ?? b.chatTemplate?.map((m) => `${m.role}: ${m.content}`).join("\n") ?? "";
  const linesA = textA.split("\n");
  const linesB = textB.split("\n");
  const maxLen = Math.max(linesA.length, linesB.length);

  return (
    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
      <div>
        <p className="text-zinc-500 mb-1">v{a.version}</p>
        <div className="rounded bg-zinc-950 border border-zinc-800 p-2 space-y-0.5">
          {Array.from({ length: maxLen }).map((_, i) => {
            const line = linesA[i] ?? "";
            const changed = line !== (linesB[i] ?? "");
            return (
              <div key={i} className={changed ? "bg-red-500/10 text-red-400" : "text-zinc-400"}>
                {line || "\u00A0"}
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-zinc-500 mb-1">v{b.version}</p>
        <div className="rounded bg-zinc-950 border border-zinc-800 p-2 space-y-0.5">
          {Array.from({ length: maxLen }).map((_, i) => {
            const line = linesB[i] ?? "";
            const changed = line !== (linesA[i] ?? "");
            return (
              <div key={i} className={changed ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-400"}>
                {line || "\u00A0"}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PromptRow({ prompt }: { prompt: PromptSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [diffPair, setDiffPair] = useState<[number, number] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["prompt-versions", prompt.id],
    queryFn: () => fetchPromptVersions(prompt.id),
    enabled: expanded,
  });

  const versions = data?.versions ?? [];

  return (
    <>
      <tr
        className="hover:bg-zinc-900/60 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-2 font-mono text-xs text-amber-400">{prompt.id}</td>
        <td className="px-4 py-2 text-right tabular-nums">{prompt.versionCount}</td>
        <td className="px-4 py-2 font-mono text-xs text-zinc-400">{prompt.latestVersion}</td>
        <td className="px-4 py-2 text-right text-zinc-500 text-xs">
          {relativeTime(prompt.lastUsed)}
        </td>
        <td className="px-4 py-2 text-center text-zinc-500">
          {expanded ? "▾" : "▸"}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={5} className="px-4 py-3 bg-zinc-900/40">
            {isLoading && <p className="text-zinc-500 text-xs">Loading versions…</p>}

            {versions.length > 1 && (
              <div className="mb-3">
                <p className="text-xs text-zinc-500 mb-1">Compare versions:</p>
                <div className="flex gap-2 items-center text-xs">
                  <select
                    className="rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-zinc-300"
                    value={diffPair?.[0] ?? ""}
                    onChange={(e) =>
                      setDiffPair([Number(e.target.value), diffPair?.[1] ?? 1])
                    }
                  >
                    <option value="">Select A</option>
                    {versions.map((v, i) => (
                      <option key={v.version} value={i}>
                        v{v.version}
                      </option>
                    ))}
                  </select>
                  <span className="text-zinc-500">vs</span>
                  <select
                    className="rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-zinc-300"
                    value={diffPair?.[1] ?? ""}
                    onChange={(e) =>
                      setDiffPair([diffPair?.[0] ?? 0, Number(e.target.value)])
                    }
                  >
                    <option value="">Select B</option>
                    {versions.map((v, i) => (
                      <option key={v.version} value={i}>
                        v{v.version}
                      </option>
                    ))}
                  </select>
                </div>

                {diffPair !== null &&
                  versions[diffPair[0]] &&
                  versions[diffPair[1]] && (
                    <div className="mt-2">
                      <DiffView a={versions[diffPair[0]]} b={versions[diffPair[1]]} />
                    </div>
                  )}
              </div>
            )}

            <div className="space-y-2">
              {versions.map((v) => (
                <VersionDetail key={v.version} version={v} />
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function PromptsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["prompts"],
    queryFn: () => fetchPrompts(),
  });

  const prompts = data?.prompts ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Prompts</h2>
      <p className="text-zinc-400 text-sm">
        Track prompt templates and their versions across your applications.
      </p>

      {isLoading && <p className="text-zinc-500">Loading prompts…</p>}

      {!isLoading && prompts.length === 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-zinc-400">No prompts tracked yet.</p>
          <p className="text-zinc-500 text-sm mt-1">
            Prompts will appear here once your application reports them via the SDK.
          </p>
        </div>
      )}

      {prompts.length > 0 && (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Prompt ID</th>
                <th className="px-4 py-2 font-medium text-right">Versions</th>
                <th className="px-4 py-2 font-medium">Latest Version</th>
                <th className="px-4 py-2 font-medium text-right">Last Used</th>
                <th className="px-4 py-2 font-medium text-center w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {prompts.map((p) => (
                <PromptRow key={p.id} prompt={p} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
