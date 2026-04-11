import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ingestSpans } from "../services/ingestion.js";

const spanSchema = z.object({
  trace_id: z.string(),
  span_id: z.string(),
  parent_id: z.string().nullable().optional(),
  name: z.string(),
  kind: z.enum(["llm", "workflow", "agent", "tool", "task", "embedding", "retrieval"]),
  app_name: z.string(),
  start_ns: z.number(),
  end_ns: z.number(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  metadata: z.record(z.unknown()).optional(),
  metrics: z.record(z.number()).optional(),
  tags: z.record(z.string()).optional(),
  error: z.object({ type: z.string(), message: z.string() }).nullable().optional(),
  session_id: z.string().nullable().optional(),
  prompt: z.unknown().optional(),
  model_name: z.string().nullable().optional(),
  model_provider: z.string().nullable().optional(),
});

const ingestBody = z.object({ spans: z.array(spanSchema).min(1).max(1000) });

export async function spansRoutes(app: FastifyInstance) {
  app.post("/v1/spans", async (req, reply) => {
    const parsed = ingestBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const count = await ingestSpans(parsed.data.spans);
    return { ingested: count };
  });
}
