export function EvaluationsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Evaluations</h2>
      <p className="text-zinc-400 text-sm">
        Configure managed evaluations, custom LLM-as-a-judge rules, and view external
        evaluation results across your applications.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="font-medium text-amber-400">Managed</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Built-in quality checks: toxicity, hallucination, topic relevancy, sentiment,
            failure-to-answer, and prompt injection detection.
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="font-medium text-blue-400">Custom LLM-as-Judge</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Define evaluation criteria in natural language. Run them at scale across
            traces with your own scoring rubrics.
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="font-medium text-emerald-400">External</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Submit evaluations from your own systems via the API. Centralize results from
            RAGAS, custom pipelines, or annotation queues.
          </p>
        </div>
      </div>
    </div>
  );
}
