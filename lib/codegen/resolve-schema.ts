import type { Column, RelationEdge, RelationType, TableNode } from "@/lib/types";
import { safeName, singularize } from "@/lib/codegen/naming";

/** Table name as it will appear in generated code, with a safe fallback. */
export function tableDbName(table: TableNode, index: number): string {
  return safeName(table.data.label, `table_${index + 1}`);
}

/** Column name as it will appear in generated code, with a safe fallback. */
export function columnDbName(column: Column, index: number): string {
  return safeName(column.name, `column_${index + 1}`);
}

/**
 * A table's primary key column. Falls back to the first column (with a
 * generated-code comment explaining the fallback) if the user never
 * flagged one — the diagram is still a valid input, just an unusual one.
 */
export function getPrimaryKeyColumn(table: TableNode): Column | undefined {
  return (
    table.data.columns.find((c) => c.isPrimaryKey) ?? table.data.columns[0]
  );
}

/** Index of a column within its table's columns array — used as a stable fallback name seed. */
export function colIndex(table: TableNode, column: Column): number {
  return table.data.columns.indexOf(column);
}

export interface ResolvedRelation {
  edgeId: string;
  relationType: RelationType;
  /** The table that owns the foreign key column (the "many"/child side for 1:1 and 1:N). */
  childTable: TableNode;
  childTableIndex: number;
  childColumn: Column;
  /** The table being referenced (the "one"/parent side). */
  parentTable: TableNode;
  parentTableIndex: number;
  parentColumn: Column;
}

/**
 * Resolves every edge into concrete table/column references, dropping any
 * edge that points at a table which no longer exists (can happen if a
 * table was deleted after the edge was drawn — react-flow's own delete
 * logic already prunes these, but codegen stays defensive regardless).
 *
 * The edge's `source` is treated as the child/FK side and `target` as the
 * parent/referenced side, matching the drag direction used when the edge
 * was created (see `onConnect` in the store) and the arrowhead direction
 * on the canvas.
 */
export function resolveRelations(
  nodes: TableNode[],
  edges: RelationEdge[]
): ResolvedRelation[] {
  const nodeIndexById = new Map(nodes.map((n, i) => [n.id, i]));

  const resolved: ResolvedRelation[] = [];

  for (const edge of edges) {
    const childTable = nodes.find((n) => n.id === edge.source);
    const parentTable = nodes.find((n) => n.id === edge.target);
    if (!childTable || !parentTable) continue;

    const childColumn =
      childTable.data.columns.find((c) => c.id === edge.data?.sourceColumnId) ??
      getPrimaryKeyColumn(childTable);
    const parentColumn =
      parentTable.data.columns.find((c) => c.id === edge.data?.targetColumnId) ??
      getPrimaryKeyColumn(parentTable);
    if (!childColumn || !parentColumn) continue;

    resolved.push({
      edgeId: edge.id,
      relationType: edge.data?.relationType ?? "one-to-many",
      childTable,
      childTableIndex: nodeIndexById.get(childTable.id)!,
      childColumn,
      parentTable,
      parentTableIndex: nodeIndexById.get(parentTable.id)!,
      parentColumn,
    });
  }

  return resolved;
}

/**
 * Deterministic join-table name for a many-to-many relation: alphabetical
 * so the same pair of tables always produces the same name regardless of
 * which side the user dragged from.
 */
export function joinTableName(tableAName: string, tableBName: string): string {
  const [first, second] = [tableAName, tableBName].sort((a, b) =>
    a.localeCompare(b)
  );
  return `${first}_${second}`;
}

/** Default FK column name for a join-table side, e.g. "user" -> "user_id". */
export function joinColumnName(tableName: string): string {
  return `${singularize(tableName)}_id`;
}

export interface JoinTableSide {
  table: TableNode;
  tableIndex: number;
  tableName: string;
  columnName: string;
  pkColumn: Column;
}

export interface JoinTableSides {
  joinTableName: string;
  isSelfReferential: boolean;
  first: JoinTableSide;
  second: JoinTableSide;
}

/**
 * Resolves everything needed to emit a many-to-many junction table for a
 * resolved relation: a deterministic name, and both sides' table/PK/column
 * info — with `_a` / `_b` suffixes on the column names for the
 * self-referential case (e.g. users following users), where the two sides
 * would otherwise collide on an identical column name.
 *
 * Returns undefined if either table has no columns at all (nothing to key off).
 */
export function resolveJoinTableSides(rel: ResolvedRelation): JoinTableSides | undefined {
  const childName = tableDbName(rel.childTable, rel.childTableIndex);
  const parentName = tableDbName(rel.parentTable, rel.parentTableIndex);
  const isSelfReferential = rel.childTable.id === rel.parentTable.id;

  // Alphabetical ordering keeps the join table's shape deterministic
  // regardless of which side the user dragged from — except when it's a
  // self-relation, where "first"/"second" simply become the two sides.
  const childIsFirst = isSelfReferential || childName.localeCompare(parentName) <= 0;

  const first: Omit<JoinTableSide, "columnName" | "pkColumn"> = childIsFirst
    ? { table: rel.childTable, tableIndex: rel.childTableIndex, tableName: childName }
    : { table: rel.parentTable, tableIndex: rel.parentTableIndex, tableName: parentName };
  const second: Omit<JoinTableSide, "columnName" | "pkColumn"> = childIsFirst
    ? { table: rel.parentTable, tableIndex: rel.parentTableIndex, tableName: parentName }
    : { table: rel.childTable, tableIndex: rel.childTableIndex, tableName: childName };

  const firstPk = getPrimaryKeyColumn(first.table);
  const secondPk = getPrimaryKeyColumn(second.table);
  if (!firstPk || !secondPk) return undefined;

  const firstColumnName = isSelfReferential
    ? `${joinColumnName(first.tableName)}_a`
    : joinColumnName(first.tableName);
  const secondColumnName = isSelfReferential
    ? `${joinColumnName(second.tableName)}_b`
    : joinColumnName(second.tableName);

  return {
    joinTableName: joinTableName(childName, parentName),
    isSelfReferential,
    first: { ...first, columnName: firstColumnName, pkColumn: firstPk },
    second: { ...second, columnName: secondColumnName, pkColumn: secondPk },
  };
}

