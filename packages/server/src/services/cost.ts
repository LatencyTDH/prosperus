/**
 * Cost calculation for LLM spans based on token usage and provider pricing.
 *
 * For supported providers (OpenAI, Anthropic, Google, etc.), costs are estimated
 * from token counts. For custom models, users supply cost metrics directly.
 */

interface TokenPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  cachedReadPerMillion?: number;
  cachedWritePerMillion?: number;
}

// Prices in USD per million tokens — a subset for demonstration
const PRICING: Record<string, Record<string, TokenPricing>> = {
  openai: {
    "gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10 },
    "gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6 },
    "gpt-4.1": { inputPerMillion: 2.0, outputPerMillion: 8.0 },
    "o3-mini": { inputPerMillion: 1.1, outputPerMillion: 4.4 },
  },
  anthropic: {
    "claude-sonnet-4": { inputPerMillion: 3, outputPerMillion: 15 },
    "claude-haiku-3.5": { inputPerMillion: 0.8, outputPerMillion: 4 },
  },
  google: {
    "gemini-2.5-pro": { inputPerMillion: 1.25, outputPerMillion: 10 },
    "gemini-2.5-flash": { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  },
};

export interface CostResult {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export function estimateCost(
  modelProvider: string,
  modelName: string,
  metrics: Record<string, number>
): CostResult | null {
  // If user provided explicit cost metrics, use those
  if (metrics.input_cost != null && metrics.output_cost != null) {
    return {
      inputCost: metrics.input_cost,
      outputCost: metrics.output_cost,
      totalCost: metrics.total_cost ?? metrics.input_cost + metrics.output_cost,
    };
  }

  const providerPricing = PRICING[modelProvider.toLowerCase()];
  if (!providerPricing) return null;

  const modelPricing = providerPricing[modelName.toLowerCase()];
  if (!modelPricing) return null;

  const inputTokens = metrics.input_tokens ?? 0;
  const outputTokens = metrics.output_tokens ?? 0;

  const inputCost = (inputTokens / 1_000_000) * modelPricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.outputPerMillion;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}
