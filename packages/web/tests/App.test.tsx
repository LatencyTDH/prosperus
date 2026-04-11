import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App";

function renderWithProviders(ui: React.ReactElement, { route = "/" } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("App", () => {
  it("renders navigation links", () => {
    renderWithProviders(<App />);
    expect(screen.getByText(/dashboard/i)).toBeDefined();
    expect(screen.getByText(/traces/i)).toBeDefined();
  });
});
