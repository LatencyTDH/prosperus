"""Tests for the Prosperus SDK core tracing functionality."""

from prosperus import (
    Prosperus,
    SpanKind,
)
from prosperus import (
    llm as package_llm,
)
from prosperus import (
    workflow as package_workflow,
)
from prosperus.decorators import llm, tool, workflow
from prosperus.spans import Span, get_active_span


def test_top_level_imports_expose_common_sdk_api() -> None:
    assert Prosperus is not None
    assert SpanKind.LLM.value == "llm"
    assert callable(package_workflow)
    assert callable(package_llm)


class TestSpanLifecycle:
    def test_span_context_manager(self) -> None:
        ph = Prosperus(api_key="test", app_name="test-app")
        ph.enable()

        with ph.workflow("test-wf") as span:
            assert span.kind == SpanKind.WORKFLOW
            assert span.name == "test-wf"
            assert get_active_span() is span

        assert get_active_span() is None
        assert span._end_ns > span._start_ns
        ph.shutdown()

    def test_nested_spans_form_tree(self) -> None:
        ph = Prosperus(api_key="test", app_name="test-app")
        ph.enable()

        with (
            ph.workflow("outer") as outer,
            ph.llm("inner", model_name="gpt-5.4", model_provider="openai") as inner,
        ):
            assert inner.parent_id == outer.span_id
            assert inner.trace_id == outer.trace_id

        ph.shutdown()

    def test_annotation(self) -> None:
        ph = Prosperus(api_key="test", app_name="test-app")
        ph.enable()

        with ph.llm("call", model_name="claude", model_provider="anthropic") as span:
            Prosperus.annotate(
                input_data=[{"role": "user", "content": "hello"}],
                output_data=[{"role": "assistant", "content": "hi"}],
                metadata={"temperature": 0.7},
                metrics={"input_tokens": 5, "output_tokens": 3},
                tags={"env": "test"},
            )
            data = span.to_data()
            assert data.input_data == [{"role": "user", "content": "hello"}]
            assert data.metrics["input_tokens"] == 5
            assert data.model_name == "claude"

        ph.shutdown()

    def test_export_span(self) -> None:
        ph = Prosperus(api_key="test", app_name="test-app")
        ph.enable()

        with ph.llm("call", model_name="test") as span:
            ctx = Prosperus.export_span()
            assert ctx.trace_id == span.trace_id
            assert ctx.span_id == span.span_id

        ph.shutdown()


class TestDecorators:
    def test_workflow_decorator(self) -> None:
        ph = Prosperus(api_key="test", app_name="test-app")
        ph.enable()
        captured_spans: list[Span] = []
        original_enqueue = ph._enqueue_span

        def capture(span: Span) -> None:
            captured_spans.append(span)
            original_enqueue(span)

        ph._enqueue_span = capture  # type: ignore[assignment]

        @workflow
        def my_workflow() -> str:
            return "done"

        result = my_workflow()
        assert result == "done"
        assert len(captured_spans) == 1
        assert captured_spans[0].kind == SpanKind.WORKFLOW
        ph.shutdown()

    def test_llm_decorator(self) -> None:
        ph = Prosperus(api_key="test", app_name="test-app")
        ph.enable()

        @llm(model_name="gpt-5.4", model_provider="openai")
        def call_model() -> str:
            return "response"

        result = call_model()
        assert result == "response"
        ph.shutdown()

    def test_nested_decorators(self) -> None:
        ph = Prosperus(api_key="test", app_name="test-app")
        ph.enable()
        spans: list[Span] = []
        original_enqueue = ph._enqueue_span

        def capture(span: Span) -> None:
            spans.append(span)
            original_enqueue(span)

        ph._enqueue_span = capture  # type: ignore[assignment]

        @tool
        def fetch_data() -> str:
            return "data"

        @llm(model_name="claude", model_provider="anthropic")
        def summarize(text: str) -> str:
            return f"summary of {text}"

        @workflow
        def pipeline() -> str:
            data = fetch_data()
            return summarize(data)

        result = pipeline()
        assert result == "summary of data"
        assert len(spans) == 3
        ph.shutdown()


class TestSpanProcessor:
    def test_processor_can_modify_spans(self) -> None:
        ph = Prosperus(api_key="test", app_name="test-app")

        def redact(span_data):
            if span_data.tags.get("redact") == "true":
                span_data.input_data = "[REDACTED]"
                span_data.output_data = "[REDACTED]"
            return span_data

        ph.register_processor(redact)
        ph.enable()

        with ph.llm("call", model_name="test"):
            Prosperus.annotate(
                input_data="secret input",
                output_data="secret output",
                tags={"redact": "true"},
            )

        assert len(ph._buffer) == 1
        assert ph._buffer[0].input_data == "[REDACTED]"
        ph.shutdown()

    def test_processor_can_filter_spans(self) -> None:
        ph = Prosperus(api_key="test", app_name="test-app")

        def drop_internal(span_data):
            if span_data.tags.get("internal") == "true":
                return None
            return span_data

        ph.register_processor(drop_internal)
        ph.enable()

        with ph.task("internal-step"):
            Prosperus.annotate(tags={"internal": "true"})

        assert len(ph._buffer) == 0
        ph.shutdown()


class TestEvaluations:
    def test_submit_evaluation(self) -> None:
        ph = Prosperus(api_key="test", app_name="test-app")
        ph.enable()

        with ph.llm("call", model_name="test"):
            ctx = Prosperus.export_span()

        ph.submit_evaluation(
            label="toxicity",
            metric_type="score",
            value=0.1,
            span_context=ctx,
            assessment="pass",
            reasoning="No toxic content detected",
        )

        assert len(ph._eval_buffer) == 1
        ev = ph._eval_buffer[0]
        assert ev["label"] == "toxicity"
        assert ev["value"] == 0.1
        assert ev["span_context"]["trace_id"] == ctx.trace_id
        ph.shutdown()


class TestDistributedTracing:
    def test_header_injection_and_activation(self) -> None:
        ph = Prosperus(api_key="test", app_name="test-app")
        ph.enable()

        with ph.workflow("origin") as origin_span:
            headers: dict[str, str] = {}
            headers = Prosperus.inject_distributed_headers(headers)
            assert headers["x-prosperus-trace-id"] == origin_span.trace_id
            assert headers["x-prosperus-parent-id"] == origin_span.span_id

        # Simulate downstream service
        Prosperus.activate_distributed_headers(headers)
        with ph.task("downstream-work") as downstream:
            assert downstream.trace_id == origin_span.trace_id

        ph.shutdown()
