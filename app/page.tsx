"use client";

import { useSchemaStore } from "@/lib/store";

/**
 * Phase 1 placeholder.
 *
 * The real react-flow canvas and custom Table Node UI are built in Phase 2.
 * This page currently exists only to prove that the Zustand store (nodes,
 * edges, and all CRUD actions) is wired up correctly end-to-end before we
 * layer the visual canvas on top of it.
 */
export default function Home() {
  const nodes = useSchemaStore((s) => s.nodes);
  const edges = useSchemaStore((s) => s.edges);
  const addTable = useSchemaStore((s) => s.addTable);
  const addColumn = useSchemaStore((s) => s.addColumn);
  const resetSchema = useSchemaStore((s) => s.resetSchema);

  return (
    <main className="flex h-full w-full flex-col gap-4 p-8">
      <div>
        <h1 className="text-2xl font-semibold">BluePrintDB</h1>
        <p className="text-sm text-muted-foreground">
          Phase 1: state layer online. Canvas UI arrives in Phase 2.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => addTable()}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
        >
          + Add Table
        </button>
        <button
          onClick={() => nodes[0] && addColumn(nodes[0].id)}
          disabled={nodes.length === 0}
          className="rounded-md bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:opacity-90 disabled:opacity-40"
        >
          + Add Column to first table
        </button>
        <button
          onClick={resetSchema}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="mb-2 text-sm font-medium">Nodes ({nodes.length})</h2>
          <pre className="max-h-[60vh] overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
            {JSON.stringify(nodes, null, 2)}
          </pre>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-medium">Edges ({edges.length})</h2>
          <pre className="max-h-[60vh] overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
            {JSON.stringify(edges, null, 2)}
          </pre>
        </div>
      </div>
    </main>
  );
}
