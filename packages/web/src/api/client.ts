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
  totalCost: number | null;
  sessionId: string | null;
  modelName: string | null;
  durationMs: number;
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
  inputCost: number | null;
  outputCost: number | null;
  totalCost: number | null;
}

export interface EvaluationRow {
  id: string;
  spanId: string | null;
  traceId: string | null;
  appName: string;
  label: string;
  metricType: string;
  numericValue: number | null;
  stringValue: string | null;
  assessment: string | null;
  reasoning: string | null;
  tags: Record<string, string>;
  metadata: Record<string, unknown>;
  createdAt: string;
}

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

export interface TimeSeriesPoint {
  bucket: string;
  traces: number;
  errors: number;
  avgDurationMs: number;
  totalTokens: number;
  totalCost: number;
}

export interface SessionListItem {
  sessionId: string;
  traceCount: number;
  spanCount: number;
  firstSeen: string;
  lastSeen: string;
  appName: string;
}

export interface PromptSummary {
  id: string;
  versionCount: number;
  latestVersion: string;
  lastUsed: string;
}

export interface PromptVersion {
  id: string;
  version: string;
  template: string | null;
  chatTemplate: Array<{ role: string; content: string }> | null;
  variables: Record<string, string>;
  tags: Record<string, string>;
  createdAt: string;
}

export interface ExperimentRow {
  id: string;
  appName: string;
  name: string;
  description: string | null;
  baselineTag: string | null;
  variantTags: string[];
  status: string;
  config: Record<string, unknown>;
  results: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppInfo {
  appName: string;
  traceCount: number;
}

// ── API calls ──────────────────────────────────────────────────────────────

export function fetchTraces(params?: {
  appName?: string;
  kind?: string;
  hasError?: boolean;
  sessionId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.appName) qs.set("app_name", params.appName);
  if (params?.kind) qs.set("kind", params.kind);
  if (params?.hasError !== undefined) qs.set("has_error", String(params.hasError));
  if (params?.sessionId) qs.set("session_id", params.sessionId);
  if (params?.search) qs.set("search", params.search);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const q = qs.toString();
  return request<{ traces: TraceListItem[] }>(`/traces${q ? `?${q}` : ""}`);
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

export function fetchTimeSeries(appName: string, periodHours = 24) {
  return request<{ timeseries: TimeSeriesPoint[] }>(
    `/apps/${encodeURIComponent(appName)}/timeseries?period_hours=${periodHours}`
  );
}

export function fetchSessions(appName?: string) {
  const qs = appName ? `?app_name=${encodeURIComponent(appName)}` : "";
  return request<{ sessions: SessionListItem[] }>(`/sessions${qs}`);
}

export function fetchEvaluations(params?: { appName?: string; label?: string }) {
  const qs = new URLSearchParams();
  if (params?.appName) qs.set("app_name", params.appName);
  if (params?.label) qs.set("label", params.label);
  const q = qs.toString();
  return request<{ evaluations: EvaluationRow[] }>(`/evaluations${q ? `?${q}` : ""}`);
}

export function fetchApps() {
  return request<{ apps: AppInfo[] }>("/apps");
}

export function fetchPrompts() {
  return request<{ prompts: PromptSummary[] }>("/prompts");
}

export function fetchPromptVersions(promptId: string) {
  return request<{ versions: PromptVersion[] }>(
    `/prompts/${encodeURIComponent(promptId)}/versions`
  );
}

export function fetchExperiments(appName?: string) {
  const qs = appName ? `?app_name=${encodeURIComponent(appName)}` : "";
  return request<{ experiments: ExperimentRow[] }>(`/experiments${qs}`);
}

export function createExperiment(data: {
  app_name: string;
  name: string;
  description?: string;
  baseline_tag?: string;
  variant_tags?: string[];
}) {
  return request<{ id: string }>("/experiments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
