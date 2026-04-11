import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getMetrics, getTimeSeries } from "../services/metrics.js";

export async function metricsRoutes(app: FastifyInstance) {
  app.get<{ Params: { appName: string } }>("/v1/apps/:appName/metrics", async (req) => {
    return getMetrics(req.params.appName);
  });

  app.get<{ Params: { appName: string } }>("/v1/apps/:appName/timeseries", async (req, reply) => {
    const query = z.object({
      period_hours: z.coerce.number().int().min(1).max(720).optional(),
    }).safeParse(req.query);

    if (!query.success) {
      return reply.status(400).send({ error: query.error.flatten() });
    }

    const data = await getTimeSeries(req.params.appName, query.data.period_hours);
    return { timeseries: data };
  });
}
