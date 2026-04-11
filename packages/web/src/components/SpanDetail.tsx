import type { SpanRow } from "../api/client";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs uppercase tracking-wide text-zinc-500">{label}</h4>
      {children}
    </div>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  if (data == null) return <p className="text-zinc-600 text-xs">—</p>;
  return (
    <pre className="text-xs bg-zinc-950 rounded p-2 overflow-auto max-h-48 text-zinc-300">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export function SpanDetail({ span }: { span: SpanRow }) {
  const durationMs =
    (Number(BigInt(span.endNs) - BigInt(span.startNs))) / 1_000_000;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-mono text-sm text-amber-400">{span.name}</h3>
        <div className="flex gap-3 mt-1 text-xs text-zinc-500">
          <span>Kind: <strong className="text-zinc-300">{span.kind}</strong></span>
          <span>Duration: <strong className="text-zinc-300">{durationMs.toFixed(1)}ms</strong></span>
          {span.modelName && (
            <span>Model: <strong className="text-zinc-300">{span.modelName}</strong></span>
          )}
          {span.modelProvider && (
            <span>Provider: <strong className="text-zinc-300">{span.modelProvider}</strong></span>
          )}
        </div>
      </div>

      {span.error && (
        <div className="rounded border border-red-900/50 bg-red-950/30 p-3 text-xs">
          <p className="text-red-400 font-medium">{span.error.type}</p>
          <p className="text-red-300/70 mt-1">{span.error.message}</p>
        </div>
      )}

      <Section label="Input">
        <JsonBlock data={span.inputData} />
      </Section>

      <Section label="Output">
        <JsonBlock data={span.outputData} />
      </Section>

      {Object.keys(span.metrics).length > 0 && (
        <Section label="Metrics">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(span.metrics).map(([k, v]) => (
              <div key={k} className="flex justify-between bg-zinc-950 rounded px-2 py-1">
                <span className="text-zinc-500">{k}</span>
                <span className="text-zinc-300 tabular-nums">{v}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {Object.keys(span.tags).length > 0 && (
        <Section label="Tags">
          <div className="flex flex-wrap gap-1">
            {Object.entries(span.tags).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex gap-1 rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
              >
                <span>{k}:</span>
                <span className="text-zinc-300">{v}</span>
              </span>
            ))}
          </div>
        </Section>
      )}

      {Object.keys(span.metadata).length > 0 && (
        <Section label="Metadata">
          <JsonBlock data={span.metadata} />
        </Section>
      )}

      {span.prompt != null && (
        <Section label="Prompt">
          <JsonBlock data={span.prompt} />
        </Section>
      )}
    </div>
  );
}
