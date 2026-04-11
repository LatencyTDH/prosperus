# API Reference

All API routes under `/v1/` require a `Bearer` token in the `Authorization` header.

## Health Check

```
GET /health
```

No authentication required.

**Response:**
```json
{ "status": "ok" }
```

## Spans

### Ingest Spans

```
POST /v1/spans
```

Ingest a batch of spans (max 1000 per request).

**Request Body:**
```json
{
  "spans": [
    {
      "trace_id": "abc123",
      "span_id": "span001",
      "parent_id": null,
      "name": "generate-response",
      "kind": "llm",
      "app_name": "my-chatbot",
      "start_ns": 1700000000000000000,
      "end_ns": 1700000001000000000,
      "input": [{ "role": "user", "content": "hello" }],
      "output": [{ "role": "assistant", "content": "hi" }],
      "metadata": { "temperature": 0.7 },
      "metrics": { "input_tokens": 5, "output_tokens": 3 },
      "tags": { "env": "production" },
      "error": null,
      "session_id": null,
      "model_name": "gpt-5.4",
      "model_provider": "openai"
    }
  ]
}
```

**Span Fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `trace_id` | string | Yes | Groups spans into a trace |
| `span_id` | string | Yes | Unique span identifier |
| `parent_id` | string \| null | No | Parent span for nesting |
| `name` | string | Yes | Human-readable span name |
| `kind` | enum | Yes | One of: `llm`, `workflow`, `agent`, `tool`, `task`, `embedding`, `retrieval` |
| `app_name` | string | Yes | Application identifier |
| `start_ns` | integer | Yes | Start time in nanoseconds (epoch) |
| `end_ns` | integer | Yes | End time in nanoseconds (epoch) |
| `input` | any | No | Span input data |
| `output` | any | No | Span output data |
| `metadata` | object | No | Arbitrary key-value metadata |
| `metrics` | object | No | Numeric metrics (e.g. token counts) |
| `tags` | object | No | String key-value tags |
| `error` | object \| null | No | `{ type, message }` if the span errored |
| `session_id` | string \| null | No | Session grouping identifier |
| `model_name` | string \| null | No | LLM model name |
| `model_provider` | string \| null | No | LLM provider (e.g. `openai`, `anthropic`) |

**Response:**
```json
{ "ingested": 1 }
```

## Traces

### List Traces

```
GET /v1/traces?app_name=my-chatbot&limit=50&offset=0
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `app_name` | string | — | Filter by application |
| `limit` | integer | 50 | Max results (1-200) |
| `offset` | integer | 0 | Pagination offset |

**Response:**
```json
{
  "traces": [
    {
      "traceId": "abc123",
      "appName": "my-chatbot",
      "startNs": "1700000000000000000",
      "spanCount": 5,
      "rootSpanName": "handle-request",
      "hasError": false
    }
  ]
}
```

### Get Trace Spans

```
GET /v1/traces/:traceId
```

Returns all spans belonging to a trace.

**Response:**
```json
{
  "spans": [
    {
      "spanId": "span001",
      "traceId": "abc123",
      "parentId": null,
      "name": "handle-request",
      "kind": "workflow",
      "startNs": "1700000000000000000",
      "endNs": "1700000001000000000"
    }
  ]
}
```

## Evaluations

### Submit Evaluations

```
POST /v1/evaluations
```

Attach evaluations to spans (max 500 per request).

**Request Body:**
```json
{
  "evaluations": [
    {
      "span_id": "span001",
      "app_name": "my-chatbot",
      "label": "relevance",
      "metric_type": "score",
      "numeric_value": 0.95,
      "assessment": "pass",
      "reasoning": "Response directly addresses the user's question"
    }
  ]
}
```

### Get Span Evaluations

```
GET /v1/spans/:spanId/evaluations
```

**Response:**
```json
{
  "evaluations": [
    {
      "id": "eval001",
      "spanId": "span001",
      "label": "relevance",
      "metricType": "score",
      "numericValue": 0.95
    }
  ]
}
```

## Metrics

### Get App Metrics

```
GET /v1/apps/:appName/metrics
```

Returns aggregated metrics for an application.

**Response:**
```json
{
  "totalTraces": 1250,
  "totalSpans": 8430,
  "errorRate": 0.023,
  "avgLatencyMs": 1240,
  "tokenUsage": {
    "input": 5200000,
    "output": 1800000
  },
  "modelBreakdown": {
    "gpt-5.4": 820,
    "claude-3.5-sonnet": 430
  },
  "estimatedCost": 142.50
}
```
