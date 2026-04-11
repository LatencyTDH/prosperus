import type { FastifyInstance } from "fastify";
import { getMetrics } from "../services/metrics.js";

export async function metricsRoutes(app: FastifyInstance) {
  app.get<{ Params: { appName: string } }>("/v1/apps/:appName/metrics", async (req) => {
    return getMetrics(req.params.appName);
  });
}
