const BASE = "/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface TraceListItem {
  traceId: string;
  rootSpanName: string;
  appName: string;
  kind: string;
  startNs: string;
  spanCount: number;
  hasError: boolean;
}

export interface SpanRow {
  spanId: string;
  traceId: string;
  parentId: string | null;
  name: string;
  kind: string;
  appName: string;
  startNs: string;
  endNs: string;
  inputData: unknown;
  outputData: unknown;
  metadata: Record<string, unknown>;
  metrics: Record<string, number>;
  tags: Record<string, string>;
  error: { type: string; message: string } | null;
  sessionId: string | null;
  prompt: unknown;
  modelName: string | null;
  modelProvider: string | null;
}

export interface EvaluationRow {
  id: string;
  spanId: string | null;
  label: string;
  metricType: string;
  numericValue: number | null;
  stringValue: string | null;
  assessment: string | null;
  reasoning: string | null;
}

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

// ── API calls ──────────────────────────────────────────────────────────────

export function fetchTraces(appName?: string) {
  const params = appName ? `?app_name=${encodeURIComponent(appName)}` : "";
  return request<{ traces: TraceListItem[] }>(`/traces${params}`);
}

export function fetchTraceSpans(traceId: string) {
  return request<{ spans: SpanRow[] }>(`/traces/${traceId}`);
}

export function fetchSpanEvaluations(spanId: string) {
  return request<{ evaluations: EvaluationRow[] }>(`/spans/${spanId}/evaluations`);
}

export function fetchMetrics(appName: string) {
  return request<MetricsSnapshot>(`/apps/${encodeURIComponent(appName)}/metrics`);
}
