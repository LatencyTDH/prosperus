import type { FastifyInstance } from "fastify";
import { listTraces, getTraceSpans, getSpanEvaluations } from "../services/query.js";

export async function tracesRoutes(app: FastifyInstance) {
  app.get("/v1/traces", async (req) => {
    const query = req.query as {
      app_name?: string;
      limit?: string;
      offset?: string;
    };

    const traces = await listTraces({
      appName: query.app_name,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
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
