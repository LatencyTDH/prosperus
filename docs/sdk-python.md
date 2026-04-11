# Python SDK Guide

The Prosperus Python SDK instruments LLM applications with automatic tracing, span nesting, and metrics collection.

## Installation

```bash
pip install prosperus
```

For development:

```bash
cd packages/sdk-python
pip install -e ".[dev]"
```

## Quick Start

```python
from prosperus import Prosperus
from prosperus.decorators import workflow, llm

# Initialize the client
ph = Prosperus(api_key="ph-...", app_name="my-chatbot")
ph.enable()

@workflow
def handle_request(user_msg: str) -> str:
    return call_model(user_msg)

@llm(model_name="gpt-4o", model_provider="openai")
def call_model(prompt: str) -> str:
    # Your LLM call here
    return response

# Spans are automatically flushed to the API in the background
handle_request("What is the weather?")

# Ensure all spans are sent before exit
ph.shutdown()
```

## Decorators

Decorators are the primary way to instrument your code. Each decorator creates a span with the corresponding kind.

| Decorator | Span Kind | Use Case |
|---|---|---|
| `@workflow` | workflow | End-to-end pipeline |
| `@llm` | llm | LLM inference call |
| `@agent` | agent | Autonomous agent loop |
| `@tool` | tool | Tool/function call |
| `@task` | task | Generic computation |
| `@embedding` | embedding | Embedding generation |
| `@retrieval` | retrieval | Document retrieval (RAG) |

All decorators support both bare and parameterized syntax:

```python
from prosperus.decorators import llm, tool

# Bare — span name defaults to function name
@llm
def generate(prompt: str) -> str: ...

# Parameterized — set model info and custom name
@llm(model_name="gpt-4o", model_provider="openai")
def generate(prompt: str) -> str: ...
```

## Context Managers

For more control, use the client's context manager methods:

```python
ph = Prosperus(api_key="ph-...", app_name="my-app")
ph.enable()

with ph.workflow("process-request") as span:
    with ph.llm("call-model", model_name="gpt-4o", model_provider="openai") as child:
        # child.parent_id is automatically set to span.span_id
        pass
```

Parent-child nesting is handled automatically via Python `contextvars` — no manual ID passing required.

## Annotations

Add input/output data, metadata, metrics, and tags to the active span:

```python
from prosperus import Prosperus

@llm(model_name="gpt-4o", model_provider="openai")
def call_model(messages):
    response = openai.chat.completions.create(model="gpt-4o", messages=messages)

    Prosperus.annotate(
        input_data=messages,
        output_data=[{"role": "assistant", "content": response.choices[0].message.content}],
        metadata={"temperature": 0.7},
        metrics={
            "input_tokens": response.usage.prompt_tokens,
            "output_tokens": response.usage.completion_tokens,
        },
        tags={"env": "production"},
    )

    return response.choices[0].message.content
```

## Exporting Span Context

Export a span reference for cross-process linking or attaching evaluations later:

```python
with ph.llm("generate", model_name="gpt-4o") as span:
    ctx = Prosperus.export_span()
    # ctx.trace_id and ctx.span_id can be sent to another service
    # or stored for later evaluation attachment
```

## Configuration

| Parameter | Type | Description |
|---|---|---|
| `api_key` | str | API key for authentication |
| `app_name` | str | Application identifier (groups traces) |
| `base_url` | str | API endpoint (default: `http://localhost:4100`) |
| `flush_interval` | float | Seconds between background flushes (default: `5.0`) |
| `max_batch_size` | int | Max spans per flush batch (default: `100`) |

## Testing

The SDK can be used in tests without sending data to the API:

```python
ph = Prosperus(api_key="test", app_name="test-app")
ph.enable()

# Use context managers or decorators as normal
# Spans are collected in memory but the flush thread
# won't connect since "test" isn't a valid endpoint
ph.shutdown()
```
