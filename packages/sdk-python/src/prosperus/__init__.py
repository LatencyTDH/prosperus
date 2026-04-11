"""Prosperus — LLM Observability SDK.

Instrument your LLM applications with traces, spans, evaluations, and metrics.

Quick start::

    from prosperus import Prosperus, llm, workflow

    ph = Prosperus(api_key="ph-...", app_name="my-chatbot")
    ph.enable()

    @workflow
    def handle_request(user_msg: str) -> str:
        return call_model(user_msg)

    @llm(model_name="gpt-5.4", model_provider="openai")
    def call_model(prompt: str) -> str:
        ...
"""

from prosperus.client import Prosperus
from prosperus.decorators import agent, embedding, llm, retrieval, task, tool, workflow
from prosperus.types import (
    CostMetrics,
    Document,
    Evaluation,
    Message,
    Prompt,
    SpanContext,
    SpanKind,
)

__all__ = [
    "Prosperus",
    "SpanKind",
    "SpanContext",
    "Message",
    "Document",
    "Prompt",
    "Evaluation",
    "CostMetrics",
    "llm",
    "workflow",
    "agent",
    "tool",
    "task",
    "embedding",
    "retrieval",
]
__version__ = "0.1.0"
