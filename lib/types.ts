import type { Node, Edge } from "reactflow";

/* -------------------------------------------------------------------------- */
/*                                Column types                                */
/* -------------------------------------------------------------------------- */

/**
 * Canonical set of data types supported across all three export targets
 * (SQL, Prisma, Drizzle). The `codegen` layer (Phase 4) maps each of these
 * to the correct native type per target, e.g. "uuid" -> `UUID` (SQL),
 * `String @db.Uuid` (Prisma), `uuid()` (Drizzle).
 */
export type ColumnDataType =
  | "uuid"
  | "int"
  | "bigint"
  | "float"
  | "decimal"
  | "varchar"
  | "text"
  | "boolean"
  | "timestamp"
  | "date"
  | "json";

/** Human-readable labels + grouping, used by the data-type <Select> in Phase 2. */
export const COLUMN_DATA_TYPES: { value: ColumnDataType; label: string }[] = [
  { value: "uuid", label: "UUID" },
  { value: "int", label: "Int" },
  { value: "bigint", label: "BigInt" },
  { value: "float", label: "Float" },
  { value: "decimal", label: "Decimal" },
  { value: "varchar", label: "Varchar" },
  { value: "text", label: "Text" },
  { value: "boolean", label: "Boolean" },
  { value: "timestamp", label: "Timestamp" },
  { value: "date", label: "Date" },
  { value: "json", label: "JSON" },
];

export interface Column {
  /** Stable client-generated id (nanoid). Never sent anywhere, used as React key + lookup. */
  id: string;
  name: string;
  dataType: ColumnDataType;
  isPrimaryKey: boolean;
  isUnique: boolean;
  /** Nullable defaults to true for new columns except primary keys. */
  isNullable: boolean;
  /**
   * Set automatically once this column becomes the source/target of a
   * relationship edge (Phase 3). Purely informational for the UI badge;
   * the actual FK truth lives in the edges array.
   */
  isForeignKey?: boolean;
  /** Optional literal default, e.g. "now()", "uuid_generate_v4()", "0". */
  defaultValue?: string;
  /** Only relevant for varchar; defaults to 255 in codegen if omitted. */
  length?: number;
}

/* -------------------------------------------------------------------------- */
/*                              Table node types                              */
/* -------------------------------------------------------------------------- */

/** The `data` payload of every react-flow table node. */
export interface TableNodeData {
  /** Table name as it will appear in generated code (e.g. "users"). */
  label: string;
  columns: Column[];
}

/** react-flow Node, pre-typed with our data shape. Use this everywhere instead of raw `Node`. */
export type TableNode = Node<TableNodeData, "table">;

/* -------------------------------------------------------------------------- */
/*                             Relationship types                             */
/* -------------------------------------------------------------------------- */

export type RelationType = "one-to-one" | "one-to-many" | "many-to-many";

export const RELATION_TYPES: { value: RelationType; label: string }[] = [
  { value: "one-to-one", label: "1 to 1" },
  { value: "one-to-many", label: "1 to many" },
  { value: "many-to-many", label: "Many to many" },
];

/** The `data` payload of every react-flow relationship edge. */
export interface RelationEdgeData {
  relationType: RelationType;
  /**
   * The specific columns this FK relationship binds, when known.
   * Optional because a user may draw a connection before columns exist;
   * codegen falls back to each table's primary key.
   */
  sourceColumnId?: string;
  targetColumnId?: string;
  /** Optional user-facing label rendered on the edge, e.g. "belongsTo". */
  label?: string;
}

/** react-flow Edge, pre-typed with our data shape. Use this everywhere instead of raw `Edge`. */
export type RelationEdge = Edge<RelationEdgeData>;

/* -------------------------------------------------------------------------- */
/*                                Export types                                */
/* -------------------------------------------------------------------------- */

export type ExportFormat = "sql" | "prisma" | "drizzle";
