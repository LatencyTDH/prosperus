import { and, desc, eq, gte, inArray, lte, sql, like, isNotNull } from "drizzle-orm";
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
  totalCost: number | null;
  sessionId: string | null;
  modelName: string | null;
  durationMs: number;
}

export async function listTraces(opts: {
  appName?: string;
  limit?: number;
  offset?: number;
  startAfter?: Date;
  startBefore?: Date;
  kind?: string;
  hasError?: boolean;
  sessionId?: string;
  search?: string;
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
  if (opts.kind) {
    conditions.push(sql`${spans.kind} = ${opts.kind}`);
  }
  if (opts.hasError === true) {
    conditions.push(isNotNull(spans.error));
  }
  if (opts.sessionId) {
    conditions.push(eq(spans.sessionId, opts.sessionId));
  }
  if (opts.search) {
    conditions.push(like(spans.name, `%${opts.search}%`));
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

  const counts = await db
    .select({
      traceId: spans.traceId,
      count: sql<number>`count(*)::int`,
      hasError: sql<boolean>`bool_or(${spans.error} IS NOT NULL)`,
      totalCost: sql<number>`coalesce(sum(${spans.totalCost}), 0)::real`,
    })
    .from(spans)
    .where(inArray(spans.traceId, traceIds))
    .groupBy(spans.traceId);

  const countMap = new Map(counts.map((c) => [c.traceId, c]));

  return roots.map((root) => {
    const c = countMap.get(root.traceId);
    const durationMs = Number(root.endNs - root.startNs) / 1_000_000;
    return {
      traceId: root.traceId,
      rootSpanName: root.name,
      appName: root.appName,
      kind: root.kind,
      startNs: root.startNs,
      spanCount: c?.count ?? 1,
      hasError: c?.hasError ?? false,
      totalCost: c?.totalCost ?? null,
      sessionId: root.sessionId,
      modelName: root.modelName,
      durationMs,
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

// ── Sessions ───────────────────────────────────────────────────────────────

export interface SessionListItem {
  sessionId: string;
  traceCount: number;
  spanCount: number;
  firstSeen: Date;
  lastSeen: Date;
  appName: string;
}

export async function listSessions(opts: {
  appName?: string;
  limit?: number;
  offset?: number;
}): Promise<SessionListItem[]> {
  const conditions = [isNotNull(spans.sessionId)];
  if (opts.appName) {
    conditions.push(eq(spans.appName, opts.appName));
  }

  const rows = await db
    .select({
      sessionId: spans.sessionId,
      traceCount: sql<number>`count(DISTINCT ${spans.traceId})::int`,
      spanCount: sql<number>`count(*)::int`,
      firstSeen: sql<Date>`min(${spans.createdAt})`,
      lastSeen: sql<Date>`max(${spans.createdAt})`,
      appName: spans.appName,
    })
    .from(spans)
    .where(and(...conditions))
    .groupBy(spans.sessionId, spans.appName)
    .orderBy(desc(sql`max(${spans.createdAt})`))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);

  return rows.filter((r) => r.sessionId != null) as SessionListItem[];
}

// ── Evaluations listing ────────────────────────────────────────────────────

export async function listEvaluations(opts: {
  appName?: string;
  label?: string;
  limit?: number;
  offset?: number;
}): Promise<EvaluationRow[]> {
  const conditions = [];
  if (opts.appName) conditions.push(eq(evaluations.appName, opts.appName));
  if (opts.label) conditions.push(eq(evaluations.label, opts.label));

  return db
    .select()
    .from(evaluations)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(evaluations.createdAt))
    .limit(opts.limit ?? 100)
    .offset(opts.offset ?? 0);
}

// ── Apps listing ───────────────────────────────────────────────────────────

export async function listApps(): Promise<Array<{ appName: string; traceCount: number }>> {
  return db
    .select({
      appName: spans.appName,
      traceCount: sql<number>`count(DISTINCT ${spans.traceId})::int`,
    })
    .from(spans)
    .groupBy(spans.appName)
    .orderBy(desc(sql`count(DISTINCT ${spans.traceId})`));
}
