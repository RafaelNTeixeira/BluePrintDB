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

## Status: Phase 3 — Connecting Nodes & Relationship Mapping ✅

Relationships are now fully interactive.

**What's new:**
- **`lib/store.ts`** — `onConnect` now parses the handle ids from the
  connection (`${columnId}-source` / `${columnId}-target`) and stores the
  resolved `sourceColumnId` / `targetColumnId` on the new edge's `data`
  right away, defaulting `relationType` to `one-to-many` (the most common
  FK shape). This is exactly the data Phase 4's code generator needs to
  emit accurate foreign keys.
- **`components/relation-edge.tsx`** — click the line itself (a wide,
  invisible hit area) or its `1:N`-style pill to open a menu that:
  - shows exactly which two columns this relationship binds, e.g.
    `orders.user_id → users.id`;
  - lets you pick **1 to 1**, **1 to many**, or **many to many** (with a
    checkmark on the current selection);
  - includes a **Delete relationship** action.
- **`components/ui/dropdown-menu.tsx`** — the Radix-based menu primitive
  backing the picker above.
- **`components/schema-canvas.tsx`** — edges now render with a directional
  arrowhead (`markerEnd`) pointing at the referenced/parent side of the
  relationship, and the empty-state hint mentions the new interaction.

**Try it:** drag from one column's right-hand dot to another table's
left-hand dot to connect them — it starts as `1:N`. Click anywhere on that
new line (or its pill) to change it to `1:1` / `N:N`, or delete it.

## Status: Phase 4 — Code Generation Engine ✅

Pure, framework-free functions that turn the current canvas (nodes + edges)
into real SQL / Prisma / Drizzle code. Nothing here touches React — Phase 5
just calls `generateCode(format, nodes, edges)` and renders the string.

**New module: `lib/codegen/`**
- **`naming.ts`** — casing helpers (`toPascalCase`, `toCamelCase`) and a
  best-effort `pluralize`/`singularize` used only for relation field names.
- **`resolve-schema.ts`** — the shared intermediate representation every
  generator builds on: resolves each edge into concrete child/parent
  table+column references (falling back to each table's primary key if a
  specific column wasn't captured), and deterministically resolves
  many-to-many join-table naming — including the self-referential case
  (e.g. users following users), where both sides need distinct column
  names (`_a` / `_b` suffixes).
- **`type-maps.ts`** — canonical data type → native SQL / Prisma type.
- **`generate-sql.ts`** — `CREATE TABLE` statements (composite PK support,
  `UNIQUE`/`NOT NULL`/`DEFAULT`), auto-generated join tables for N:N, and
  `ALTER TABLE ... FOREIGN KEY` constraints (plus a `UNIQUE` constraint on
  the FK side for 1:1).
- **`generate-prisma.ts`** — a complete `schema.prisma` (generator +
  datasource header, singular PascalCase model names with `@@map` back to
  the real table name, `@relation`-mapped fields, and Prisma's implicit
  array-field many-to-many). Automatically disambiguates when a table has
  two FKs to the same parent (e.g. `posts.author_id` / `posts.editor_id`
  both → `users.id`) with named `@relation("Post_Author", ...)` pairs.
- **`generate-drizzle.ts`** — a Drizzle `pg-core` schema: correctly-typed
  column builders, chained `.primaryKey()/.notNull()/.unique()/.default()
  /.references()`, composite PKs via table-level `primaryKey({ columns })`,
  join tables for N:N, and a `relations()` block per table for Drizzle's
  relational query API.
- **`index.ts`** — the single `generateCode(format, nodes, edges)`
  dispatcher Phase 5's export panel will call.

**How this was verified** (not just eyeballed): a fixture covering 1:1,
1:N (including two FKs from the same table to the same parent), N:N,
self-referential N:N, and a composite primary key was run through all
three generators. That caught two real bugs before they shipped — a
pluralization regex that turned "posts" into "postses", and a duplicate
object-key bug in Drizzle's `relations()` blocks that would have silently
dropped one of two FK relations pointing at the same parent table. Both
are fixed. The resulting Prisma schema was then checked with a real
Prisma-schema AST parser, and the Drizzle output was compiled for real
against the actual `drizzle-orm` package with strict TypeScript — both
pass clean.

**Design choices worth knowing about:**
- Prisma model names are singularized (`posts` → `Post`) per Prisma
  convention; Drizzle/SQL keep your literal table name everywhere, since
  neither has an equivalent "model name" concept.
- Any user-supplied column default is treated as a raw SQL/Prisma/Drizzle
  expression (via `sql\`...\`` in Drizzle) rather than guessed at as a
  literal — so `now()`, `gen_random_uuid()`, or a plain `0` all work.
- `pluralize`/`singularize` are intentionally simple heuristics (not a
  full English pluralizer) — they only affect *derived* relation field
  names, never the actual table/column identifiers you typed.

## Status: Phase 5 — Export Panel ✅ (all 5 phases complete)

The last piece: a slide-out panel that turns the live canvas into code you
can actually copy or download.

**New:**
- **`components/export-panel.tsx`** — click "Export code" in the toolbar
  to slide out a right-side panel with tabs for **SQL / Prisma / Drizzle**.
  The code preview is generated straight from the live Zustand store on
  every render (`generateCode(exportFormat, nodes, edges)`) — there's no
  separate "generate" step; edit a table with the panel open and the code
  updates immediately. Includes **Copy to clipboard** (with a brief
  "Copied!" confirmation) and **Download** (saves `schema.sql` /
  `schema.prisma` / `schema.ts` via an in-browser Blob — no server involved).
- **`lib/syntax-highlight.ts`** — a small, dependency-free syntax
  highlighter built specifically for this panel. It HTML-escapes the
  source *before* tokenizing, and tokenizes in a single regex pass (one
  combined pattern with named capture groups), which is what makes it
  safe to render with `dangerouslySetInnerHTML` even though the source
  embeds table/column names you typed yourself — a malicious table name
  like `<script>...</script>` renders as inert escaped text, verified by
  hand during development.
- **`components/code-block.tsx`** — the scrollable, monospace code viewer.
- **`components/ui/dialog.tsx`** — a Radix Dialog styled as a slide-out
  sheet (pinned to the right edge) rather than a centered modal.
- **`components/ui/tabs.tsx`** — the Radix Tabs primitive backing the
  format switcher.

**Try it:** build a table or two, then click **Export code** in the
toolbar. Switch between SQL / Prisma / Drizzle with the tabs, copy or
download whichever you need.

---

### The whole app, end to end

1. **Canvas** — right-click or "Add table" to drop a table; edit its name
   and columns (type, PK/UQ/N? toggles) directly on the node.
2. **Relationships** — drag between column handles to connect two tables;
   click the resulting line to set it to 1:1 / 1:N / N:N or delete it.
3. **Export** — click "Export code" any time to see the exact SQL, Prisma,
   or Drizzle schema that matches what's on the canvas, and copy or
   download it.

Everything runs client-side in the browser — no backend, no database
connection, no server round-trip for codegen. `npm install && npm run dev`
is the whole setup.
