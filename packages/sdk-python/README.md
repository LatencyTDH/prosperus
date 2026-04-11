# Prosperus Python SDK

Instrument your LLM applications with traces, spans, evaluations, and metrics.

Install with:

```bash
uv add prosperus-sdk
```

The distribution name is `prosperus-sdk`. The Python import package is `prosperus`.

## Quick Start

```python
from prosperus import Prosperus, llm, workflow

ph = Prosperus(
    api_key="ph-...",
    app_name="my-chatbot",
    endpoint="http://localhost:4100",  # use your local server during development
)
ph.enable()

@workflow
def handle_request(user_msg: str) -> str:
    return call_model(user_msg)

@llm(model_name="gpt-4o", model_provider="openai")
def call_model(prompt: str) -> str:
    reply = f"Echo: {prompt}"
    Prosperus.annotate(
        input_data=[{"role": "user", "content": prompt}],
        output_data=[{"role": "assistant", "content": reply}],
        metrics={"input_tokens": 5, "output_tokens": 7},
    )
    return reply

print(handle_request("Hello"))
ph.shutdown()
```

## Development

```bash
cd packages/sdk-python
uv sync
uv run pytest
uv run ruff check src/
uv run mypy src/
```

## Configuration

| Parameter | Type | Description |
|---|---|---|
| `api_key` | `str` | API key for authentication |
| `app_name` | `str` | Application identifier used to group traces |
| `endpoint` | `str` | Prosperus ingest endpoint. Defaults to `https://ingest.prosperus.dev` |
| `flush_interval` | `float` | Seconds between background flush attempts |
| `span_processor` | `Callable[[SpanData], SpanData \| None] \| None` | Optional processor for redaction or filtering before export |

## What You Can Import

The top-level package re-exports the most common SDK entry points:

```python
from prosperus import Prosperus, llm, workflow, tool, SpanKind, SpanContext
```
