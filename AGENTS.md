# AGENTS.md — Prosperus

Quick reference for AI agents working in this repository.

## Repo Map

```
prosperus/                        # Monorepo root (pnpm workspaces)
├── packages/
│   ├── sdk-python/              # Python SDK (hatchling, httpx)
│   │   ├── src/prosperus/        # Source: client, decorators, spans, types
│   │   └── tests/               # pytest tests
│   ├── server/                  # Fastify API (TypeScript, Drizzle ORM)
│   │   └── src/
│   │       ├── routes/          # HTTP handlers + Zod validation
│   │       ├── services/        # Business logic
│   │       └── db/              # Drizzle schema + connection
│   └── web/                     # React dashboard (Vite, TailwindCSS v4)
│       └── src/
│           ├── pages/           # Route pages
│           ├── components/      # Reusable UI components
│           └── api/             # Fetch client
├── docker-compose.yml           # PostgreSQL + server + web
├── Makefile                     # Common dev commands
└── ARCHITECTURE.md              # System design details
```

## Key Commands

```bash
# Setup
pnpm install                          # Install all JS/TS dependencies
docker compose up postgres -d         # Start PostgreSQL
pnpm --filter @prosperus/server db:migrate  # Run migrations

# Development
make dev                              # Start server + web (or use pnpm dev:server / pnpm dev:web)
make build                            # Build all packages
make test                             # Run all tests
make lint                             # Lint all packages
make format                           # Format all code

# Python SDK
cd packages/sdk-python
pip install -e ".[dev]"
pytest                                # Run SDK tests
ruff check src/                       # Lint
mypy src/                             # Type check

# Server-specific
pnpm --filter @prosperus/server db:generate  # Generate migration from schema changes
pnpm --filter @prosperus/server db:migrate   # Apply migrations
```

## Conventions

- **Server architecture:** routes (HTTP + Zod validation) → services (logic) → db (Drizzle ORM)
- **Span kinds:** llm, workflow, agent, tool, task, embedding, retrieval
- **Auth:** Bearer token checked in Fastify `onRequest` hook on `/v1/` routes
- **Python SDK:** context-var propagation for automatic parent-child span nesting
- **Database:** PostgreSQL via Drizzle ORM, bigint nanosecond timestamps
- **Frontend:** React 19, TailwindCSS v4, TanStack Query for data fetching
- **Ports:** API on 4100, web dev server on 4200 (proxies `/v1` to API)

## Documentation

- Keep docs in sync when a change meaningfully affects setup, developer workflow, public APIs, architecture, or user-visible behavior.
- Do not churn docs for minor refactors, internal-only implementation details, renames with no user impact, or every small code edit.
- Update only the docs that are actually affected. Prefer the closest source of truth rather than repeating the same note across every document.

## Testing

| Package | Runner | Command |
|---|---|---|
| sdk-python | pytest | `cd packages/sdk-python && pytest` |
| server | vitest | `pnpm --filter @prosperus/server test` |
| web | vitest | `pnpm --filter @prosperus/web test` |

## Environment Variables

See [README.md](README.md#environment-variables) for the full list. Key ones:
- `DATABASE_URL` — PostgreSQL connection string
- `PORT` — API server port (default: 4100)
