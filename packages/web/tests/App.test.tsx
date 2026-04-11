import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "../src/App";

vi.mock("../src/pages/DashboardPage", () => ({ DashboardPage: () => <div>Dashboard content</div> }));
vi.mock("../src/pages/TracesPage", () => ({ TracesPage: () => <div>Traces content</div> }));
vi.mock("../src/pages/TraceDetailPage", () => ({ TraceDetailPage: () => <div>Trace detail</div> }));
vi.mock("../src/pages/EvaluationsPage", () => ({ EvaluationsPage: () => <div>Evaluations content</div> }));
vi.mock("../src/pages/PromptsPage", () => ({ PromptsPage: () => <div>Prompts content</div> }));
vi.mock("../src/pages/SessionsPage", () => ({ SessionsPage: () => <div>Sessions content</div> }));
vi.mock("../src/pages/ExperimentsPage", () => ({ ExperimentsPage: () => <div>Experiments content</div> }));
vi.mock("../src/pages/CostPage", () => ({ CostPage: () => <div>Cost content</div> }));

globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ apps: [] }),
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );

  return {
    ...rendered,
    queryClient,
  };
}

describe("App", () => {
  it("renders sidebar navigation", () => {
    const view = renderApp();
    expect(screen.getAllByText("Prosperus", { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Traces").length).toBeGreaterThan(0);
    view.queryClient.clear();
  });

  it("renders evaluations nav link", () => {
    const view = renderApp();
    expect(screen.getAllByText("Evaluations").length).toBeGreaterThan(0);
    view.queryClient.clear();
  });
});
