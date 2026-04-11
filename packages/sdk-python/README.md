# Phosphor Python SDK

Instrument your LLM applications with traces, spans, evaluations, and metrics.

## Quick Start

```python
from phosphor import Phosphor
from phosphor.decorators import llm, workflow

ph = Phosphor(api_key="ph-...", app_name="my-chatbot")
ph.enable()

@workflow
def handle_request(user_msg: str) -> str:
    return call_model(user_msg)

@llm(model_name="gpt-4o", model_provider="openai")
def call_model(prompt: str) -> str:
    ...
```
