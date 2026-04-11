import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import { spans, evaluations, type SpanRow, type EvaluationRow } from "../db/schema.js";

export interface TraceListItem {
  traceId: string;
  rootSpanName: string;
  appName: string;
  kind: string;
  startNs: bigint;
  spanCount: number;
  hasError: boolean;
}

export async function listTraces(opts: {
  appName?: string;
  limit?: number;
  offset?: number;
  startAfter?: Date;
  startBefore?: Date;
}): Promise<TraceListItem[]> {
  const conditions = [sql`${spans.parentId} IS NULL`];

  if (opts.appName) {
    conditions.push(eq(spans.appName, opts.appName));
  }
  if (opts.startAfter) {
    conditions.push(gte(spans.createdAt, opts.startAfter));
  }
  if (opts.startBefore) {
    conditions.push(lte(spans.createdAt, opts.startBefore));
  }

  const roots = await db
    .select()
    .from(spans)
    .where(and(...conditions))
    .orderBy(desc(spans.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);

  const traceIds = roots.map((r) => r.traceId);
  if (traceIds.length === 0) return [];

  // Count children per trace
  const counts = await db
    .select({
      traceId: spans.traceId,
      count: sql<number>`count(*)::int`,
      hasError: sql<boolean>`bool_or(${spans.error} IS NOT NULL)`,
    })
    .from(spans)
    .where(sql`${spans.traceId} IN ${traceIds}`)
    .groupBy(spans.traceId);

  const countMap = new Map(counts.map((c) => [c.traceId, c]));

  return roots.map((root) => {
    const c = countMap.get(root.traceId);
    return {
      traceId: root.traceId,
      rootSpanName: root.name,
      appName: root.appName,
      kind: root.kind,
      startNs: root.startNs,
      spanCount: c?.count ?? 1,
      hasError: c?.hasError ?? false,
    };
  });
}

export async function getTraceSpans(traceId: string): Promise<SpanRow[]> {
  return db
    .select()
    .from(spans)
    .where(eq(spans.traceId, traceId))
    .orderBy(spans.startNs);
}

export async function getSpanEvaluations(spanId: string): Promise<EvaluationRow[]> {
  return db
    .select()
    .from(evaluations)
    .where(eq(evaluations.spanId, spanId))
    .orderBy(desc(evaluations.createdAt));
}
