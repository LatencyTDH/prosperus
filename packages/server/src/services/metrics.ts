import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import { spans } from "../db/schema.js";

export interface MetricsSnapshot {
  totalTraces: number;
  totalSpans: number;
  errorRate: number;
  avgDurationMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  modelBreakdown: Array<{ model: string; provider: string; count: number }>;
  spanKindBreakdown: Array<{ kind: string; count: number }>;
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
    })
    .from(spans)
    .where(eq(spans.appName, appName));

  const modelBreakdown = await db
    .select({
      model: spans.modelName,
      provider: spans.modelProvider,
      count: sql<number>`count(*)::int`,
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

  return {
    totalTraces: overview.totalTraces,
    totalSpans: overview.totalSpans,
    errorRate: overview.totalSpans > 0 ? overview.errorCount / overview.totalSpans : 0,
    avgDurationMs: overview.avgDurationMs ?? 0,
    totalInputTokens: overview.totalInputTokens,
    totalOutputTokens: overview.totalOutputTokens,
    modelBreakdown: modelBreakdown.filter((m) => m.model != null) as Array<{
      model: string;
      provider: string;
      count: number;
    }>,
    spanKindBreakdown: spanKindBreakdown as Array<{ kind: string; count: number }>,
  };
}
