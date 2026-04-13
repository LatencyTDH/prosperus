# Prosperus

![Prosperus banner](./prosperus-banner.png)

LLM Observability platform for monitoring, troubleshooting, and evaluating LLM-powered applications.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Development](#development)
- [Architecture](#architecture)
- [Span Kinds](#span-kinds)
- [Environment Variables](#environment-variables)

## Overview

Prosperus collects traces, spans, evaluations, and metrics from your LLM applications. It consists of three packages:

| Package | Description | Tech |
|---|---|---|
| [`sdk-python`](packages/sdk-python/) | Python SDK for instrumenting applications | Python 3.9+, httpx |
| [`server`](packages/server/) | Ingestion & query API | Fastify 5, Drizzle ORM, PostgreSQL |
| [`web`](packages/web/) | Dashboard UI | React 19, TailwindCSS v4, Recharts |

## Quick Start

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Docker & Docker Compose (for PostgreSQL)
- Python ≥ 3.9 (for SDK development)
- uv ≥ 0.8 (for SDK dependency management and commands)

### Setup

```bash
git clone https://github.com/LatencyTDH/prosperus.git
cd prosperus
make start    # installs deps, starts Postgres, migrates, launches dev servers
```

That's it. API on http://localhost:4100, dashboard on http://localhost:4200.

To stop everything:

```bash
make stop
```

Or run each step manually:

```bash
pnpm install
(cd packages/sdk-python && uv sync --frozen)
docker compose up postgres -d
pnpm --filter @prosperus/server db:migrate
pnpm dev:server   # API
pnpm dev:web      # Dashboard
```

### Verify It Works

```bash
curl http://localhost:4100/health
# → {"status":"ok"}
```

## Development

```bash
# Build all packages
pnpm build

# Run all tests
pnpm test

# Run the canonical local validation suite
make check

# Lint all packages
pnpm lint

# Format code
pnpm format

# Run a specific package
pnpm dev:server
pnpm dev:web
```

### Python SDK

Install the SDK from PyPI:

```bash
pip install prosperus
# or
uv add prosperus
```

For local development:

```bash
cd packages/sdk-python
uv sync
uv run pytest
uv run ruff check src/
uv run mypy src/
uv build
```

`make check` runs the repo's canonical local validation flow: build, lint, SDK typecheck, and tests. The SDK commands are executed through `uv run`.

## Architecture

```
prosperus/
├── packages/
│   ├── sdk-python/    # Python SDK — decorators + context-var span nesting
│   ├── server/        # Fastify API — routes → services → db (Drizzle + PostgreSQL)
│   └── web/           # React dashboard — pages, components, TanStack Query
├── docker-compose.yml # PostgreSQL + server + web
└── package.json       # Monorepo scripts (pnpm workspaces)
```

The server follows a layered architecture: **routes** (validation) → **services** (business logic) → **db** (Drizzle ORM). See [ARCHITECTURE.md](ARCHITECTURE.md) for details.

## Span Kinds

Prosperus traces are composed of spans, each with a kind:

| Kind | Description |
|---|---|
| `llm` | LLM inference call |
| `workflow` | End-to-end pipeline |
| `agent` | Autonomous agent loop |
| `tool` | Tool/function call |
| `task` | Generic computation |
| `embedding` | Embedding generation |
| `retrieval` | Document retrieval (RAG) |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://prosperus:prosperus@localhost:5432/prosperus` | PostgreSQL connection string |
| `PORT` | `4100` | API server port |
| `HOST` | `0.0.0.0` | API server bind address |
| `LOG_LEVEL` | `info` | Fastify log level |

## License

Apache-2.0 — see [LICENSE](LICENSE).
