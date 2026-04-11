"""Function decorators for tracing LLM application operations."""

from __future__ import annotations

import functools
from typing import Any, Callable, TypeVar

from prosperus.spans import Span
from prosperus.types import SpanKind

F = TypeVar("F", bound=Callable[..., Any])


def _make_decorator(
    kind: SpanKind,
    name: str | None = None,
    *,
    model_name: str | None = None,
    model_provider: str | None = None,
    session_id: str | None = None,
    ml_app: str | None = None,
) -> Callable[[F], F]:
    def decorator(fn: F) -> F:
        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            from prosperus.client import _get_global

            client = _get_global()
            app_name = ml_app or (client.app_name if client else "unknown")
            span_name = name or fn.__qualname__

            with Span(
                kind=kind,
                name=span_name,
                app_name=app_name,
                model_name=model_name,
                model_provider=model_provider,
                session_id=session_id,
                ml_app=ml_app,
            ):
                return fn(*args, **kwargs)

        return wrapper  # type: ignore[return-value]

    return decorator


# ---- public decorators -------------------------------------------------


def llm(
    fn: F | None = None,
    *,
    model_name: str = "",
    model_provider: str = "",
    name: str | None = None,
    session_id: str | None = None,
    ml_app: str | None = None,
) -> F | Callable[[F], F]:
    """Trace an LLM inference call."""
    dec = _make_decorator(
        SpanKind.LLM,
        name,
        model_name=model_name,
        model_provider=model_provider,
        session_id=session_id,
        ml_app=ml_app,
    )
    return dec if fn is None else dec(fn)


def workflow(
    fn: F | None = None,
    *,
    name: str | None = None,
    session_id: str | None = None,
    ml_app: str | None = None,
) -> F | Callable[[F], F]:
    """Trace a deterministic sequence of operations."""
    dec = _make_decorator(SpanKind.WORKFLOW, name, session_id=session_id, ml_app=ml_app)
    return dec if fn is None else dec(fn)


def agent(
    fn: F | None = None,
    *,
    name: str | None = None,
    session_id: str | None = None,
    ml_app: str | None = None,
) -> F | Callable[[F], F]:
    """Trace an autonomous agent execution."""
    dec = _make_decorator(SpanKind.AGENT, name, session_id=session_id, ml_app=ml_app)
    return dec if fn is None else dec(fn)


def tool(
    fn: F | None = None,
    *,
    name: str | None = None,
    ml_app: str | None = None,
) -> F | Callable[[F], F]:
    """Trace a tool call (external API, database, etc.)."""
    dec = _make_decorator(SpanKind.TOOL, name, ml_app=ml_app)
    return dec if fn is None else dec(fn)


def task(
    fn: F | None = None,
    *,
    name: str | None = None,
    ml_app: str | None = None,
) -> F | Callable[[F], F]:
    """Trace a standalone processing step (no external call)."""
    dec = _make_decorator(SpanKind.TASK, name, ml_app=ml_app)
    return dec if fn is None else dec(fn)


def embedding(
    fn: F | None = None,
    *,
    model_name: str = "",
    model_provider: str = "",
    name: str | None = None,
    ml_app: str | None = None,
) -> F | Callable[[F], F]:
    """Trace an embedding model call."""
    dec = _make_decorator(
        SpanKind.EMBEDDING,
        name,
        model_name=model_name,
        model_provider=model_provider,
        ml_app=ml_app,
    )
    return dec if fn is None else dec(fn)


def retrieval(
    fn: F | None = None,
    *,
    name: str | None = None,
    ml_app: str | None = None,
) -> F | Callable[[F], F]:
    """Trace a vector/document retrieval operation."""
    dec = _make_decorator(SpanKind.RETRIEVAL, name, ml_app=ml_app)
    return dec if fn is None else dec(fn)
