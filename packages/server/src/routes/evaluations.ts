import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { submitEvaluations } from "../services/evaluator.js";

const evalSchema = z.object({
  label: z.string(),
  metric_type: z.enum(["score", "categorical"]),
  value: z.union([z.number(), z.string()]),
  app_name: z.string(),
  span_context: z
    .object({ trace_id: z.string(), span_id: z.string() })
    .optional(),
  span_with_tag_value: z
    .object({ tag_key: z.string(), tag_value: z.string() })
    .optional(),
  tags: z.record(z.string()).optional(),
  assessment: z.string().optional(),
  reasoning: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const evalBody = z.object({ evaluations: z.array(evalSchema).min(1).max(500) });

export async function evaluationsRoutes(app: FastifyInstance) {
  app.post("/v1/evaluations", async (req, reply) => {
    const parsed = evalBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const count = await submitEvaluations(parsed.data.evaluations);
    return { submitted: count };
  });
}
