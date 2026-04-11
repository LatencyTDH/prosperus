"""Core type definitions for Phosphor SDK."""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from typing import Any, Optional


class SpanKind(str, enum.Enum):
    """The kind of operation a span represents."""

    LLM = "llm"
    WORKFLOW = "workflow"
    AGENT = "agent"
    TOOL = "tool"
    TASK = "task"
    EMBEDDING = "embedding"
    RETRIEVAL = "retrieval"


@dataclass
class SpanContext:
    """Exported reference to a span for cross-process linking or evaluation attachment."""

    trace_id: str
    span_id: str

    def to_dict(self) -> dict[str, str]:
        return {"trace_id": self.trace_id, "span_id": self.span_id}


@dataclass
class Message:
    """A chat-style message (role + content)."""

    role: str
    content: str

    def to_dict(self) -> dict[str, str]:
        return {"role": self.role, "content": self.content}


@dataclass
class Document:
    """A retrieval result document."""

    text: str
    name: str = ""
    id: str = ""
    score: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {"text": self.text, "name": self.name, "id": self.id, "score": self.score}


@dataclass
class Prompt:
    """Versioned prompt template metadata."""

    id: str
    template: str | None = None
    chat_template: list[dict[str, str]] | None = None
    variables: dict[str, str] = field(default_factory=dict)
    version: str | None = None
    tags: dict[str, str] = field(default_factory=dict)


@dataclass
class Evaluation:
    """An evaluation result to submit against a span."""

    label: str
    metric_type: str  # "score" | "categorical"
    value: float | str
    app_name: str | None = None
    span_context: SpanContext | None = None
    span_with_tag_value: dict[str, str] | None = None
    tags: dict[str, str] = field(default_factory=dict)
    assessment: str | None = None
    reasoning: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class CostMetrics:
    """Token and cost metrics attached to LLM/embedding spans."""

    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    input_cost: float | None = None
    output_cost: float | None = None
    total_cost: float | None = None
    cache_read_input_tokens: int | None = None
    cache_write_input_tokens: int | None = None


@dataclass
class SpanData:
    """The serializable payload for a single span."""

    trace_id: str
    span_id: str
    parent_id: Optional[str]
    name: str
    kind: SpanKind
    app_name: str
    start_ns: int
    end_ns: int = 0
    input_data: Any = None
    output_data: Any = None
    metadata: dict[str, Any] = field(default_factory=dict)
    metrics: dict[str, float] = field(default_factory=dict)
    tags: dict[str, str] = field(default_factory=dict)
    error: Optional[dict[str, str]] = None
    session_id: Optional[str] = None
    prompt: Optional[dict[str, Any]] = None
    model_name: Optional[str] = None
    model_provider: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "parent_id": self.parent_id,
            "name": self.name,
            "kind": self.kind.value,
            "app_name": self.app_name,
            "start_ns": self.start_ns,
            "end_ns": self.end_ns,
            "tags": self.tags,
        }
        if self.input_data is not None:
            d["input"] = self.input_data
        if self.output_data is not None:
            d["output"] = self.output_data
        if self.metadata:
            d["metadata"] = self.metadata
        if self.metrics:
            d["metrics"] = self.metrics
        if self.error:
            d["error"] = self.error
        if self.session_id:
            d["session_id"] = self.session_id
        if self.prompt:
            d["prompt"] = self.prompt
        if self.model_name:
            d["model_name"] = self.model_name
        if self.model_provider:
            d["model_provider"] = self.model_provider
        return d
