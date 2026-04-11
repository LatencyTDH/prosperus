import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import { spans, evaluations } from "../db/schema.js";

export interface MetricsSnapshot {
  totalTraces: number;
  totalSpans: number;
  errorRate: number;
  avgDurationMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  modelBreakdown: Array<{ model: string; provider: string; count: number; cost: number }>;
  spanKindBreakdown: Array<{ kind: string; count: number }>;
  evaluationBreakdown: Array<{ label: string; avgScore: number | null; count: number }>;
}

export async function getMetrics(appName: string): Promise<MetricsSnapshot> {
  const [overview] = await db
    .select({
      totalSpans: sql<number>`count(*)::int`,
      totalTraces: sql<number>`count(DISTINCT ${spans.traceId})::int`,
      errorCount: sql<number>`count(*) FILTER (WHERE ${spans.error} IS NOT NULL)::int`,
      avgDurationMs: sql<number>`avg((${spans.endNs} - ${spans.startNs}) / 1000000.0)::real`,
      totalInputTokens: sql<number>`coalesce(sum((${spans.metrics}->>'input_tokens')::real), 0)::real`,
      totalOutputTokens: sql<number>`coalesce(sum((${spans.metrics}->>'output_tokens')::real), 0)::real`,
      totalCost: sql<number>`coalesce(sum(${spans.totalCost}), 0)::real`,
    })
    .from(spans)
    .where(eq(spans.appName, appName));

  const modelBreakdown = await db
    .select({
      model: spans.modelName,
      provider: spans.modelProvider,
      count: sql<number>`count(*)::int`,
      cost: sql<number>`coalesce(sum(${spans.totalCost}), 0)::real`,
    })
    .from(spans)
    .where(eq(spans.appName, appName))
    .groupBy(spans.modelName, spans.modelProvider)
    .orderBy(desc(sql`count(*)`));

  const spanKindBreakdown = await db
    .select({
      kind: spans.kind,
      count: sql<number>`count(*)::int`,
    })
    .from(spans)
    .where(eq(spans.appName, appName))
    .groupBy(spans.kind)
    .orderBy(desc(sql`count(*)`));

  const evaluationBreakdown = await db
    .select({
      label: evaluations.label,
      avgScore: sql<number>`avg(${evaluations.numericValue})::real`,
      count: sql<number>`count(*)::int`,
    })
    .from(evaluations)
    .where(eq(evaluations.appName, appName))
    .groupBy(evaluations.label)
    .orderBy(desc(sql`count(*)`));

  return {
    totalTraces: overview.totalTraces,
    totalSpans: overview.totalSpans,
    errorRate: overview.totalSpans > 0 ? overview.errorCount / overview.totalSpans : 0,
    avgDurationMs: overview.avgDurationMs ?? 0,
    totalInputTokens: overview.totalInputTokens,
    totalOutputTokens: overview.totalOutputTokens,
    totalCost: overview.totalCost ?? 0,
    modelBreakdown: modelBreakdown.filter((m) => m.model != null) as Array<{
      model: string;
      provider: string;
      count: number;
      cost: number;
    }>,
    spanKindBreakdown: spanKindBreakdown as Array<{ kind: string; count: number }>,
    evaluationBreakdown: evaluationBreakdown as Array<{ label: string; avgScore: number | null; count: number }>,
  };
}

// ── Time-series metrics ────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  bucket: string;
  traces: number;
  errors: number;
  avgDurationMs: number;
  totalTokens: number;
  totalCost: number;
}

export async function getTimeSeries(
  appName: string,
  periodHours: number = 24
): Promise<TimeSeriesPoint[]> {
  const since = new Date(Date.now() - periodHours * 3600 * 1000);
  const interval = periodHours <= 24 ? "1 hour" : periodHours <= 168 ? "6 hours" : "1 day";

  const rows = await db
    .select({
      bucket: sql<string>`date_trunc(${interval}, ${spans.createdAt})::text`,
      traces: sql<number>`count(DISTINCT ${spans.traceId})::int`,
      errors: sql<number>`count(*) FILTER (WHERE ${spans.error} IS NOT NULL)::int`,
      avgDurationMs: sql<number>`avg((${spans.endNs} - ${spans.startNs}) / 1000000.0)::real`,
      totalTokens: sql<number>`coalesce(sum((${spans.metrics}->>'input_tokens')::real + coalesce((${spans.metrics}->>'output_tokens')::real, 0)), 0)::real`,
      totalCost: sql<number>`coalesce(sum(${spans.totalCost}), 0)::real`,
    })
    .from(spans)
    .where(and(eq(spans.appName, appName), gte(spans.createdAt, since)))
    .groupBy(sql`date_trunc(${interval}, ${spans.createdAt})`)
    .orderBy(sql`date_trunc(${interval}, ${spans.createdAt})`);

  return rows;
}
