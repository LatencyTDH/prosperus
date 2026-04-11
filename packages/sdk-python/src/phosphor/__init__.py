"""Phosphor — LLM Observability SDK.

Instrument your LLM applications with traces, spans, evaluations, and metrics.

Quick start::

    from phosphor import Phosphor

    ph = Phosphor(api_key="ph-...", app_name="my-chatbot")
    ph.enable()

    from phosphor.decorators import llm, workflow

    @workflow
    def handle_request(user_msg: str) -> str:
        return call_model(user_msg)

    @llm(model_name="gpt-4o", model_provider="openai")
    def call_model(prompt: str) -> str:
        ...
"""

from phosphor.client import Phosphor
from phosphor.types import SpanKind

__all__ = ["Phosphor", "SpanKind"]
__version__ = "0.1.0"
