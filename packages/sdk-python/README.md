# Prosperus Python SDK

Instrument your LLM applications with traces, spans, evaluations, and metrics.

## Quick Start

```python
from prosperus import Prosperus
from prosperus.decorators import llm, workflow

ph = Prosperus(api_key="ph-...", app_name="my-chatbot")
ph.enable()

@workflow
def handle_request(user_msg: str) -> str:
    return call_model(user_msg)

@llm(model_name="gpt-4o", model_provider="openai")
def call_model(prompt: str) -> str:
    ...
```
