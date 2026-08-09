import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "reactflow";

import type {
  TableNode,
  RelationEdge,
  Column,
  ColumnDataType,
  RelationType,
  ExportFormat,
} from "@/lib/types";

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                    */
/* -------------------------------------------------------------------------- */

let tableCounter = 0;

function createDefaultColumn(overrides: Partial<Column> = {}): Column {
  return {
    id: nanoid(8),
    name: "id",
    dataType: "uuid",
    isPrimaryKey: true,
    isUnique: true,
    isNullable: false,
    ...overrides,
  };
}

function createEmptyColumn(): Column {
  return {
    id: nanoid(8),
    name: "column",
    dataType: "varchar",
    isPrimaryKey: false,
    isUnique: false,
    isNullable: true,
  };
}

function createDefaultTable(position: { x: number; y: number }): TableNode {
  tableCounter += 1;
  return {
    id: nanoid(8),
    type: "table",
    position,
    data: {
      label: `table_${tableCounter}`,
      columns: [createDefaultColumn()],
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                                 Store shape                                 */
/* -------------------------------------------------------------------------- */

export interface SchemaState {
  nodes: TableNode[];
  edges: RelationEdge[];
  exportFormat: ExportFormat;

  /* --- react-flow wiring (required by <ReactFlow /> in Phase 2) --- */
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  /* --- table (node) actions --- */
  addTable: (position?: { x: number; y: number }) => string;
  updateTableName: (nodeId: string, name: string) => void;
  removeTable: (nodeId: string) => void;
  duplicateTable: (nodeId: string) => void;

  /* --- column actions --- */
  addColumn: (nodeId: string) => void;
  updateColumn: (
    nodeId: string,
    columnId: string,
    updates: Partial<Omit<Column, "id">>
  ) => void;
  removeColumn: (nodeId: string, columnId: string) => void;
  setColumnDataType: (
    nodeId: string,
    columnId: string,
    dataType: ColumnDataType
  ) => void;

  /* --- relationship (edge) actions --- */
  updateEdgeRelationType: (edgeId: string, relationType: RelationType) => void;
  removeEdge: (edgeId: string) => void;

  /* --- export format --- */
  setExportFormat: (format: ExportFormat) => void;

  /* --- raw setters (bulk replace, e.g. import / undo-redo later) --- */
  setNodes: (nodes: TableNode[]) => void;
  setEdges: (edges: RelationEdge[]) => void;

  resetSchema: () => void;
}

/* -------------------------------------------------------------------------- */
/*                                  The store                                  */
/* -------------------------------------------------------------------------- */

export const useSchemaStore = create<SchemaState>()(
  immer((set, get) => ({
    nodes: [],
    edges: [],
    exportFormat: "sql",

    onNodesChange: (changes) => {
      set((state) => {
        // applyNodeChanges is immutable and returns a new array,
        // so we just reassign it rather than mutating in place.
        state.nodes = applyNodeChanges(changes, state.nodes) as TableNode[];
      });
    },

    onEdgesChange: (changes) => {
      set((state) => {
        state.edges = applyEdgeChanges(changes, state.edges) as RelationEdge[];
      });
    },

    onConnect: (connection) => {
      set((state) => {
        // Handles are named `${columnId}-source` / `${columnId}-target`
        // (see table-node.tsx), so we can recover exactly which columns
        // this relationship binds without any extra lookup.
        const sourceColumnId = connection.sourceHandle?.endsWith("-source")
          ? connection.sourceHandle.slice(0, -"-source".length)
          : undefined;
        const targetColumnId = connection.targetHandle?.endsWith("-target")
          ? connection.targetHandle.slice(0, -"-target".length)
          : undefined;

        const newEdge: RelationEdge = {
          id: `e-${nanoid(8)}`,
          source: connection.source!,
          target: connection.target!,
          sourceHandle: connection.sourceHandle ?? undefined,
          targetHandle: connection.targetHandle ?? undefined,
          type: "relation",
          data: {
            // 1-to-many is the most common FK shape (many rows referencing
            // one parent row), so it's the sensible default; the user can
            // change it by clicking the edge.
            relationType: "one-to-many",
            sourceColumnId,
            targetColumnId,
          },
        };
        state.edges.push(newEdge);
      });
    },

    addTable: (position) => {
      const table = createDefaultTable(
        position ?? {
          x: 100 + ((get().nodes.length * 40) % 400),
          y: 100 + ((get().nodes.length * 40) % 300),
        }
      );
      set((state) => {
        state.nodes.push(table);
      });
      return table.id;
    },

    updateTableName: (nodeId, name) => {
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) node.data.label = name;
      });
    },

    removeTable: (nodeId) => {
      set((state) => {
        state.nodes = state.nodes.filter((n) => n.id !== nodeId);
        state.edges = state.edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId
        );
      });
    },

    duplicateTable: (nodeId) => {
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (!node) return;
        const clone: TableNode = {
          ...node,
          id: nanoid(8),
          position: { x: node.position.x + 40, y: node.position.y + 40 },
          selected: false,
          data: {
            label: `${node.data.label}_copy`,
            columns: node.data.columns.map((c) => ({ ...c, id: nanoid(8) })),
          },
        };
        state.nodes.push(clone);
      });
    },

    addColumn: (nodeId) => {
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) node.data.columns.push(createEmptyColumn());
      });
    },

    updateColumn: (nodeId, columnId, updates) => {
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        const column = node?.data.columns.find((c) => c.id === columnId);
        if (column) Object.assign(column, updates);
      });
    },

    removeColumn: (nodeId, columnId) => {
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.data.columns = node.data.columns.filter(
            (c) => c.id !== columnId
          );
        }
      });
    },

    setColumnDataType: (nodeId, columnId, dataType) => {
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        const column = node?.data.columns.find((c) => c.id === columnId);
        if (column) column.dataType = dataType;
      });
    },

    updateEdgeRelationType: (edgeId, relationType) => {
      set((state) => {
        const edge = state.edges.find((e) => e.id === edgeId);
        if (edge) {
          if (!edge.data) {
            edge.data = { relationType };
          } else {
            edge.data.relationType = relationType;
          }
        }
      });
    },

    removeEdge: (edgeId) => {
      set((state) => {
        state.edges = state.edges.filter((e) => e.id !== edgeId);
      });
    },

    setExportFormat: (format) => {
      set((state) => {
        state.exportFormat = format;
      });
    },

    setNodes: (nodes) => {
      set((state) => {
        state.nodes = nodes;
      });
    },

    setEdges: (edges) => {
      set((state) => {
        state.edges = edges;
      });
    },

    resetSchema: () => {
      tableCounter = 0;
      set((state) => {
        state.nodes = [];
        state.edges = [];
      });
    },
  }))
);
