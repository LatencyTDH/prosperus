# Architecture

## System Overview

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Python App  │────▶│   Prosperus API   │◀────│  Web Dashboard   │
│  (SDK)       │     │   (server)       │     │  (web)           │
└──────────────┘     └────────┬─────────┘     └──────────────────┘
                              │
                     ┌────────▼─────────┐
                     │   PostgreSQL     │
                     └──────────────────┘
```

The SDK instruments user code and sends spans to the API. The API ingests spans and evaluations into PostgreSQL. The dashboard queries the API to display traces, metrics, and evaluations.

For durable rationale behind key structural choices, see the ADRs in [docs/adrs](docs/adrs/README.md).

## Package Structure

### `sdk-python` — Python SDK

```
src/prosperus/
├── client.py       # Prosperus client — flush loop, span batching, HTTP transport
├── decorators.py   # @llm, @workflow, @agent, @tool, etc. — zero-config instrumentation
├── spans.py        # Span lifecycle — context-var propagation for parent-child nesting
└── types.py        # SpanData, SpanKind, Evaluation, CostMetrics dataclasses
```

**Key design decisions:**
- Uses Python `contextvars` for automatic parent-child span nesting (no manual ID passing)
- Decorators support both `@llm` and `@llm()` syntax
- Background flush thread batches spans to reduce HTTP overhead
- Span processors allow user-defined filtering/redaction before export

### `server` — Fastify API

```
src/
├── index.ts              # Entry point — starts Fastify on PORT
├── server.ts             # App builder — CORS, auth hook, route registration
├── db/
│   ├── connection.ts     # Drizzle + postgres.js client
│   └── schema.ts         # Tables: spans, evaluations, prompts (Drizzle schema)
├── routes/
│   ├── spans.ts          # POST /v1/spans — Zod-validated span ingestion
│   ├── traces.ts         # GET /v1/traces, GET /v1/traces/:traceId
│   ├── evaluations.ts    # POST /v1/evaluations — attach evals to spans
│   └── metrics.ts        # GET /v1/apps/:appName/metrics
└── services/
    ├── ingestion.ts      # Batch insert spans (onConflictDoNothing)
    ├── query.ts           # Trace listing, span retrieval, eval queries
    ├── evaluator.ts      # Evaluation submission with tag-based span lookup
    ├── metrics.ts        # Aggregated metrics (token counts, error rates, model breakdown)
    └── cost.ts           # LLM cost estimation from token usage + provider pricing
```

**Layered architecture:** Routes handle HTTP + validation (Zod). Services contain business logic. DB layer is Drizzle ORM with typed schemas.

**Auth:** Bearer token validated in a Fastify `onRequest` hook on all `/v1/` routes.

**Key tables:**
- `spans` — Primary data store. Indexed on trace_id, app_name, kind, created_at, session_id.
- `evaluations` — Attached to spans. Score or categorical assessments.
- `prompts` — Version-tracked prompt templates (composite PK: id + version).

### `web` — React Dashboard

```
src/
├── App.tsx                   # Router: /, /traces, /traces/:traceId, /evaluations
├── api/client.ts             # Generic fetch wrapper with type parameter
├── components/
│   ├── SpanTree.tsx          # Recursive span tree with color-coded kind badges
│   └── SpanDetail.tsx        # Span inspector (metadata, I/O, metrics, errors)
└── pages/
    ├── DashboardPage.tsx     # KPI cards + Recharts visualizations
    ├── TracesPage.tsx        # Paginated trace table with status badges
    ├── TraceDetailPage.tsx   # Span tree + detail panel for a single trace
    └── EvaluationsPage.tsx   # Evaluation management (placeholder)
```

**Data flow:** Pages use TanStack Query to fetch from the API (proxied via Vite on `/v1`). Components receive data as props.

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check (no auth) |
| `POST` | `/v1/spans` | Ingest spans (batch, max 1000) |
| `GET` | `/v1/traces` | List traces (paginated) |
| `GET` | `/v1/traces/:traceId` | Get all spans for a trace |
| `GET` | `/v1/spans/:spanId/evaluations` | Get evaluations for a span |
| `POST` | `/v1/evaluations` | Submit evaluations (batch, max 500) |
| `GET` | `/v1/apps/:appName/metrics` | Aggregated metrics for an app |

## Data Flow

1. User code instrumented with `@llm`, `@workflow`, etc. decorators
2. SDK collects spans via context-var propagation, batches them
3. SDK flushes spans to `POST /v1/spans` with Bearer token
4. Server validates with Zod, inserts into PostgreSQL via Drizzle
5. Dashboard queries traces/metrics via GET endpoints
6. Users submit evaluations via `POST /v1/evaluations`, linked to spans by ID or tag
