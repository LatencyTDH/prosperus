import { db } from "../db/connection.js";
import { evaluations, spans, type EvaluationInsert } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

interface EvaluationPayload {
  label: string;
  metric_type: string;
  value: number | string;
  app_name: string;
  span_context?: { trace_id: string; span_id: string };
  span_with_tag_value?: { tag_key: string; tag_value: string };
  tags?: Record<string, string>;
  assessment?: string;
  reasoning?: string;
  metadata?: Record<string, unknown>;
}

export async function submitEvaluations(payloads: EvaluationPayload[]): Promise<number> {
  const rows: EvaluationInsert[] = [];

  for (const p of payloads) {
    let spanId: string | null = null;
    let traceId: string | null = null;

    if (p.span_context) {
      spanId = p.span_context.span_id;
      traceId = p.span_context.trace_id;
    } else if (p.span_with_tag_value) {
      // Resolve span by tag lookup using jsonb containment operator
      const { tag_key, tag_value } = p.span_with_tag_value;
      const [found] = await db
        .select({ spanId: spans.spanId, traceId: spans.traceId })
        .from(spans)
        .where(
          and(
            eq(spans.appName, p.app_name),
            sql`${spans.tags} @> ${JSON.stringify({ [tag_key]: tag_value })}::jsonb`
          )
        )
        .limit(1);

      if (found) {
        spanId = found.spanId;
        traceId = found.traceId;
      }
    }

    rows.push({
      id: nanoid(16),
      spanId,
      traceId,
      appName: p.app_name,
      label: p.label,
      metricType: p.metric_type,
      numericValue: typeof p.value === "number" ? p.value : null,
      stringValue: typeof p.value === "string" ? p.value : null,
      assessment: p.assessment ?? null,
      reasoning: p.reasoning ?? null,
      tags: p.tags ?? {},
      metadata: p.metadata ?? {},
    });
  }

  if (rows.length > 0) {
    await db.insert(evaluations).values(rows);
  }
  return rows.length;
}
