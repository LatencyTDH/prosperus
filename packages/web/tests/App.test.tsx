import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "../src/App";

// Mock fetch to return appropriate empty data per endpoint
globalThis.fetch = vi.fn().mockImplementation((url: string) => {
  let body: unknown = {};
  if (url.includes("/apps") && url.includes("/metrics")) {
    body = {
      totalTraces: 0, totalSpans: 0, errorRate: 0, avgDurationMs: 0,
      totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0,
      modelBreakdown: [], spanKindBreakdown: [], evaluationBreakdown: [],
    };
  } else if (url.includes("/timeseries")) {
    body = { timeseries: [] };
  } else if (url.includes("/apps")) {
    body = { apps: [] };
  } else {
    body = { traces: [], sessions: [], evaluations: [], prompts: [], experiments: [] };
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
});

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

describe("App", () => {
  it("renders sidebar navigation", () => {
    renderApp();
    expect(screen.getAllByText("Prosperus", { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Traces").length).toBeGreaterThan(0);
  });

  it("renders evaluations nav link", () => {
    renderApp();
    expect(screen.getAllByText("Evaluations").length).toBeGreaterThan(0);
  });
});
