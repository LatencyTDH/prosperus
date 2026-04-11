"""Prosperus client — global singleton managing span collection, flushing, and API communication."""

from __future__ import annotations

import atexit
import logging
import threading
from collections import deque
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any, Callable

import httpx

from prosperus.spans import Span, get_active_span
from prosperus.types import SpanContext, SpanData, SpanKind

logger = logging.getLogger("prosperus")

_global_client: Prosperus | None = None
_lock = threading.Lock()

SpanProcessor = Callable[[SpanData], SpanData | None]


def _get_global() -> Prosperus | None:
    return _global_client


class Prosperus:
    """Top-level client for the Prosperus LLM Observability SDK.

    Usage::

        ph = Prosperus(api_key="ph-...", app_name="my-chatbot")
        ph.enable()
    """

    def __init__(
        self,
        *,
        api_key: str,
        app_name: str,
        endpoint: str = "https://ingest.prosperus.dev",
        flush_interval: float = 5.0,
        span_processor: SpanProcessor | None = None,
    ) -> None:
        self.api_key = api_key
        self.app_name = app_name
        self.endpoint = endpoint.rstrip("/")
        self._flush_interval = flush_interval
        self._span_processor = span_processor
        self._buffer: deque[SpanData] = deque(maxlen=10_000)
        self._eval_buffer: deque[dict[str, Any]] = deque(maxlen=5_000)
        self._timer: threading.Timer | None = None
        self._http = httpx.Client(
            base_url=self.endpoint,
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            timeout=10.0,
        )
        self._enabled = False

    # -- lifecycle --------------------------------------------------------

    def enable(self) -> None:
        """Activate this client as the global instance and start background flushing."""
        global _global_client
        with _lock:
            _global_client = self
        self._enabled = True
        self._schedule_flush()
        atexit.register(self.shutdown)
        logger.info("Prosperus enabled for app=%s", self.app_name)

    def disable(self) -> None:
        global _global_client
        self._enabled = False
        with _lock:
            if _global_client is self:
                _global_client = None
        if self._timer:
            self._timer.cancel()

    def shutdown(self) -> None:
        """Flush remaining spans and shut down the client."""
        self.disable()
        self.flush()
        self._http.close()

    # -- inline span constructors (context-manager style) -----------------

    def llm(
        self,
        name: str = "llm",
        *,
        model_name: str = "",
        model_provider: str = "",
        session_id: str | None = None,
        ml_app: str | None = None,
    ) -> Span:
        return Span(
            SpanKind.LLM,
            name,
            self.app_name,
            model_name=model_name,
            model_provider=model_provider,
            session_id=session_id,
            ml_app=ml_app,
        )

    def workflow(
        self,
        name: str = "workflow",
        *,
        session_id: str | None = None,
        ml_app: str | None = None,
    ) -> Span:
        return Span(SpanKind.WORKFLOW, name, self.app_name, session_id=session_id, ml_app=ml_app)

    def agent(
        self,
        name: str = "agent",
        *,
        session_id: str | None = None,
        ml_app: str | None = None,
    ) -> Span:
        return Span(SpanKind.AGENT, name, self.app_name, session_id=session_id, ml_app=ml_app)

    def tool(self, name: str = "tool", *, ml_app: str | None = None) -> Span:
        return Span(SpanKind.TOOL, name, self.app_name, ml_app=ml_app)

    def task(self, name: str = "task", *, ml_app: str | None = None) -> Span:
        return Span(SpanKind.TASK, name, self.app_name, ml_app=ml_app)

    def embedding(
        self,
        name: str = "embedding",
        *,
        model_name: str = "",
        model_provider: str = "",
        ml_app: str | None = None,
    ) -> Span:
        return Span(
            SpanKind.EMBEDDING,
            name,
            self.app_name,
            model_name=model_name,
            model_provider=model_provider,
            ml_app=ml_app,
        )

    def retrieval(self, name: str = "retrieval", *, ml_app: str | None = None) -> Span:
        return Span(SpanKind.RETRIEVAL, name, self.app_name, ml_app=ml_app)

    # -- annotation helpers -----------------------------------------------

    @staticmethod
    def annotate(
        span: Span | None = None,
        *,
        input_data: Any = None,
        output_data: Any = None,
        metadata: dict[str, Any] | None = None,
        metrics: dict[str, float] | None = None,
        tags: dict[str, str] | None = None,
        prompt: dict[str, Any] | None = None,
    ) -> None:
        """Enrich the given (or currently active) span with data."""
        target = span or get_active_span()
        if target is None:
            logger.warning("annotate() called with no active span")
            return
        target.annotate(
            input_data=input_data,
            output_data=output_data,
            metadata=metadata,
            metrics=metrics,
            tags=tags,
            prompt=prompt,
        )

    @staticmethod
    @contextmanager
    def annotation_context(
        *,
        prompt: dict[str, Any] | None = None,
        tags: dict[str, str] | None = None,
        name: str | None = None,
    ) -> Iterator[None]:
        """Context manager that applies annotations to auto-instrumented spans created within."""
        # Store context that auto-instrumentation hooks can read
        span = get_active_span()
        if span is not None and tags:
            span.annotate(tags=tags)
        if span is not None and prompt:
            span.annotate(prompt=prompt)
        yield

    # -- evaluation API ---------------------------------------------------

    @staticmethod
    def export_span(span: Span | None = None) -> SpanContext:
        """Export a span's identity for attaching evaluations or distributed tracing."""
        target = span or get_active_span()
        if target is None:
            raise RuntimeError("export_span() called with no active span")
        return target.export()

    def submit_evaluation(
        self,
        *,
        label: str,
        metric_type: str,
        value: float | str,
        span_context: SpanContext | None = None,
        span_with_tag_value: dict[str, str] | None = None,
        ml_app: str | None = None,
        tags: dict[str, str] | None = None,
        assessment: str | None = None,
        reasoning: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Submit an evaluation result against a specific span."""
        payload: dict[str, Any] = {
            "label": label,
            "metric_type": metric_type,
            "value": value,
            "app_name": ml_app or self.app_name,
        }
        if span_context:
            payload["span_context"] = span_context.to_dict()
        if span_with_tag_value:
            payload["span_with_tag_value"] = span_with_tag_value
        if tags:
            payload["tags"] = tags
        if assessment:
            payload["assessment"] = assessment
        if reasoning:
            payload["reasoning"] = reasoning
        if metadata:
            payload["metadata"] = metadata
        self._eval_buffer.append(payload)

    # -- span processor ---------------------------------------------------

    def register_processor(self, processor: SpanProcessor) -> None:
        """Register a function that can modify or filter spans before they are sent."""
        self._span_processor = processor

    # -- distributed tracing helpers -------------------------------------

    @staticmethod
    def inject_distributed_headers(
        request_headers: dict[str, str],
        span: Span | None = None,
    ) -> dict[str, str]:
        """Inject span context into HTTP headers for cross-service propagation."""
        target = span or get_active_span()
        if target is None:
            return request_headers
        request_headers["x-prosperus-trace-id"] = target.trace_id
        request_headers["x-prosperus-parent-id"] = target.span_id
        return request_headers

    @staticmethod
    def activate_distributed_headers(request_headers: dict[str, str]) -> None:
        """Read distributed context from incoming HTTP headers."""
        from prosperus.spans import _active_span

        trace_id = request_headers.get("x-prosperus-trace-id")
        parent_id = request_headers.get("x-prosperus-parent-id")
        if trace_id and parent_id:
            # Create a phantom parent so child spans attach correctly
            client = _get_global()
            app_name = client.app_name if client else "unknown"
            phantom = Span(
                SpanKind.WORKFLOW,
                "__distributed_parent__",
                app_name,
                trace_id=trace_id,
                parent_id=None,
            )
            phantom.span_id = parent_id
            phantom.trace_id = trace_id
            phantom._token = _active_span.set(phantom)

    # -- internal ---------------------------------------------------------

    def _enqueue_span(self, span: Span) -> None:
        if not self._enabled:
            return
        data = span.to_data()
        if self._span_processor:
            processed = self._span_processor(data)
            if processed is None:
                return  # span filtered out
            data = processed
        self._buffer.append(data)

    def flush(self) -> None:
        """Send all buffered spans and evaluations to the Prosperus backend."""
        spans_to_send: list[dict[str, Any]] = []
        while self._buffer:
            spans_to_send.append(self._buffer.popleft().to_dict())

        evals_to_send: list[dict[str, Any]] = []
        while self._eval_buffer:
            evals_to_send.append(self._eval_buffer.popleft())

        if spans_to_send:
            try:
                self._http.post("/v1/spans", json={"spans": spans_to_send})
            except httpx.HTTPError:
                logger.exception("Failed to flush %d spans", len(spans_to_send))

        if evals_to_send:
            try:
                self._http.post("/v1/evaluations", json={"evaluations": evals_to_send})
            except httpx.HTTPError:
                logger.exception("Failed to flush %d evaluations", len(evals_to_send))

    def _schedule_flush(self) -> None:
        if not self._enabled:
            return
        self._timer = threading.Timer(self._flush_interval, self._periodic_flush)
        self._timer.daemon = True
        self._timer.start()

    def _periodic_flush(self) -> None:
        try:
            self.flush()
        finally:
            self._schedule_flush()
