import { vi } from "vitest";

// Polyfill ResizeObserver for jsdom (needed by Recharts ResponsiveContainer)
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = MockResizeObserver as typeof ResizeObserver;
