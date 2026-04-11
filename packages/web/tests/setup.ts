import { vi } from "vitest";

// Polyfill ResizeObserver for jsdom (needed by Recharts ResponsiveContainer)
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
