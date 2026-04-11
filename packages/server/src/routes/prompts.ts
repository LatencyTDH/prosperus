import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import { prompts } from "../db/schema.js";

export async function promptsRoutes(app: FastifyInstance) {
  // List all unique prompts
  app.get("/v1/prompts", async () => {
    const rows = await db
      .select({
        id: prompts.id,
        versionCount: sql<number>`count(*)::int`,
        latestVersion: sql<string>`max(${prompts.version})`,
        lastUsed: sql<Date>`max(${prompts.createdAt})`,
      })
      .from(prompts)
      .groupBy(prompts.id)
      .orderBy(desc(sql`max(${prompts.createdAt})`));

    return { prompts: rows };
  });

  // Get versions of a specific prompt
  app.get<{ Params: { promptId: string } }>("/v1/prompts/:promptId/versions", async (req) => {
    const rows = await db
      .select()
      .from(prompts)
      .where(eq(prompts.id, req.params.promptId))
      .orderBy(desc(prompts.createdAt));

    return { versions: rows };
  });
}
