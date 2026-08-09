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
