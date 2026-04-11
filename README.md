# Prosperus

LLM Observability platform for monitoring, troubleshooting, and evaluating LLM-powered applications.

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

### Setup

```bash
# Clone and install dependencies
git clone https://github.com/prosperus-dev/prosperus.git
cd prosperus
pnpm install

# Start PostgreSQL
docker compose up postgres -d

# Run database migrations
pnpm --filter @prosperus/server db:migrate

# Start development servers
pnpm dev:server   # API on http://localhost:4100
pnpm dev:web      # Dashboard on http://localhost:4200
```

Or run everything with Docker Compose:

```bash
docker compose up
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

# Lint all packages
pnpm lint

# Format code
pnpm format

# Run a specific package
pnpm dev:server
pnpm dev:web
```

### Python SDK

```bash
cd packages/sdk-python
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest
ruff check src/
mypy src/
```

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
