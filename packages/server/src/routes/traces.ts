import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { listTraces, getTraceSpans, getSpanEvaluations } from "../services/query.js";

const tracesQuery = z.object({
  app_name: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function tracesRoutes(app: FastifyInstance) {
  app.get("/v1/traces", async (req, reply) => {
    const parsed = tracesQuery.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const traces = await listTraces({
      appName: parsed.data.app_name,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return {
      traces: traces.map((t) => ({
        ...t,
        startNs: t.startNs.toString(),
      })),
    };
  });

  app.get<{ Params: { traceId: string } }>("/v1/traces/:traceId", async (req) => {
    const spans = await getTraceSpans(req.params.traceId);
    return {
      spans: spans.map((s) => ({
        ...s,
        startNs: s.startNs.toString(),
        endNs: s.endNs.toString(),
      })),
    };
  });

  app.get<{ Params: { spanId: string } }>("/v1/spans/:spanId/evaluations", async (req) => {
    const evals = await getSpanEvaluations(req.params.spanId);
    return { evaluations: evals };
  });
}
