import type { Column, RelationEdge, TableNode } from "@/lib/types";
import { fkBaseName, pluralize, singularize, toCamelCase, toPascalCase } from "@/lib/codegen/naming";
import {
  colIndex,
  columnDbName,
  resolveRelations,
  tableDbName,
} from "@/lib/codegen/resolve-schema";
import { prismaDefault, prismaScalar } from "@/lib/codegen/type-maps";

const HEADER = [
  "generator client {",
  '  provider = "prisma-client-js"',
  "}",
  "",
  "datasource db {",
  '  provider = "postgresql"',
  '  url      = env("DATABASE_URL")',
  "}",
  "",
].join("\n");

function modelName(table: TableNode, index: number): string {
  return toPascalCase(singularize(tableDbName(table, index)));
}

function renderScalarField(
  column: Column,
  index: number,
  isSolePrimaryKey: boolean,
  forceUnique: boolean
): string {
  const fieldName = toCamelCase(columnDbName(column, index));
  const scalar = prismaScalar(column);
  const optional = column.isNullable && !column.isPrimaryKey ? "?" : "";

  const attrs: string[] = [];
  if (isSolePrimaryKey) attrs.push("@id");
  const def = prismaDefault(column);
  if (def) attrs.push(`@default(${def})`);
  // A primary key is already unique — no need for a redundant @unique.
  if (!column.isPrimaryKey && (column.isUnique || forceUnique)) attrs.push("@unique");
  if (scalar.nativeAttribute) attrs.push(scalar.nativeAttribute);

  const attrString = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
  return `  ${fieldName} ${scalar.type}${optional}${attrString}`;
}

export function generatePrisma(nodes: TableNode[], edges: RelationEdge[]): string {
  if (nodes.length === 0) {
    return `${HEADER}\n// Add a table on the canvas to generate its model block.\n`;
  }

  const relations = resolveRelations(nodes, edges);
  const directRelations = relations.filter((r) => r.relationType !== "many-to-many");
  const manyToManyRelations = relations.filter((r) => r.relationType === "many-to-many");

  // Prisma requires an explicit @relation("Name", ...) pair whenever a child
  // model references the very same parent model through more than one FK
  // (e.g. posts.author_id and posts.editor_id both -> users.id).
  const directedPairCounts = new Map<string, number>();
  for (const rel of directRelations) {
    const key = `${rel.childTable.id}->${rel.parentTable.id}`;
    directedPairCounts.set(key, (directedPairCounts.get(key) ?? 0) + 1);
  }

  // One-to-one FKs must be @unique in Prisma to represent the 1:1 cardinality,
  // even if the user didn't separately toggle the UQ badge on the canvas.
  const forceUniqueColumnIds = new Set<string>(
    directRelations.filter((r) => r.relationType === "one-to-one").map((r) => r.childColumn.id)
  );

  // Extra relation-field lines to splice into each model, keyed by table id.
  const childSideLines = new Map<string, string[]>();
  const parentSideLines = new Map<string, string[]>();
  const append = (map: Map<string, string[]>, tableId: string, line: string) => {
    map.set(tableId, [...(map.get(tableId) ?? []), line]);
  };

  for (const rel of directRelations) {
    const childModel = modelName(rel.childTable, rel.childTableIndex);
    const parentModel = modelName(rel.parentTable, rel.parentTableIndex);
    const pairKey = `${rel.childTable.id}->${rel.parentTable.id}`;
    const ambiguous = (directedPairCounts.get(pairKey) ?? 0) > 1;
    const base = fkBaseName(rel.childColumn.name);
    const relationName = ambiguous ? `${childModel}_${toPascalCase(base)}` : undefined;

    const scalarFieldName = toCamelCase(columnDbName(rel.childColumn, colIndex(rel.childTable, rel.childColumn)));
    const parentScalarFieldName = toCamelCase(
      columnDbName(rel.parentColumn, colIndex(rel.parentTable, rel.parentColumn))
    );

    // --- child side: the object relation field alongside the FK scalar ---
    const childFieldName = ambiguous ? base : toCamelCase(parentModel);
    const childFieldOptional = rel.childColumn.isNullable ? "?" : "";
    const relationAttr = relationName
      ? `@relation("${relationName}", fields: [${scalarFieldName}], references: [${parentScalarFieldName}])`
      : `@relation(fields: [${scalarFieldName}], references: [${parentScalarFieldName}])`;
    append(
      childSideLines,
      rel.childTable.id,
      `  ${childFieldName} ${parentModel}${childFieldOptional} ${relationAttr}`
    );

    // --- parent side: the inverse field (array for 1:N, optional object for 1:1) ---
    const childCamel = toCamelCase(childModel);
    const parentFieldName =
      rel.relationType === "one-to-one"
        ? ambiguous ? `${childCamel}As${toPascalCase(base)}` : childCamel
        : ambiguous ? `${pluralize(childCamel)}As${toPascalCase(base)}` : pluralize(childCamel);
    const parentFieldType = rel.relationType === "one-to-one" ? `${childModel}?` : `${childModel}[]`;
    const parentRelationAttr = relationName ? ` @relation("${relationName}")` : "";
    append(parentSideLines, rel.parentTable.id, `  ${parentFieldName} ${parentFieldType}${parentRelationAttr}`);
  }

  // --- many-to-many: Prisma's implicit relation, just a List field on each side ---
  const seenPairs = new Set<string>();
  for (const rel of manyToManyRelations) {
    const pairKey = [rel.childTable.id, rel.parentTable.id].sort().join("::");
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    const childModel = modelName(rel.childTable, rel.childTableIndex);
    const parentModel = modelName(rel.parentTable, rel.parentTableIndex);
    const isSelfRelation = rel.childTable.id === rel.parentTable.id;

    if (isSelfRelation) {
      // A self many-to-many is inherently ambiguous to Prisma, so it always
      // needs an explicit relation name. "following" / "followedBy" is a
      // reasonable placeholder — rename in the generated file as needed.
      const relationName = `${childModel}To${childModel}`;
      append(childSideLines, rel.childTable.id, `  following ${parentModel}[] @relation("${relationName}")`);
      append(childSideLines, rel.childTable.id, `  followedBy ${parentModel}[] @relation("${relationName}")`);
    } else {
      append(childSideLines, rel.childTable.id, `  ${pluralize(toCamelCase(parentModel))} ${parentModel}[]`);
      append(parentSideLines, rel.parentTable.id, `  ${pluralize(toCamelCase(childModel))} ${childModel}[]`);
    }
  }

  const modelBlocks = nodes.map((table, index) => {
    const name = modelName(table, index);
    const dbName = tableDbName(table, index);
    const pkColumns = table.data.columns.filter((c) => c.isPrimaryKey);
    const isSolePk = pkColumns.length === 1;

    const scalarLines = table.data.columns.map((col, i) =>
      renderScalarField(col, i, isSolePk && col.isPrimaryKey, forceUniqueColumnIds.has(col.id))
    );

    const blockAttrs: string[] = [];
    if (pkColumns.length > 1) {
      const pkFieldNames = pkColumns.map((c) => toCamelCase(columnDbName(c, colIndex(table, c))));
      blockAttrs.push(`  @@id([${pkFieldNames.join(", ")}])`);
    }
    blockAttrs.push(`  @@map("${dbName}")`);

    const body = [
      ...scalarLines,
      ...(childSideLines.get(table.id) ?? []),
      ...(parentSideLines.get(table.id) ?? []),
      ...blockAttrs,
    ].join("\n");

    return `model ${name} {\n${body}\n}`;
  });

  return `${HEADER}\n${modelBlocks.join("\n\n")}\n`;
}
