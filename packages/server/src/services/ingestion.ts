import { db } from "../db/connection.js";
import { spans, prompts, type SpanInsert } from "../db/schema.js";
import { estimateCost } from "./cost.js";

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
  const rows: SpanInsert[] = payloads.map((p) => {
    // Auto-calculate cost for LLM/embedding spans
    let inputCost: number | null = null;
    let outputCost: number | null = null;
    let totalCost: number | null = null;

    if ((p.kind === "llm" || p.kind === "embedding") && p.model_provider && p.model_name && p.metrics) {
      const cost = estimateCost(p.model_provider, p.model_name, p.metrics);
      if (cost) {
        inputCost = cost.inputCost;
        outputCost = cost.outputCost;
        totalCost = cost.totalCost;
      }
    }

    return {
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
      inputCost,
      outputCost,
      totalCost,
    };
  });

  // Upsert prompt versions if any spans include prompt metadata
  const promptRows = payloads
    .filter((p) => p.prompt && typeof p.prompt === "object")
    .map((p) => {
      const pr = p.prompt as Record<string, unknown>;
      return {
        id: String(pr.id ?? "unknown"),
        version: String(pr.version ?? "auto"),
        template: pr.template ? String(pr.template) : null,
        chatTemplate: pr.chat_template as Array<{ role: string; content: string }> | undefined ?? null,
        variables: (pr.variables as Record<string, string>) ?? {},
        tags: (pr.tags as Record<string, string>) ?? {},
      };
    })
    .filter((pr) => pr.id !== "unknown");

  if (promptRows.length > 0) {
    await db.insert(prompts).values(promptRows).onConflictDoNothing();
  }

  await db.insert(spans).values(rows).onConflictDoNothing();
  return rows.length;
}
