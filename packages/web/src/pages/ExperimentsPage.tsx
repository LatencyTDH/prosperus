import { useQuery } from "@tanstack/react-query";
import { fetchExperiments, type ExperimentRow } from "../api/client";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "running"
      ? "bg-amber-500/20 text-amber-400"
      : status === "completed"
        ? "bg-emerald-500/20 text-emerald-400"
        : "bg-zinc-500/20 text-zinc-400";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function ExperimentCard({ experiment }: { experiment: ExperimentRow }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-zinc-100">{experiment.name}</h3>
          {experiment.description && (
            <p className="text-xs text-zinc-500 mt-0.5">{experiment.description}</p>
          )}
        </div>
        <StatusBadge status={experiment.status} />
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
        {experiment.baselineTag && (
          <div>
            <span className="text-zinc-500">Baseline: </span>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-300">
              {experiment.baselineTag}
            </span>
          </div>
        )}
        <div>
          <span className="text-zinc-500">App: </span>
          <span className="text-zinc-400">{experiment.appName}</span>
        </div>
        <div>
          <span className="text-zinc-500">Created: </span>
          <span className="text-zinc-400">{formatDate(experiment.createdAt)}</span>
        </div>
      </div>

      {experiment.variantTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {experiment.variantTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-amber-500/10 text-amber-400 px-2 py-0.5 text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExperimentsPage({ appName }: { appName: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["experiments", appName],
    queryFn: () => fetchExperiments(appName || undefined),
  });

  const experiments = data?.experiments ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Experiments</h2>
      <p className="text-zinc-400 text-sm">
        Compare prompt variants, model configurations, and parameter changes with
        controlled experiments.
      </p>

      {isLoading && <p className="text-zinc-500">Loading experiments…</p>}

      {!isLoading && experiments.length === 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center space-y-2">
          <p className="text-zinc-400">No experiments yet.</p>
          <p className="text-zinc-500 text-sm max-w-md mx-auto">
            Experiments let you define a baseline and one or more variants, then compare
            evaluation metrics across them to make data-driven decisions about prompts,
            models, and parameters.
          </p>
        </div>
      )}

      {experiments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {experiments.map((e) => (
            <ExperimentCard key={e.id} experiment={e} />
          ))}
        </div>
      )}
    </div>
  );
}
