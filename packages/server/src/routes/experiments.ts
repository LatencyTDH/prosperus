import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { experiments, type ExperimentInsert } from "../db/schema.js";
import { nanoid } from "nanoid";

const createExperimentSchema = z.object({
  app_name: z.string(),
  name: z.string(),
  description: z.string().optional(),
  baseline_tag: z.string().optional(),
  variant_tags: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
});

export async function experimentsRoutes(app: FastifyInstance) {
  app.get("/v1/experiments", async (req, reply) => {
    const query = z.object({
      app_name: z.string().optional(),
    }).safeParse(req.query);

    if (!query.success) {
      return reply.status(400).send({ error: query.error.flatten() });
    }

    const conditions = query.data.app_name
      ? eq(experiments.appName, query.data.app_name)
      : undefined;

    const rows = await db
      .select()
      .from(experiments)
      .where(conditions)
      .orderBy(desc(experiments.createdAt));

    return { experiments: rows };
  });

  app.post("/v1/experiments", async (req, reply) => {
    const parsed = createExperimentSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const row: ExperimentInsert = {
      id: nanoid(16),
      appName: parsed.data.app_name,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      baselineTag: parsed.data.baseline_tag ?? null,
      variantTags: parsed.data.variant_tags ?? [],
      config: parsed.data.config ?? {},
    };

    await db.insert(experiments).values(row);
    return { id: row.id };
  });

  app.get<{ Params: { experimentId: string } }>("/v1/experiments/:experimentId", async (req) => {
    const [row] = await db
      .select()
      .from(experiments)
      .where(eq(experiments.id, req.params.experimentId));

    return { experiment: row ?? null };
  });
}
