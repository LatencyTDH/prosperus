import { describe, it, expect } from "vitest";
import { buildServer } from "../src/server.js";

describe("server", () => {
  it("health endpoint returns ok", async () => {
    const app = await buildServer();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("rejects unauthenticated /v1/ requests", async () => {
    const app = await buildServer();
    const res = await app.inject({ method: "GET", url: "/v1/traces" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "Missing or invalid API key" });
  });

  it("rejects invalid span payloads", async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/v1/spans",
      headers: { authorization: "Bearer test-key" },
      payload: { spans: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects invalid evaluation payloads", async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/v1/evaluations",
      headers: { authorization: "Bearer test-key" },
      payload: { evaluations: [] },
    });
    expect(res.statusCode).toBe(400);
  });
});
