import type { SpanRow } from "../api/client";

const KIND_COLORS: Record<string, string> = {
  llm: "border-blue-500",
  workflow: "border-amber-500",
  agent: "border-purple-500",
  tool: "border-emerald-500",
  task: "border-zinc-500",
  embedding: "border-cyan-500",
  retrieval: "border-orange-500",
};

interface Props {
  spans: SpanRow[];
  selectedSpanId: string | null;
  onSelect: (spanId: string) => void;
}

interface TreeNode {
  span: SpanRow;
  children: TreeNode[];
}

function buildTree(spans: SpanRow[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const span of spans) {
    map.set(span.spanId, { span, children: [] });
  }

  for (const span of spans) {
    const node = map.get(span.spanId)!;
    if (span.parentId && map.has(span.parentId)) {
      map.get(span.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function durationMs(span: SpanRow): number {
  return (Number(BigInt(span.endNs) - BigInt(span.startNs))) / 1_000_000;
}

function SpanNode({
  node,
  depth,
  selectedSpanId,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedSpanId: string | null;
  onSelect: (id: string) => void;
}) {
  const s = node.span;
  const isSelected = s.spanId === selectedSpanId;
  const border = KIND_COLORS[s.kind] ?? "border-zinc-600";

  return (
    <>
      <button
        onClick={() => onSelect(s.spanId)}
        className={`w-full text-left px-3 py-1.5 rounded text-xs font-mono flex items-center gap-2 transition-colors ${
          isSelected ? "bg-zinc-800" : "hover:bg-zinc-800/50"
        }`}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        <span className={`w-1 h-4 rounded-full border-l-2 ${border}`} />
        <span className="text-zinc-300 truncate flex-1">{s.name}</span>
        <span className="text-zinc-600">{s.kind}</span>
        <span className="text-zinc-500 tabular-nums">{durationMs(s).toFixed(0)}ms</span>
        {s.error && <span className="text-red-400">●</span>}
      </button>
      {node.children.map((child) => (
        <SpanNode
          key={child.span.spanId}
          node={child}
          depth={depth + 1}
          selectedSpanId={selectedSpanId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

export function SpanTree({ spans, selectedSpanId, onSelect }: Props) {
  const roots = buildTree(spans);

  return (
    <div className="space-y-0.5">
      {roots.map((root) => (
        <SpanNode
          key={root.span.spanId}
          node={root}
          depth={0}
          selectedSpanId={selectedSpanId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
