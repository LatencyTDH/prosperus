"""Span management — creation, context tracking, and lifecycle."""

from __future__ import annotations

import contextvars
import time
import uuid
from typing import Any, Optional

from prosperus.types import SpanContext, SpanData, SpanKind

_active_span: contextvars.ContextVar[Optional[Span]] = contextvars.ContextVar(
    "prosperus_active_span", default=None
)


def _generate_id() -> str:
    return uuid.uuid4().hex[:16]


class Span:
    """A unit of work in an LLM application trace.

    Spans form a tree: the first span in a trace is the root, and nested spans
    become children automatically via context-var propagation.
    """

    def __init__(
        self,
        kind: SpanKind,
        name: str,
        app_name: str,
        *,
        model_name: str | None = None,
        model_provider: str | None = None,
        session_id: str | None = None,
        ml_app: str | None = None,
        trace_id: str | None = None,
        parent_id: str | None = None,
    ) -> None:
        parent = _active_span.get()
        self.span_id = _generate_id()
        self.trace_id = trace_id or (parent.trace_id if parent else _generate_id())
        self.parent_id = parent_id or (parent.span_id if parent else None)
        self.kind = kind
        self.name = name
        self.app_name = ml_app or app_name
        self.session_id = session_id
        self.model_name = model_name
        self.model_provider = model_provider

        self._start_ns = time.time_ns()
        self._end_ns: int = 0
        self._input_data: Any = None
        self._output_data: Any = None
        self._metadata: dict[str, Any] = {}
        self._metrics: dict[str, float] = {}
        self._tags: dict[str, str] = {}
        self._error: dict[str, str] | None = None
        self._prompt: dict[str, Any] | None = None
        self._token: contextvars.Token[Span | None] | None = None
        self._finished = False

    # -- context manager --------------------------------------------------

    def __enter__(self) -> Span:
        self._token = _active_span.set(self)
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        if exc_val is not None:
            self.set_error(exc_val)
        self.finish()

    # -- public API -------------------------------------------------------

    def annotate(
        self,
        *,
        input_data: Any = None,
        output_data: Any = None,
        metadata: dict[str, Any] | None = None,
        metrics: dict[str, float] | None = None,
        tags: dict[str, str] | None = None,
        prompt: dict[str, Any] | None = None,
    ) -> None:
        """Enrich this span with inputs, outputs, metadata, metrics, or tags."""
        if input_data is not None:
            self._input_data = input_data
        if output_data is not None:
            self._output_data = output_data
        if metadata:
            self._metadata.update(metadata)
        if metrics:
            self._metrics.update(metrics)
        if tags:
            self._tags.update(tags)
        if prompt:
            self._prompt = prompt

    def set_error(self, exc: BaseException) -> None:
        self._error = {
            "type": type(exc).__name__,
            "message": str(exc),
        }

    def get_tag(self, key: str) -> str | None:
        return self._tags.get(key)

    @property
    def input(self) -> Any:
        return self._input_data

    @input.setter
    def input(self, value: Any) -> None:
        self._input_data = value

    @property
    def output(self) -> Any:
        return self._output_data

    @output.setter
    def output(self, value: Any) -> None:
        self._output_data = value

    def export(self) -> SpanContext:
        """Export this span's identity for evaluation attachment or distributed tracing."""
        return SpanContext(trace_id=self.trace_id, span_id=self.span_id)

    def finish(self) -> None:
        """Mark this span as finished. Called automatically by context-manager exit."""
        if self._finished:
            return
        self._finished = True
        self._end_ns = time.time_ns()
        if self._token is not None:
            _active_span.reset(self._token)
            self._token = None
        # Notify the global client to enqueue this span
        from prosperus.client import _get_global
        client = _get_global()
        if client is not None:
            client._enqueue_span(self)

    def to_data(self) -> SpanData:
        return SpanData(
            trace_id=self.trace_id,
            span_id=self.span_id,
            parent_id=self.parent_id,
            name=self.name,
            kind=self.kind,
            app_name=self.app_name,
            start_ns=self._start_ns,
            end_ns=self._end_ns,
            input_data=self._input_data,
            output_data=self._output_data,
            metadata=self._metadata,
            metrics=self._metrics,
            tags=self._tags,
            error=self._error,
            session_id=self.session_id,
            prompt=self._prompt,
            model_name=self.model_name,
            model_provider=self.model_provider,
        )


def get_active_span() -> Span | None:
    """Return the currently active span, if any."""
    return _active_span.get()
