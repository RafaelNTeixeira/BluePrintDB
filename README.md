# BluePrintDB — Visual Database Schema & Code Generator

Design database schemas visually and instantly export SQL, Prisma, or Drizzle code. 100% client-side, zero backend.

## Status: Phase 1 — Setup & State Management ✅

This build contains the project scaffold and the Zustand state layer only.
There is no visual canvas yet — that's Phase 2. The `/` page is a temporary
debug view with "+ Add Table" / "+ Add Column" buttons that prove the store
works, rendering live JSON of the `nodes` and `edges` arrays.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project structure

```
blueprintdb/
├── app/
│   ├── layout.tsx        # Root layout, imports global styles
│   ├── page.tsx          # Phase 1 debug page (replaced by canvas in Phase 2)
│   └── globals.css       # Tailwind directives + shadcn/ui CSS variable theme
├── components/           # Empty for now — custom nodes/edges/UI land here in Phase 2+
├── lib/
│   ├── types.ts          # Domain model: Column, TableNodeData, RelationEdgeData, etc.
│   ├── store.ts          # Zustand store: nodes, edges, all table/column/edge CRUD actions
│   └── utils.ts          # `cn()` classname helper used by shadcn/ui components
├── components.json       # shadcn/ui CLI config (for `npx shadcn add <component>` later)
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.mjs
├── tsconfig.json
└── package.json
```

## Tech stack

- Next.js 14 (App Router)
- react-flow (`reactflow` package) — canvas, nodes, edges
- Zustand + Immer — state management
- Tailwind CSS + shadcn/ui — styling
- nanoid — id generation

## Roadmap

- **Phase 1 (this build):** Zustand store + types ✅
- **Phase 2:** react-flow canvas + custom Table Node UI
- **Phase 3:** Relationship edges + edge-type picker
- **Phase 4:** SQL / Prisma / Drizzle code generation engine
- **Phase 5:** Export panel with tabs + copy-to-clipboard

## Status: Phase 2 — Canvas & Custom Table Node ✅

The real visual canvas is live at `/`, replacing the Phase 1 debug page.

**What's new:**
- `components/schema-canvas.tsx` — the `react-flow` canvas: pan/zoom, a
  right-click context menu ("Add table here") that drops a new table at
  the exact cursor position, an empty-state hint, and a styled `Controls`
  (zoom/fit-view) widget.
- `components/table-node.tsx` — the custom Table Node: editable table
  name, per-row column editing (name, data-type `Select`, and PK / UQ / N?
  constraint toggle badges), an "Add column" footer button, and
  duplicate/delete actions that appear on header hover.
- `components/relation-edge.tsx` — a custom orthogonal ("schematic trace")
  edge type with a small relationship-type pill (currently shows the
  default `1:N`; becomes editable in Phase 3).
- `components/toolbar.tsx` — floating top-left toolbar with the
  BluePrintDB wordmark, an "Add table" button, and a live table count.
- `components/ui/*` — `button`, `input`, `select`, `tooltip`, and the
  `constraint-badge` toggle, all styled for the dark "blueprint" theme.

**Design direction:** a literal blueprint / drafting-table aesthetic (deep
navy canvas, cyan schematic linework, amber secondary accent, monospace
type for anything code-like) — grounded in the product's own name rather
than a generic template.

**Connection model:** every column row has its own source (right) and
target (left) handle, keyed by column id. This means a relationship can
already be anchored to a specific column pair (e.g. `orders.user_id` →
`users.id`) as soon as it's drawn — which is exactly the data Phase 3's
relationship-type picker and Phase 4's code generator will need.

**Try it:** right-click empty canvas space → "Add table here", or use the
toolbar's "Add table" button. Edit the table name and column fields
directly on the node. Drag from one column's right-hand dot to another
table's column to draw a relationship (it currently defaults to `1:N` —
Phase 3 makes this editable by clicking the edge label).
