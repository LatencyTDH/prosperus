import postgres from "postgres";
import { describe, it, expect } from "vitest";
import { buildServer } from "../src/server.js";

/**
 * Integration tests — require a running PostgreSQL instance.
 * Run with: DATABASE_URL=... pnpm --filter @prosperus/server db:migrate && pnpm --filter @prosperus/server test
 * Skipped when DATABASE_URL is not set, DB is unreachable, or migrations have not been applied.
 */
async function hasReadyDatabase(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return false;
  }

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    await sql`select 1`;
    const rows = await sql<{ migrationsApplied: boolean }[]>`
      select to_regclass('public.spans') is not null as "migrationsApplied"
    `;
    return rows[0]?.migrationsApplied ?? false;
  } catch {
    return false;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

const hasDatabase = await hasReadyDatabase();

describe.skipIf(!hasDatabase)("span ingestion integration", () => {
  const testSpan = {
    trace_id: "trace-integration-001",
    span_id: "span-integration-001",
    parent_id: null,
    name: "test-workflow",
    kind: "workflow" as const,
    app_name: "integration-test",
    start_ns: 1700000000000000000,
    end_ns: 1700000001000000000,
    input: { prompt: "hello" },
    output: { response: "world" },
    metadata: { env: "test" },
    metrics: { input_tokens: 5, output_tokens: 3 },
    tags: { suite: "integration" },
    error: null,
    session_id: null,
    model_name: "gpt-4o",
    model_provider: "openai",
  };

  it("ingests a span and retrieves it by trace ID", async () => {
    const app = await buildServer();

    // Ingest
    const ingestRes = await app.inject({
      method: "POST",
      url: "/v1/spans",
      headers: { authorization: "Bearer test-key" },
      payload: { spans: [testSpan] },
    });
    expect(ingestRes.statusCode).toBe(200);
    expect(ingestRes.json().ingested).toBe(1);

    // Query back
    const traceRes = await app.inject({
      method: "GET",
      url: `/v1/traces/${testSpan.trace_id}`,
      headers: { authorization: "Bearer test-key" },
    });
    expect(traceRes.statusCode).toBe(200);

    const { spans } = traceRes.json();
    expect(spans).toHaveLength(1);
    expect(spans[0].spanId).toBe(testSpan.span_id);
    expect(spans[0].name).toBe("test-workflow");
    expect(spans[0].kind).toBe("workflow");
  });

  it("ingests parent and child spans preserving the relationship", async () => {
    const app = await buildServer();

    const parent = {
      ...testSpan,
      trace_id: "trace-integration-002",
      span_id: "span-parent-002",
      name: "parent-workflow",
    };
    const child = {
      ...testSpan,
      trace_id: "trace-integration-002",
      span_id: "span-child-002",
      parent_id: "span-parent-002",
      name: "child-llm",
      kind: "llm" as const,
    };

    const ingestRes = await app.inject({
      method: "POST",
      url: "/v1/spans",
      headers: { authorization: "Bearer test-key" },
      payload: { spans: [parent, child] },
    });
    expect(ingestRes.statusCode).toBe(200);
    expect(ingestRes.json().ingested).toBe(2);

    const traceRes = await app.inject({
      method: "GET",
      url: "/v1/traces/trace-integration-002",
      headers: { authorization: "Bearer test-key" },
    });
    expect(traceRes.statusCode).toBe(200);

    const { spans } = traceRes.json();
    expect(spans).toHaveLength(2);

    const childSpan = spans.find((s: { spanId: string }) => s.spanId === "span-child-002");
    expect(childSpan).toBeDefined();
    expect(childSpan.parentId).toBe("span-parent-002");
  });
});
