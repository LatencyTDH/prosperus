import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Sidebar } from "../src/components/Sidebar";
import { DashboardPage } from "../src/pages/DashboardPage";
import { TracesPage } from "../src/pages/TracesPage";
import { TraceDetailPage } from "../src/pages/TraceDetailPage";
import { EvaluationsPage } from "../src/pages/EvaluationsPage";
import { PromptsPage } from "../src/pages/PromptsPage";
import { SessionsPage } from "../src/pages/SessionsPage";
import { ExperimentsPage } from "../src/pages/ExperimentsPage";
import { CostPage } from "../src/pages/CostPage";
import { SpanTree } from "../src/components/SpanTree";
import { SpanDetail } from "../src/components/SpanDetail";
import type { SpanRow } from "../src/api/client";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function installFetchMock(handler: (url: URL, init?: RequestInit) => unknown | Promise<unknown>) {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(raw, "http://localhost");
    const body = await handler(url, init);
    return jsonResponse(body);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function renderWithProviders(ui: React.ReactNode, route = "/") {
  const client = createClient();
  const rendered = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );

  return { ...rendered, client };
}

function buildSpan(overrides: Partial<SpanRow> = {}): SpanRow {
  return {
    spanId: "span-root",
    traceId: "trace-1",
    parentId: null,
    name: "checkout",
    kind: "workflow",
    appName: "shop-bot",
    startNs: "1700000000000000000",
    endNs: "1700000000500000000",
    inputData: { prompt: "hello" },
    outputData: { answer: "world" },
    metadata: { env: "test" },
    metrics: { input_tokens: 10, output_tokens: 5 },
    tags: { team: "support" },
    error: null,
    sessionId: "session-1",
    prompt: { id: "order.status", version: "v1" },
    modelName: "gpt-4o",
    modelProvider: "openai",
    inputCost: 0.01,
    outputCost: 0.02,
    totalCost: 0.03,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("dashboard UI behavior", () => {
  it("loads apps in the sidebar, lets the user select one, and supports collapsing", async () => {
    const onSelectApp = vi.fn();
    installFetchMock((url) => {
      if (url.pathname === "/v1/apps") {
        return {
          apps: [
            { appName: "shop-bot", traceCount: 12 },
            { appName: "support-bot", traceCount: 4 },
          ],
        };
      }

      throw new Error(`Unhandled URL: ${url.pathname}${url.search}`);
    });

    const view = renderWithProviders(
      <Sidebar selectedApp="" onSelectApp={onSelectApp} />
    );

    const select = await screen.findByRole("combobox");
    expect(await screen.findByRole("option", { name: "shop-bot (12)" })).toBeTruthy();

    fireEvent.change(select, { target: { value: "support-bot" } });
    expect(onSelectApp).toHaveBeenCalledWith("support-bot");

    fireEvent.click(screen.getByTitle("Collapse sidebar"));
    expect(screen.getByTitle("Expand sidebar")).toBeTruthy();
    expect(screen.getByTitle("Prompts")).toBeTruthy();

    view.client.clear();
  });

  it("renders operational metrics and lets the user switch time windows", async () => {
    const fetchMock = installFetchMock((url) => {
      if (url.pathname === "/v1/apps/default/metrics") {
        return {
          totalTraces: 12,
          totalSpans: 45,
          errorRate: 0.25,
          avgDurationMs: 214,
          totalInputTokens: 1000,
          totalOutputTokens: 400,
          totalCost: 12.5,
          modelBreakdown: [{ model: "gpt-4o", provider: "openai", count: 10, cost: 12.5 }],
          spanKindBreakdown: [{ kind: "llm", count: 30 }],
          evaluationBreakdown: [{ label: "toxicity", avgScore: 0.1, count: 6 }],
        };
      }

      if (url.pathname === "/v1/apps/default/timeseries") {
        return {
          timeseries: [
            {
              bucket: "2026-04-11T10:00:00.000Z",
              traces: 4,
              errors: 1,
              avgDurationMs: 200,
              totalTokens: 300,
              totalCost: 2.5,
            },
          ],
        };
      }

      throw new Error(`Unhandled URL: ${url.pathname}${url.search}`);
    });

    const view = renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("Operational Insights")).toBeTruthy();
    expect(await screen.findByText("25.0%")).toBeTruthy();
    expect(screen.getByText("Total Traces")).toBeTruthy();
    expect(screen.getByText("Model Usage")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/v1/apps/default/timeseries?period_hours=168"),
        expect.anything(),
      );
    });

    view.client.clear();
  });
});

describe("trace exploration behavior", () => {
  it("renders traces and lets the user refine filters and pagination", async () => {
    const traces = Array.from({ length: 50 }, (_, index) => ({
      traceId: `trace-${index}`,
      rootSpanName: `checkout ${index}`,
      appName: "shop-bot",
      kind: index % 2 === 0 ? "workflow" : "llm",
      startNs: "1700000000000000000",
      spanCount: 2,
      hasError: index % 3 === 0,
      totalCost: index % 2 === 0 ? 0.5 : null,
      sessionId: `session-${index}`,
      modelName: "gpt-4o",
      durationMs: 250,
    }));

    const fetchMock = installFetchMock((url) => {
      if (url.pathname === "/v1/traces") {
        return { traces };
      }

      throw new Error(`Unhandled URL: ${url.pathname}${url.search}`);
    });

    const view = renderWithProviders(<TracesPage appName="shop-bot" />);

    expect(await screen.findByText("checkout 0")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Search traces…"), {
      target: { value: "checkout" },
    });
    fireEvent.change(screen.getByDisplayValue("All kinds"), {
      target: { value: "workflow" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Errors only/i }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("app_name=shop-bot"),
        expect.anything(),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("search=checkout"),
        expect.anything(),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("kind=workflow"),
        expect.anything(),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("has_error=true"),
        expect.anything(),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("offset=50"),
        expect.anything(),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/v1\/traces\?app_name=shop-bot&limit=50$/),
        expect.anything(),
      );
    });

    view.client.clear();
  });

  it("shows a trace waterfall and lets the user inspect tabs for a selected span", async () => {
    installFetchMock((url) => {
      if (url.pathname === "/v1/traces/trace-1") {
        return {
          spans: [
            buildSpan(),
            buildSpan({
              spanId: "span-child",
              parentId: "span-root",
              name: "call model",
              kind: "llm",
              startNs: "1700000000100000000",
              endNs: "1700000000400000000",
              error: { type: "Timeout", message: "model timed out" },
            }),
          ],
        };
      }

      if (url.pathname === "/v1/spans/span-child/evaluations") {
        return {
          evaluations: [
            {
              id: "eval-1",
              spanId: "span-child",
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
        };
      }

      throw new Error(`Unhandled URL: ${url.pathname}${url.search}`);
    });

    const view = renderWithProviders(
      <Routes>
        <Route path="/traces/:traceId" element={<TraceDetailPage />} />
      </Routes>,
      "/traces/trace-1"
    );

    expect(await screen.findByText("Trace ID")).toBeTruthy();
    expect(screen.getByText("Click a span in the waterfall to view details")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /call model/i }));

    expect(await screen.findByText("Span ID")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Input/Output" }));
    expect(screen.getByText("Input")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Errors" }));
    expect(screen.getByText("model timed out")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Prompt" }));
    expect(screen.getByText(/order.status/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Evaluations" }));
    expect(await screen.findByText("toxicity")).toBeTruthy();
    expect(screen.getByText("Assessment: pass")).toBeTruthy();

    view.client.clear();
  });
});

describe("supporting pages", () => {
  it("renders evaluations, lets the user filter by label, and shows an empty state", async () => {
    const fetchMock = installFetchMock((url) => {
      if (url.pathname === "/v1/evaluations" && url.searchParams.get("label") === "toxicity") {
        return {
          evaluations: [
            {
              id: "eval-1",
              spanId: "span-1",
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
        };
      }

      if (url.pathname === "/v1/evaluations") {
        return {
          evaluations: [
            {
              id: "eval-1",
              spanId: "span-1",
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
            {
              id: "eval-2",
              spanId: null,
              traceId: null,
              appName: "shop-bot",
              label: "hallucination",
              metricType: "categorical",
              numericValue: null,
              stringValue: "high",
              assessment: "fail",
              reasoning: "Made up a shipping status",
              tags: {},
              metadata: {},
              createdAt: "2026-04-11T12:05:00.000Z",
            },
          ],
        };
      }

      throw new Error(`Unhandled URL: ${url.pathname}${url.search}`);
    });

    const loaded = renderWithProviders(<EvaluationsPage appName="shop-bot" />);
    expect(await screen.findByText("50.0%")) .toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "toxicity" }));
    expect(await screen.findByText("Avg toxicity")).toBeTruthy();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("label=toxicity"),
        expect.anything(),
      );
    });
    loaded.client.clear();

    installFetchMock((url) => {
      if (url.pathname === "/v1/evaluations") {
        return { evaluations: [] };
      }

      throw new Error(`Unhandled URL: ${url.pathname}${url.search}`);
    });

    const empty = renderWithProviders(<EvaluationsPage appName="shop-bot" />);
    expect(await screen.findByText("No evaluations found.")).toBeTruthy();
    empty.client.clear();
  });

  it("renders prompt history with expandable versions and side-by-side diffs", async () => {
    installFetchMock((url) => {
      if (url.pathname === "/v1/prompts") {
        return {
          prompts: [
            {
              id: "order.status",
              versionCount: 2,
              latestVersion: "v2",
              lastUsed: "2026-04-11T12:00:00.000Z",
            },
          ],
        };
      }

      if (url.pathname === "/v1/prompts/order.status/versions") {
        return {
          versions: [
            {
              id: "order.status",
              version: "v2",
              template: "Check the latest order state.",
              chatTemplate: null,
              variables: { locale: "en" },
              tags: { team: "support" },
              createdAt: "2026-04-11T12:00:00.000Z",
            },
            {
              id: "order.status",
              version: "v1",
              template: "Check order state.",
              chatTemplate: null,
              variables: {},
              tags: {},
              createdAt: "2026-04-10T12:00:00.000Z",
            },
          ],
        };
      }

      throw new Error(`Unhandled URL: ${url.pathname}${url.search}`);
    });

    const view = renderWithProviders(<PromptsPage />);

    const promptRow = await screen.findByText("order.status");
    fireEvent.click(promptRow.closest("tr")!);

    expect(await screen.findByText("Compare versions:")).toBeTruthy();

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "0" } });
    fireEvent.change(selects[1], { target: { value: "1" } });

    expect(screen.getAllByText("Check the latest order state.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Check order state.").length).toBeGreaterThan(0);

    view.client.clear();
  });

  it("renders a sessions table from API responses", async () => {
    const fetchMock = installFetchMock((url) => {
      if (url.pathname === "/v1/sessions") {
        return {
          sessions: [
            {
              sessionId: "session-1",
              traceCount: 3,
              spanCount: 6,
              firstSeen: "2026-04-11T10:00:00.000Z",
              lastSeen: "2026-04-11T10:03:00.000Z",
              appName: "shop-bot",
            },
          ],
        };
      }

      if (url.pathname === "/v1/experiments") {
        return {
          experiments: [
            {
              id: "exp-1",
              appName: "shop-bot",
              name: "Checkout prompt A/B",
              description: "Compare two prompt variants",
              baselineTag: "baseline",
              variantTags: ["variant-a"],
              status: "running",
              config: {},
              results: null,
              createdAt: "2026-04-11T12:00:00.000Z",
              updatedAt: "2026-04-11T12:00:00.000Z",
            },
          ],
        };
      }

      if (url.pathname === "/v1/apps/shop-bot/metrics") {
        return {
          totalTraces: 12,
          totalSpans: 45,
          errorRate: 0.25,
          avgDurationMs: 214,
          totalInputTokens: 1000,
          totalOutputTokens: 400,
          totalCost: 12.5,
          modelBreakdown: [{ model: "gpt-4o", provider: "openai", count: 10, cost: 12.5 }],
          spanKindBreakdown: [{ kind: "llm", count: 30 }],
          evaluationBreakdown: [],
        };
      }

      if (url.pathname === "/v1/apps/shop-bot/timeseries") {
        return {
          timeseries: [
            {
              bucket: "2026-04-11T10:00:00.000Z",
              traces: 4,
              errors: 1,
              avgDurationMs: 200,
              totalTokens: 300,
              totalCost: 2.5,
            },
          ],
        };
      }

      throw new Error(`Unhandled URL: ${url.pathname}${url.search}`);
    });

    const sessionsView = renderWithProviders(<SessionsPage appName="" />);
    expect(await screen.findByText("session-1")).toBeTruthy();
    sessionsView.client.clear();

    expect(fetchMock).toHaveBeenCalled();
  });

  it("renders experiment cards from API responses", async () => {
    installFetchMock((url) => {
      if (url.pathname === "/v1/experiments") {
        return {
          experiments: [
            {
              id: "exp-1",
              appName: "shop-bot",
              name: "Checkout prompt A/B",
              description: "Compare two prompt variants",
              baselineTag: "baseline",
              variantTags: ["variant-a"],
              status: "running",
              config: {},
              results: null,
              createdAt: "2026-04-11T12:00:00.000Z",
              updatedAt: "2026-04-11T12:00:00.000Z",
            },
          ],
        };
      }

      throw new Error(`Unhandled URL: ${url.pathname}${url.search}`);
    });

    const experimentsView = renderWithProviders(<ExperimentsPage appName="shop-bot" />);
    expect(await screen.findByText("Checkout prompt A/B")).toBeTruthy();
    expect(screen.getByText("baseline")).toBeTruthy();
    experimentsView.client.clear();

  });

  it("renders cost charts and lets the user change the reporting window", async () => {
    const fetchMock = installFetchMock((url) => {
      if (url.pathname === "/v1/apps/shop-bot/metrics") {
        return {
          totalTraces: 12,
          totalSpans: 45,
          errorRate: 0.25,
          avgDurationMs: 214,
          totalInputTokens: 1000,
          totalOutputTokens: 400,
          totalCost: 12.5,
          modelBreakdown: [{ model: "gpt-4o", provider: "openai", count: 10, cost: 12.5 }],
          spanKindBreakdown: [{ kind: "llm", count: 30 }],
          evaluationBreakdown: [],
        };
      }

      if (url.pathname === "/v1/apps/shop-bot/timeseries") {
        return {
          timeseries: [
            {
              bucket: "2026-04-11T10:00:00.000Z",
              traces: 4,
              errors: 1,
              avgDurationMs: 200,
              totalTokens: 300,
              totalCost: 2.5,
            },
          ],
        };
      }

      throw new Error(`Unhandled URL: ${url.pathname}${url.search}`);
    });

    const costView = renderWithProviders(<CostPage appName="shop-bot" />);
    expect(await screen.findByText("Cost Over Time")).toBeTruthy();
    expect(screen.getByText("$12.50")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "30d" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/v1/apps/shop-bot/timeseries?period_hours=720"),
        expect.anything(),
      );
    });

    costView.client.clear();
  });
});

describe("shared span components", () => {
  it("renders a nested span tree and lets the user select a child span", () => {
    const onSelect = vi.fn();

    renderWithProviders(
      <SpanTree
        spans={[
          buildSpan(),
          buildSpan({
            spanId: "span-child",
            parentId: "span-root",
            name: "call model",
            kind: "llm",
            error: { type: "Timeout", message: "model timed out" },
          }),
        ]}
        selectedSpanId={null}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /call model/i }));
    expect(onSelect).toHaveBeenCalledWith("span-child");
    expect(screen.getByText("workflow")).toBeTruthy();
    expect(screen.getByText("llm")).toBeTruthy();
  });

  it("renders span detail panels with error, metrics, tags, and prompt data", () => {
    renderWithProviders(
      <SpanDetail
        span={buildSpan({
          name: "call model",
          error: { type: "Timeout", message: "model timed out" },
        })}
      />
    );

    expect(screen.getByText("call model")).toBeTruthy();
    expect(screen.getByText("model timed out")).toBeTruthy();
    expect(screen.getByText("Input")).toBeTruthy();
    expect(screen.getByText("Metrics")).toBeTruthy();
    expect(screen.getByText("team:")).toBeTruthy();
    expect(screen.getByText(/order.status/)).toBeTruthy();
  });
});
