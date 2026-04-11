import { db } from "../db/connection.js";
import { spans, type SpanInsert } from "../db/schema.js";

interface IngestSpanPayload {
  trace_id: string;
  span_id: string;
  parent_id?: string | null;
  name: string;
  kind: "llm" | "workflow" | "agent" | "tool" | "task" | "embedding" | "retrieval";
  app_name: string;
  start_ns: number;
  end_ns: number;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  metrics?: Record<string, number>;
  tags?: Record<string, string>;
  error?: { type: string; message: string } | null;
  session_id?: string | null;
  prompt?: unknown;
  model_name?: string | null;
  model_provider?: string | null;
}

export async function ingestSpans(payloads: IngestSpanPayload[]): Promise<number> {
  const rows: SpanInsert[] = payloads.map((p) => ({
    spanId: p.span_id,
    traceId: p.trace_id,
    parentId: p.parent_id ?? null,
    name: p.name,
    kind: p.kind,
    appName: p.app_name,
    startNs: BigInt(p.start_ns),
    endNs: BigInt(p.end_ns),
    inputData: p.input ?? null,
    outputData: p.output ?? null,
    metadata: p.metadata ?? {},
    metrics: p.metrics ?? {},
    tags: p.tags ?? {},
    error: p.error ?? null,
    sessionId: p.session_id ?? null,
    prompt: p.prompt ?? null,
    modelName: p.model_name ?? null,
    modelProvider: p.model_provider ?? null,
  }));

  const result = await db.insert(spans).values(rows).onConflictDoNothing();
  return rows.length;
}
