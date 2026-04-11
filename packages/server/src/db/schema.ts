import {
  pgTable,
  text,
  bigint,
  jsonb,
  timestamp,
  real,
  index,
  varchar,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";

export const spanKindEnum = pgEnum("span_kind", [
  "llm",
  "workflow",
  "agent",
  "tool",
  "task",
  "embedding",
  "retrieval",
]);

// ── Spans ──────────────────────────────────────────────────────────────────

export const spans = pgTable(
  "spans",
  {
    spanId: varchar("span_id", { length: 32 }).primaryKey(),
    traceId: varchar("trace_id", { length: 32 }).notNull(),
    parentId: varchar("parent_id", { length: 32 }),
    name: text("name").notNull(),
    kind: spanKindEnum("kind").notNull(),
    appName: text("app_name").notNull(),
    startNs: bigint("start_ns", { mode: "bigint" }).notNull(),
    endNs: bigint("end_ns", { mode: "bigint" }).notNull(),
    inputData: jsonb("input_data"),
    outputData: jsonb("output_data"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    metrics: jsonb("metrics").$type<Record<string, number>>().default({}),
    tags: jsonb("tags").$type<Record<string, string>>().default({}),
    error: jsonb("error").$type<{ type: string; message: string } | null>(),
    sessionId: text("session_id"),
    prompt: jsonb("prompt"),
    modelName: text("model_name"),
    modelProvider: text("model_provider"),
    // Estimated cost in USD (computed on ingestion for supported providers)
    inputCost: real("input_cost"),
    outputCost: real("output_cost"),
    totalCost: real("total_cost"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_spans_trace_id").on(table.traceId),
    index("idx_spans_app_name").on(table.appName),
    index("idx_spans_kind").on(table.kind),
    index("idx_spans_created_at").on(table.createdAt),
    index("idx_spans_session_id").on(table.sessionId),
    index("idx_spans_model").on(table.modelName, table.modelProvider),
  ]
);

// ── Evaluations ────────────────────────────────────────────────────────────

export const evaluations = pgTable(
  "evaluations",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    spanId: varchar("span_id", { length: 32 }),
    traceId: varchar("trace_id", { length: 32 }),
    appName: text("app_name").notNull(),
    label: text("label").notNull(),
    metricType: text("metric_type").notNull(), // "score" | "categorical"
    numericValue: real("numeric_value"),
    stringValue: text("string_value"),
    assessment: text("assessment"),
    reasoning: text("reasoning"),
    tags: jsonb("tags").$type<Record<string, string>>().default({}),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_eval_span_id").on(table.spanId),
    index("idx_eval_trace_id").on(table.traceId),
    index("idx_eval_app_name").on(table.appName),
    index("idx_eval_label").on(table.label),
  ]
);

// ── Prompts (version tracking) ─────────────────────────────────────────────

export const prompts = pgTable(
  "prompts",
  {
    id: varchar("id", { length: 128 }).notNull(),
    version: text("version").notNull(),
    template: text("template"),
    chatTemplate: jsonb("chat_template").$type<Array<{ role: string; content: string }>>(),
    variables: jsonb("variables").$type<Record<string, string>>().default({}),
    tags: jsonb("tags").$type<Record<string, string>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id, table.version] }),
    index("idx_prompts_id_version").on(table.id, table.version),
  ]
);

// ── Experiments ────────────────────────────────────────────────────────────

export const experiments = pgTable(
  "experiments",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    appName: text("app_name").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    baselineTag: text("baseline_tag"),
    variantTags: jsonb("variant_tags").$type<string[]>().default([]),
    status: text("status").notNull().default("running"), // running | completed
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    results: jsonb("results").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_experiments_app_name").on(table.appName),
    index("idx_experiments_status").on(table.status),
  ]
);

// ── Type helpers ───────────────────────────────────────────────────────────

export type SpanRow = typeof spans.$inferSelect;
export type SpanInsert = typeof spans.$inferInsert;
export type EvaluationRow = typeof evaluations.$inferSelect;
export type EvaluationInsert = typeof evaluations.$inferInsert;
export type PromptRow = typeof prompts.$inferSelect;
export type ExperimentRow = typeof experiments.$inferSelect;
export type ExperimentInsert = typeof experiments.$inferInsert;
