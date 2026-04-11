import { beforeEach, describe, expect, it, vi } from "vitest";

const queuedSelectResults: unknown[][] = [];
const insertCalls: Array<{ table: unknown; rows: unknown }> = [];

function createSelectBuilder(result: unknown[]) {
  const promise = Promise.resolve(result);
  const builder = {
    from: vi.fn(() => builder),
    where: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    groupBy: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    offset: vi.fn(() => builder),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };

  return builder;
}

function createInsertBuilder(table: unknown) {
  const promise = Promise.resolve(undefined);
  const valueBuilder = {
    onConflictDoNothing: vi.fn(() => valueBuilder),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };

  return {
    values: vi.fn((rows: unknown) => {
      insertCalls.push({ table, rows });
      return valueBuilder;
    }),
  };
}

const db = {
  select: vi.fn(() => createSelectBuilder(queuedSelectResults.shift() ?? [])),
  insert: vi.fn((table: unknown) => createInsertBuilder(table)),
};

vi.mock("../src/db/connection.js", () => ({ db }));
vi.mock("nanoid", () => ({ nanoid: () => "fixed-generated-id" }));

const { buildServer } = await import("../src/server.js");

function queueSelectResults(...results: unknown[][]) {
  queuedSelectResults.push(...results);
}

async function withServer(
  run: (app: Awaited<ReturnType<typeof buildServer>>) => Promise<void>,
) {
  const app = await buildServer();
  try {
    await run(app);
  } finally {
    await app.close();
  }
}

beforeEach(() => {
  queuedSelectResults.length = 0;
  insertCalls.length = 0;
  vi.clearAllMocks();
  process.env.LOG_LEVEL = "silent";
});

describe("public API behavior", () => {
  it("accepts span ingestion and computes prompt + cost side effects", async () => {
    await withServer(async (app) => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/spans",
        headers: { authorization: "Bearer test-key" },
        payload: {
          spans: [
            {
              trace_id: "trace-1",
              span_id: "span-1",
              name: "answer question",
              kind: "llm",
              app_name: "support-bot",
              start_ns: 1700000000000000000,
              end_ns: 1700000000200000000,
              metrics: { input_tokens: 100, output_tokens: 50 },
              prompt: {
                id: "support.answer",
                version: "v3",
                template: "Answer the user clearly.",
              },
              model_name: "gpt-5.4",
              model_provider: "openai",
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ingested: 1 });
      expect(insertCalls).toHaveLength(2);

      const promptInsert = insertCalls[0].rows as Array<
        Record<string, unknown>
      >;
      const spanInsert = insertCalls[1].rows as Array<Record<string, unknown>>;

      expect(promptInsert[0]).toMatchObject({
        id: "support.answer",
        version: "v3",
      });
      expect(spanInsert[0]).toMatchObject({
        spanId: "span-1",
        traceId: "trace-1",
        appName: "support-bot",
        totalCost: 0.00075,
      });
    });
  });

  it("lists traces with filters and serializes bigint timestamps", async () => {
    queueSelectResults(
      [
        {
          traceId: "trace-1",
          name: "checkout",
          appName: "shop-bot",
          kind: "workflow",
          startNs: 1700000000000000000n,
          endNs: 1700000000500000000n,
          sessionId: "session-1",
          modelName: "gpt-5.4",
        },
      ],
      [
        {
          traceId: "trace-1",
          count: 2,
          hasError: true,
          totalCost: 1.25,
        },
      ],
    );

    await withServer(async (app) => {
      const res = await app.inject({
        method: "GET",
        url: "/v1/traces?app_name=shop-bot&limit=10&offset=5&kind=workflow&has_error=true&session_id=session-1&search=check",
        headers: { authorization: "Bearer test-key" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        traces: [
          {
            traceId: "trace-1",
            rootSpanName: "checkout",
            appName: "shop-bot",
            kind: "workflow",
            startNs: "1700000000000000000",
            spanCount: 2,
            hasError: true,
            totalCost: 1.25,
            sessionId: "session-1",
            modelName: "gpt-5.4",
            durationMs: 500,
          },
        ],
      });
    });
  });

  it("rejects invalid list query parameters", async () => {
    await withServer(async (app) => {
      const res = await app.inject({
        method: "GET",
        url: "/v1/traces?limit=999",
        headers: { authorization: "Bearer test-key" },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  it("returns a trace detail waterfall payload and span evaluations", async () => {
    queueSelectResults(
      [
        {
          spanId: "root-span",
          traceId: "trace-1",
          parentId: null,
          name: "checkout",
          kind: "workflow",
          appName: "shop-bot",
          startNs: 1700000000000000000n,
          endNs: 1700000000500000000n,
          inputData: { prompt: "hello" },
          outputData: { answer: "world" },
          metadata: {},
          metrics: { input_tokens: 10 },
          tags: {},
          error: null,
          sessionId: "session-1",
          prompt: null,
          modelName: null,
          modelProvider: null,
          inputCost: null,
          outputCost: null,
          totalCost: 0.1,
        },
        {
          spanId: "child-span",
          traceId: "trace-1",
          parentId: "root-span",
          name: "call model",
          kind: "llm",
          appName: "shop-bot",
          startNs: 1700000000100000000n,
          endNs: 1700000000400000000n,
          inputData: { question: "Where is my order?" },
          outputData: { answer: "In transit" },
          metadata: {},
          metrics: { input_tokens: 10, output_tokens: 4 },
          tags: { env: "test" },
          error: { type: "Timeout", message: "model timed out" },
          sessionId: "session-1",
          prompt: { id: "order.status", version: "v1" },
          modelName: "gpt-5.4",
          modelProvider: "openai",
          inputCost: 0.01,
          outputCost: 0.02,
          totalCost: 0.03,
        },
      ],
      [
        {
          id: "eval-1",
          spanId: "child-span",
          traceId: "trace-1",
          appName: "shop-bot",
          label: "toxicity",
          metricType: "score",
          numericValue: 0.1,
          stringValue: null,
          assessment: "pass",
          reasoning: "Safe output",
          tags: {},
          metadata: {},
          createdAt: "2026-04-11T12:00:00.000Z",
        },
      ],
    );

    await withServer(async (app) => {
      const traceRes = await app.inject({
        method: "GET",
        url: "/v1/traces/trace-1",
        headers: { authorization: "Bearer test-key" },
      });

      expect(traceRes.statusCode).toBe(200);
      expect(traceRes.json().spans[1]).toMatchObject({
        spanId: "child-span",
        startNs: "1700000000100000000",
        endNs: "1700000000400000000",
      });

      const evalRes = await app.inject({
        method: "GET",
        url: "/v1/spans/child-span/evaluations",
        headers: { authorization: "Bearer test-key" },
      });

      expect(evalRes.statusCode).toBe(200);
      expect(evalRes.json()).toEqual({
        evaluations: [
          expect.objectContaining({
            id: "eval-1",
            label: "toxicity",
            assessment: "pass",
          }),
        ],
      });
    });
  });

  it("lists sessions, evaluations, and apps", async () => {
    queueSelectResults(
      [
        {
          sessionId: "session-1",
          traceCount: 3,
          spanCount: 7,
          firstSeen: new Date("2026-04-11T10:00:00.000Z"),
          lastSeen: new Date("2026-04-11T10:02:00.000Z"),
          appName: "shop-bot",
        },
      ],
      [
        {
          id: "eval-1",
          spanId: "child-span",
          traceId: "trace-1",
          appName: "shop-bot",
          label: "toxicity",
          metricType: "score",
          numericValue: 0.1,
          stringValue: null,
          assessment: "pass",
          reasoning: null,
          tags: {},
          metadata: {},
          createdAt: "2026-04-11T12:00:00.000Z",
        },
      ],
      [{ appName: "shop-bot", traceCount: 12 }],
    );

    await withServer(async (app) => {
      const sessionRes = await app.inject({
        method: "GET",
        url: "/v1/sessions?app_name=shop-bot&limit=10",
        headers: { authorization: "Bearer test-key" },
      });
      expect(sessionRes.statusCode).toBe(200);
      expect(sessionRes.json().sessions[0]).toMatchObject({
        sessionId: "session-1",
        spanCount: 7,
      });

      const evalRes = await app.inject({
        method: "GET",
        url: "/v1/evaluations?app_name=shop-bot&label=toxicity",
        headers: { authorization: "Bearer test-key" },
      });
      expect(evalRes.statusCode).toBe(200);
      expect(evalRes.json().evaluations).toHaveLength(1);

      const appsRes = await app.inject({
        method: "GET",
        url: "/v1/apps",
        headers: { authorization: "Bearer test-key" },
      });
      expect(appsRes.statusCode).toBe(200);
      expect(appsRes.json()).toEqual({
        apps: [{ appName: "shop-bot", traceCount: 12 }],
      });
    });
  });

  it("rejects invalid sessions query parameters", async () => {
    await withServer(async (app) => {
      const res = await app.inject({
        method: "GET",
        url: "/v1/sessions?limit=0",
        headers: { authorization: "Bearer test-key" },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  it("submits evaluations by resolving a span from tag filters", async () => {
    queueSelectResults([{ spanId: "span-1", traceId: "trace-1" }]);

    await withServer(async (app) => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/evaluations",
        headers: { authorization: "Bearer test-key" },
        payload: {
          evaluations: [
            {
              label: "toxicity",
              metric_type: "score",
              value: 0.1,
              app_name: "shop-bot",
              span_with_tag_value: {
                tag_key: "order_id",
                tag_value: "ord_123",
              },
              assessment: "pass",
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ submitted: 1 });

      const inserted = insertCalls[0].rows as Array<Record<string, unknown>>;
      expect(inserted[0]).toMatchObject({
        id: "fixed-generated-id",
        spanId: "span-1",
        traceId: "trace-1",
        appName: "shop-bot",
      });
    });
  });

  it("rejects invalid evaluation payloads", async () => {
    await withServer(async (app) => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/evaluations",
        headers: { authorization: "Bearer test-key" },
        payload: { evaluations: [] },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  it("returns metrics and timeseries data", async () => {
    queueSelectResults(
      [
        {
          totalSpans: 6,
          totalTraces: 2,
          errorCount: 1,
          avgDurationMs: 240,
          totalInputTokens: 100,
          totalOutputTokens: 25,
          totalCost: 3.5,
        },
      ],
      [{ model: "gpt-5.4", provider: "openai", count: 4, cost: 3.5 }],
      [{ kind: "llm", count: 4 }],
      [{ label: "toxicity", avgScore: 0.1, count: 2 }],
      [
        {
          bucket: "2026-04-11 10:00:00",
          traces: 2,
          errors: 1,
          avgDurationMs: 240,
          totalTokens: 125,
          totalCost: 3.5,
        },
      ],
    );

    await withServer(async (app) => {
      const metricsRes = await app.inject({
        method: "GET",
        url: "/v1/apps/shop-bot/metrics",
        headers: { authorization: "Bearer test-key" },
      });
      expect(metricsRes.statusCode).toBe(200);
      expect(metricsRes.json()).toMatchObject({
        totalTraces: 2,
        totalSpans: 6,
        errorRate: 1 / 6,
        totalCost: 3.5,
        modelBreakdown: [
          { model: "gpt-5.4", provider: "openai", count: 4, cost: 3.5 },
        ],
      });

      const timeseriesRes = await app.inject({
        method: "GET",
        url: "/v1/apps/shop-bot/timeseries?period_hours=168",
        headers: { authorization: "Bearer test-key" },
      });
      expect(timeseriesRes.statusCode).toBe(200);
      expect(timeseriesRes.json()).toEqual({
        timeseries: [
          {
            bucket: "2026-04-11 10:00:00",
            traces: 2,
            errors: 1,
            avgDurationMs: 240,
            totalTokens: 125,
            totalCost: 3.5,
          },
        ],
      });
    });
  });

  it("rejects invalid timeseries period parameters", async () => {
    await withServer(async (app) => {
      const res = await app.inject({
        method: "GET",
        url: "/v1/apps/shop-bot/timeseries?period_hours=0",
        headers: { authorization: "Bearer test-key" },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  it("lists prompt summaries and version history", async () => {
    queueSelectResults(
      [
        {
          id: "order.status",
          versionCount: 2,
          latestVersion: "v2",
          lastUsed: new Date("2026-04-11T12:00:00.000Z"),
        },
      ],
      [
        {
          id: "order.status",
          version: "v2",
          template: "Check order state",
          chatTemplate: null,
          variables: { locale: "en" },
          tags: { team: "support" },
          createdAt: new Date("2026-04-11T12:00:00.000Z"),
        },
      ],
    );

    await withServer(async (app) => {
      const listRes = await app.inject({
        method: "GET",
        url: "/v1/prompts",
        headers: { authorization: "Bearer test-key" },
      });
      expect(listRes.statusCode).toBe(200);
      expect(listRes.json().prompts[0]).toMatchObject({
        id: "order.status",
        versionCount: 2,
      });

      const versionsRes = await app.inject({
        method: "GET",
        url: "/v1/prompts/order.status/versions",
        headers: { authorization: "Bearer test-key" },
      });
      expect(versionsRes.statusCode).toBe(200);
      expect(versionsRes.json().versions[0]).toMatchObject({
        version: "v2",
        template: "Check order state",
      });
    });
  });

  it("lists, creates, and fetches experiments", async () => {
    queueSelectResults(
      [
        {
          id: "exp-1",
          appName: "shop-bot",
          name: "Checkout prompt A/B",
          description: "Compare two prompts",
          baselineTag: "baseline",
          variantTags: ["variant-a"],
          status: "running",
          config: {},
          results: null,
          createdAt: new Date("2026-04-11T12:00:00.000Z"),
          updatedAt: new Date("2026-04-11T12:00:00.000Z"),
        },
      ],
      [
        {
          id: "exp-1",
          appName: "shop-bot",
          name: "Checkout prompt A/B",
          description: "Compare two prompts",
          baselineTag: "baseline",
          variantTags: ["variant-a"],
          status: "running",
          config: {},
          results: null,
          createdAt: new Date("2026-04-11T12:00:00.000Z"),
          updatedAt: new Date("2026-04-11T12:00:00.000Z"),
        },
      ],
    );

    await withServer(async (app) => {
      const listRes = await app.inject({
        method: "GET",
        url: "/v1/experiments?app_name=shop-bot",
        headers: { authorization: "Bearer test-key" },
      });
      expect(listRes.statusCode).toBe(200);
      expect(listRes.json().experiments).toHaveLength(1);

      const createRes = await app.inject({
        method: "POST",
        url: "/v1/experiments",
        headers: { authorization: "Bearer test-key" },
        payload: {
          app_name: "shop-bot",
          name: "Checkout prompt A/B",
          baseline_tag: "baseline",
          variant_tags: ["variant-a"],
        },
      });
      expect(createRes.statusCode).toBe(200);
      expect(createRes.json()).toEqual({ id: "fixed-generated-id" });

      const detailRes = await app.inject({
        method: "GET",
        url: "/v1/experiments/exp-1",
        headers: { authorization: "Bearer test-key" },
      });
      expect(detailRes.statusCode).toBe(200);
      expect(detailRes.json().experiment).toMatchObject({
        id: "exp-1",
        name: "Checkout prompt A/B",
      });
    });
  });

  it("rejects invalid experiment payloads", async () => {
    await withServer(async (app) => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/experiments",
        headers: { authorization: "Bearer test-key" },
        payload: { app_name: "shop-bot" },
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
