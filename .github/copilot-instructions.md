.github/copilot-instructions.md
- Prosperus is an LLM Observability platform for monitoring, troubleshooting, and evaluating LLM-powered applications.
- Monorepo with three packages: `sdk-python` (Python SDK), `server` (Fastify API), `web` (React dashboard).
- Use pnpm for JS/TS packages, hatchling for the Python SDK.
- The Python SDK uses context-var propagation for automatic parent-child span nesting.
- Span kinds: llm, workflow, agent, tool, task, embedding, retrieval.
- Database: PostgreSQL via Drizzle ORM.
- The web dashboard uses React 19, TailwindCSS v4, Recharts, TanStack Query.
- API server runs on port 4100, web dev server on port 4200 with proxy to API.
- All bearer-token auth checks happen in a Fastify onRequest hook.
