import Fastify from "fastify";
import cors from "@fastify/cors";
import { spansRoutes } from "./routes/spans.js";
import { tracesRoutes } from "./routes/traces.js";
import { evaluationsRoutes } from "./routes/evaluations.js";
import { metricsRoutes } from "./routes/metrics.js";

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  await app.register(cors, { origin: true });

  // Auth hook — validate Bearer token on ingestion routes
  app.addHook("onRequest", async (req, reply) => {
    if (req.url.startsWith("/v1/")) {
      const auth = req.headers.authorization;
      if (!auth?.startsWith("Bearer ")) {
        return reply.status(401).send({ error: "Missing or invalid API key" });
      }
      // In production, validate the token against a store
    }
  });

  // Health check (no auth required)
  app.get("/health", async () => ({ status: "ok" }));

  await app.register(spansRoutes);
  await app.register(tracesRoutes);
  await app.register(evaluationsRoutes);
  await app.register(metricsRoutes);

  return app;
}
