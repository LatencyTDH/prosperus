"""Prosperus — LLM Observability SDK.

Instrument your LLM applications with traces, spans, evaluations, and metrics.

Quick start::

    from prosperus import Prosperus

    ph = Prosperus(api_key="ph-...", app_name="my-chatbot")
    ph.enable()

    from prosperus.decorators import llm, workflow

    @workflow
    def handle_request(user_msg: str) -> str:
        return call_model(user_msg)

    @llm(model_name="gpt-4o", model_provider="openai")
    def call_model(prompt: str) -> str:
        ...
"""

from prosperus.client import Prosperus
from prosperus.types import SpanKind

__all__ = ["Prosperus", "SpanKind"]
__version__ = "0.1.0"
