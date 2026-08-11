import type { Column, ColumnDataType, RelationEdge, TableNode } from "@/lib/types";
import { fkBaseName, singularize, toCamelCase, toPascalCase } from "@/lib/codegen/naming";
import {
  colIndex,
  columnDbName,
  resolveJoinTableSides,
  resolveRelations,
  tableDbName,
} from "@/lib/codegen/resolve-schema";

/** Which drizzle-orm/pg-core column builder function backs each of our canonical data types. */
const BUILDER_BY_TYPE: Record<ColumnDataType, string> = {
  uuid: "uuid",
  int: "integer",
  bigint: "bigint",
  float: "doublePrecision",
  decimal: "decimal",
  varchar: "varchar",
  text: "text",
  boolean: "boolean",
  timestamp: "timestamp",
  date: "date",
  json: "jsonb",
};

interface RenderedColumn {
  /** e.g. `id: uuid("id").primaryKey().defaultRandom(),` */
  line: string;
  buildersUsed: Set<string>;
  usesSqlHelper: boolean;
}

function columnBuilderCall(column: Column, dbName: string): string {
  const fn = BUILDER_BY_TYPE[column.dataType];
  switch (column.dataType) {
    case "bigint":
      // "number" mode is the common case (values within Number.MAX_SAFE_INTEGER);
      // switch to "bigint" mode by hand if you need true 64-bit precision.
      return `${fn}(${JSON.stringify(dbName)}, { mode: "number" })`;
    case "decimal":
      return `${fn}(${JSON.stringify(dbName)}, { precision: 10, scale: 2 })`;
    case "varchar":
      return `${fn}(${JSON.stringify(dbName)}, { length: ${column.length ?? 255} })`;
    default:
      return `${fn}(${JSON.stringify(dbName)})`;
  }
}

function renderColumn(
  column: Column,
  index: number,
  isSolePrimaryKey: boolean,
  forceUnique: boolean,
  fkTarget: { tableName: string; columnCamelName: string } | undefined
): RenderedColumn {
  const dbName = columnDbName(column, index);
  const fieldName = toCamelCase(dbName);
  const buildersUsed = new Set<string>([BUILDER_BY_TYPE[column.dataType]]);
  let usesSqlHelper = false;

  let expr = columnBuilderCall(column, dbName);

  if (isSolePrimaryKey) expr += ".primaryKey()";
  // primaryKey() already implies NOT NULL at the database level — skip the redundant call.
  if (!column.isPrimaryKey && !column.isNullable) expr += ".notNull()";
  if (!column.isPrimaryKey && (column.isUnique || forceUnique)) expr += ".unique()";

  if (column.defaultValue) {
    // Treat any user-supplied default as a raw SQL expression (covers both
    // literals and function calls like now()) via the `sql` template tag.
    expr += `.default(sql\`${column.defaultValue}\`)`;
    usesSqlHelper = true;
  } else if (column.isPrimaryKey && column.dataType === "uuid") {
    expr += ".defaultRandom()";
  }

  if (fkTarget) {
    expr += `.references(() => ${toCamelCase(fkTarget.tableName)}.${fkTarget.columnCamelName})`;
  }

  return { line: `  ${fieldName}: ${expr},`, buildersUsed, usesSqlHelper };
}

export function generateDrizzle(nodes: TableNode[], edges: RelationEdge[]): string {
  if (nodes.length === 0) {
    return `// Add a table on the canvas to generate its pgTable definition.\n`;
  }

  const relations = resolveRelations(nodes, edges);
  const directRelations = relations.filter((r) => r.relationType !== "many-to-many");
  const manyToManyRelations = relations.filter((r) => r.relationType === "many-to-many");

  const forceUniqueColumnIds = new Set<string>(
    directRelations.filter((r) => r.relationType === "one-to-one").map((r) => r.childColumn.id)
  );

  // Map each FK (child) column id to what it should .references(() => ...).
  const fkTargetByColumnId = new Map<string, { tableName: string; columnCamelName: string }>();
  for (const rel of directRelations) {
    fkTargetByColumnId.set(rel.childColumn.id, {
      tableName: tableDbName(rel.parentTable, rel.parentTableIndex),
      columnCamelName: toCamelCase(columnDbName(rel.parentColumn, colIndex(rel.parentTable, rel.parentColumn))),
    });
  }

  const allBuildersUsed = new Set<string>(["pgTable"]);
  let usesSqlHelper = false;
  let usesPrimaryKeyHelper = false;

  const tableBlocks = nodes.map((table, index) => {
    const dbName = tableDbName(table, index);
    const exportName = toCamelCase(dbName);
    const pkColumns = table.data.columns.filter((c) => c.isPrimaryKey);
    const isSolePk = pkColumns.length === 1;

    const rendered = table.data.columns.map((col, i) =>
      renderColumn(
        col,
        i,
        isSolePk && col.isPrimaryKey,
        forceUniqueColumnIds.has(col.id),
        fkTargetByColumnId.get(col.id)
      )
    );
    rendered.forEach((r) => {
      r.buildersUsed.forEach((b) => allBuildersUsed.add(b));
      if (r.usesSqlHelper) usesSqlHelper = true;
    });

    const columnsBody = rendered.map((r) => r.line).join("\n");

    if (pkColumns.length > 1) {
      usesPrimaryKeyHelper = true;
      const pkFieldNames = pkColumns.map((c) => toCamelCase(columnDbName(c, colIndex(table, c))));
      const compositeKey = pkFieldNames.map((n) => `table.${n}`).join(", ");
      return (
        `export const ${exportName} = pgTable(${JSON.stringify(dbName)}, {\n${columnsBody}\n}, (table) => ({\n` +
        `  pk: primaryKey({ columns: [${compositeKey}] }),\n` +
        `}));`
      );
    }

    return `export const ${exportName} = pgTable(${JSON.stringify(dbName)}, {\n${columnsBody}\n});`;
  });

  // --- many-to-many join tables ---
  const seenJoinPairs = new Set<string>();
  const joinTableBlocks: string[] = [];
  const joinTableExportNames: { relKey: string; exportName: string; dbName: string }[] = [];

  for (const rel of manyToManyRelations) {
    const sides = resolveJoinTableSides(rel);
    if (!sides) continue;
    const pairKey = [rel.childTable.id, rel.parentTable.id].sort().join("::");
    if (seenJoinPairs.has(pairKey)) continue;
    seenJoinPairs.add(pairKey);

    const { first, second, joinTableName: joinDbName } = sides;
    const exportName = toCamelCase(joinDbName);
    usesPrimaryKeyHelper = true;
    allBuildersUsed.add(BUILDER_BY_TYPE[first.pkColumn.dataType]);
    allBuildersUsed.add(BUILDER_BY_TYPE[second.pkColumn.dataType]);

    const firstPkCamel = toCamelCase(columnDbName(first.pkColumn, colIndex(first.table, first.pkColumn)));
    const secondPkCamel = toCamelCase(columnDbName(second.pkColumn, colIndex(second.table, second.pkColumn)));
    const firstFieldName = toCamelCase(first.columnName);
    const secondFieldName = toCamelCase(second.columnName);

    joinTableBlocks.push(
      `export const ${exportName} = pgTable(${JSON.stringify(joinDbName)}, {\n` +
        `  ${firstFieldName}: ${columnBuilderCall(first.pkColumn, first.columnName)}.notNull().references(() => ${toCamelCase(
          first.tableName
        )}.${firstPkCamel}),\n` +
        `  ${secondFieldName}: ${columnBuilderCall(second.pkColumn, second.columnName)}.notNull().references(() => ${toCamelCase(
          second.tableName
        )}.${secondPkCamel}),\n` +
        `}, (table) => ({\n` +
        `  pk: primaryKey({ columns: [table.${firstFieldName}, table.${secondFieldName}] }),\n` +
        `}));`
    );
    joinTableExportNames.push({ relKey: pairKey, exportName, dbName: joinDbName });
  }

  // --- relations() blocks (Drizzle's relational-query-builder API) ---
  const relationsBlocks: string[] = [];
  let usesRelationsHelper = false;

  // A child table referencing the same parent through more than one FK
  // (e.g. posts.author_id and posts.editor_id both -> users.id) needs each
  // relation's field key disambiguated, or the second entry would silently
  // overwrite the first in the resulting object literal.
  const directedPairCounts = new Map<string, number>();
  for (const rel of directRelations) {
    const key = `${rel.childTable.id}->${rel.parentTable.id}`;
    directedPairCounts.set(key, (directedPairCounts.get(key) ?? 0) + 1);
  }
  const isAmbiguous = (rel: (typeof directRelations)[number]) =>
    (directedPairCounts.get(`${rel.childTable.id}->${rel.parentTable.id}`) ?? 0) > 1;

  nodes.forEach((table, tableIdx) => {
    const exportName = toCamelCase(tableDbName(table, tableIdx));
    const asChild = directRelations.filter((r) => r.childTable.id === table.id);
    const asParent = directRelations.filter((r) => r.parentTable.id === table.id);
    const asM2M = manyToManyRelations.filter(
      (r) => r.childTable.id === table.id || r.parentTable.id === table.id
    );
    if (asChild.length === 0 && asParent.length === 0 && asM2M.length === 0) return;

    usesRelationsHelper = true;
    const entries: string[] = [];
    const usedKeys = new Set<string>();

    /** Registers a relation entry under `preferredKey`, falling back to a numbered suffix in the rare case two relations still collide after disambiguation. */
    const pushEntry = (preferredKey: string, buildLine: (key: string) => string) => {
      let key = preferredKey;
      let n = 2;
      while (usedKeys.has(key)) {
        key = `${preferredKey}${n}`;
        n += 1;
      }
      usedKeys.add(key);
      entries.push(buildLine(key));
    };

    asChild.forEach((rel) => {
      const parentExport = toCamelCase(tableDbName(rel.parentTable, rel.parentTableIndex));
      const base = fkBaseName(rel.childColumn.name);
      const fieldKey = isAmbiguous(rel) ? base : singularize(parentExport);
      pushEntry(
        fieldKey,
        (key) =>
          `  ${key}: one(${parentExport}, {\n` +
          `    fields: [${exportName}.${toCamelCase(
            columnDbName(rel.childColumn, colIndex(rel.childTable, rel.childColumn))
          )}],\n` +
          `    references: [${parentExport}.${toCamelCase(
            columnDbName(rel.parentColumn, colIndex(rel.parentTable, rel.parentColumn))
          )}],\n` +
          `  }),`
      );
    });

    asParent.forEach((rel) => {
      const childExport = toCamelCase(tableDbName(rel.childTable, rel.childTableIndex));
      const base = fkBaseName(rel.childColumn.name);
      const ambiguous = isAmbiguous(rel);
      // Child table names are conventionally already plural ("posts"), so
      // the array-side field just reuses that name as-is rather than
      // pluralizing it again; the singular object side for 1:1 is the one
      // case worth singularizing for readability.
      const fieldKey =
        rel.relationType === "one-to-one"
          ? ambiguous
            ? `${singularize(childExport)}As${toPascalCase(base)}`
            : singularize(childExport)
          : ambiguous
            ? `${childExport}As${toPascalCase(base)}`
            : childExport;
      pushEntry(fieldKey, (key) =>
        rel.relationType === "one-to-one" ? `  ${key}: one(${childExport}),` : `  ${key}: many(${childExport}),`
      );
    });

    asM2M.forEach((rel) => {
      const isChildSide = rel.childTable.id === table.id;
      const otherTable = isChildSide ? rel.parentTable : rel.childTable;
      const otherIndex = isChildSide ? rel.parentTableIndex : rel.childTableIndex;
      const otherExport = toCamelCase(tableDbName(otherTable, otherIndex));
      const pairKey = [rel.childTable.id, rel.parentTable.id].sort().join("::");
      const join = joinTableExportNames.find((j) => j.relKey === pairKey);
      if (!join) return;
      pushEntry(otherExport, (key) => `  ${key}: many(${join.exportName}),`);
    });

    relationsBlocks.push(
      `export const ${exportName}Relations = relations(${exportName}, ({ one, many }) => ({\n${entries.join(
        "\n"
      )}\n}));`
    );
  });

  // Junction-table relations (each join row -> its two parent rows), one block per distinct pair.
  const handledJoinRelations = new Set<string>();
  for (const rel of manyToManyRelations) {
    const pairKey = [rel.childTable.id, rel.parentTable.id].sort().join("::");
    const join = joinTableExportNames.find((j) => j.relKey === pairKey);
    if (!join || handledJoinRelations.has(join.exportName)) continue;
    handledJoinRelations.add(join.exportName);
    usesRelationsHelper = true;

    const sides = resolveJoinTableSides(rel);
    if (!sides) continue;
    const { first, second, isSelfReferential } = sides;
    const firstExport = toCamelCase(first.tableName);
    const secondExport = toCamelCase(second.tableName);
    // A self-referential junction table (e.g. users_users) has both sides
    // pointing at the same export, so the object keys need distinct names
    // too — otherwise the second entry would silently overwrite the first.
    const firstKey = isSelfReferential ? `${singularize(firstExport)}A` : singularize(firstExport);
    const secondKey = isSelfReferential ? `${singularize(secondExport)}B` : singularize(secondExport);
    const firstFieldName = toCamelCase(first.columnName);
    const secondFieldName = toCamelCase(second.columnName);
    const firstPkCamel = toCamelCase(columnDbName(first.pkColumn, colIndex(first.table, first.pkColumn)));
    const secondPkCamel = toCamelCase(columnDbName(second.pkColumn, colIndex(second.table, second.pkColumn)));

    relationsBlocks.push(
      `export const ${join.exportName}Relations = relations(${join.exportName}, ({ one }) => ({\n` +
        `  ${firstKey}: one(${firstExport}, {\n` +
        `    fields: [${join.exportName}.${firstFieldName}],\n` +
        `    references: [${firstExport}.${firstPkCamel}],\n` +
        `  }),\n` +
        `  ${secondKey}: one(${secondExport}, {\n` +
        `    fields: [${join.exportName}.${secondFieldName}],\n` +
        `    references: [${secondExport}.${secondPkCamel}],\n` +
        `  }),\n` +
        `}));`
    );
  }

  const pgCoreImports = [...Array.from(allBuildersUsed), ...(usesPrimaryKeyHelper ? ["primaryKey"] : [])].sort();
  const importLines: string[] = [`import { ${pgCoreImports.join(", ")} } from "drizzle-orm/pg-core";`];
  const coreImports = [...(usesSqlHelper ? ["sql"] : []), ...(usesRelationsHelper ? ["relations"] : [])];
  if (coreImports.length > 0) {
    importLines.push(`import { ${coreImports.join(", ")} } from "drizzle-orm";`);
  }

  const sections = [
    importLines.join("\n"),
    tableBlocks.join("\n\n"),
    ...(joinTableBlocks.length > 0 ? [joinTableBlocks.join("\n\n")] : []),
    ...(relationsBlocks.length > 0 ? [relationsBlocks.join("\n\n")] : []),
  ];

  return `${sections.join("\n\n")}\n`;
}
