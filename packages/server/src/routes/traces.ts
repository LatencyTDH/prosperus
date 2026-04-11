import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  listTraces,
  getTraceSpans,
  getSpanEvaluations,
  listSessions,
  listEvaluations,
  listApps,
} from "../services/query.js";

const tracesQuery = z.object({
  app_name: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  kind: z.string().optional(),
  has_error: z.coerce.boolean().optional(),
  session_id: z.string().optional(),
  search: z.string().optional(),
  start_after: z.coerce.date().optional(),
  start_before: z.coerce.date().optional(),
});

export async function tracesRoutes(app: FastifyInstance) {
  // List traces with enhanced filtering
  app.get("/v1/traces", async (req, reply) => {
    const parsed = tracesQuery.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const traces = await listTraces({
      appName: parsed.data.app_name,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
      kind: parsed.data.kind,
      hasError: parsed.data.has_error,
      sessionId: parsed.data.session_id,
      search: parsed.data.search,
      startAfter: parsed.data.start_after,
      startBefore: parsed.data.start_before,
    });

    return {
      traces: traces.map((t) => ({
        ...t,
        startNs: t.startNs.toString(),
      })),
    };
  });

  // Get spans for a specific trace
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

  // Get evaluations for a span
  app.get<{ Params: { spanId: string } }>("/v1/spans/:spanId/evaluations", async (req) => {
    const evals = await getSpanEvaluations(req.params.spanId);
    return { evaluations: evals };
  });

  // List sessions
  app.get("/v1/sessions", async (req, reply) => {
    const query = z.object({
      app_name: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    }).safeParse(req.query);

    if (!query.success) {
      return reply.status(400).send({ error: query.error.flatten() });
    }

    const sessions = await listSessions({
      appName: query.data.app_name,
      limit: query.data.limit,
      offset: query.data.offset,
    });

    return { sessions };
  });

  // List evaluations
  app.get("/v1/evaluations", async (req, reply) => {
    const query = z.object({
      app_name: z.string().optional(),
      label: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(500).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    }).safeParse(req.query);

    if (!query.success) {
      return reply.status(400).send({ error: query.error.flatten() });
    }

    const evals = await listEvaluations({
      appName: query.data.app_name,
      label: query.data.label,
      limit: query.data.limit,
      offset: query.data.offset,
    });

    return { evaluations: evals };
  });

  // List apps
  app.get("/v1/apps", async () => {
    const apps = await listApps();
    return { apps };
  });
}
