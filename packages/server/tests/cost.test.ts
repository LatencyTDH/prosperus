import { describe, it, expect } from "vitest";
import { estimateCost } from "../src/services/cost.js";

describe("estimateCost", () => {
  it("calculates cost from token counts for known models", () => {
    const result = estimateCost("openai", "gpt-4o", {
      input_tokens: 1000,
      output_tokens: 500,
    });
    expect(result).not.toBeNull();
    expect(result!.inputCost).toBeCloseTo(0.0025);
    expect(result!.outputCost).toBeCloseTo(0.005);
    expect(result!.totalCost).toBeCloseTo(0.0075);
  });

  it("returns null for unknown providers", () => {
    expect(estimateCost("unknown", "model", { input_tokens: 100 })).toBeNull();
  });

  it("returns null for unknown models", () => {
    expect(estimateCost("openai", "nonexistent", { input_tokens: 100 })).toBeNull();
  });

  it("uses explicit cost metrics when provided", () => {
    const result = estimateCost("openai", "gpt-4o", {
      input_cost: 0.01,
      output_cost: 0.05,
    });
    expect(result).not.toBeNull();
    expect(result!.inputCost).toBe(0.01);
    expect(result!.outputCost).toBe(0.05);
    expect(result!.totalCost).toBeCloseTo(0.06);
  });

  it("handles zero tokens", () => {
    const result = estimateCost("openai", "gpt-4o", {});
    expect(result).not.toBeNull();
    expect(result!.totalCost).toBe(0);
  });

  it("is case-insensitive on provider and model", () => {
    const result = estimateCost("OpenAI", "GPT-4o", { input_tokens: 1_000_000 });
    expect(result).not.toBeNull();
    expect(result!.inputCost).toBeCloseTo(2.5);
  });
});
