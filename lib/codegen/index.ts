import type { ExportFormat, RelationEdge, TableNode } from "@/lib/types";
import { generateSQL } from "@/lib/codegen/generate-sql";
import { generatePrisma } from "@/lib/codegen/generate-prisma";
import { generateDrizzle } from "@/lib/codegen/generate-drizzle";

export { generateSQL } from "@/lib/codegen/generate-sql";
export { generatePrisma } from "@/lib/codegen/generate-prisma";
export { generateDrizzle } from "@/lib/codegen/generate-drizzle";

/** File extension + display name per export format, useful for the export panel (Phase 5). */
export const EXPORT_FORMAT_META: Record<
  ExportFormat,
  { label: string; filename: string; language: string }
> = {
  sql: { label: "SQL", filename: "schema.sql", language: "sql" },
  prisma: { label: "Prisma", filename: "schema.prisma", language: "prisma" },
  drizzle: { label: "Drizzle", filename: "schema.ts", language: "typescript" },
};

export function generateCode(
  format: ExportFormat,
  nodes: TableNode[],
  edges: RelationEdge[]
): string {
  switch (format) {
    case "sql":
      return generateSQL(nodes, edges);
    case "prisma":
      return generatePrisma(nodes, edges);
    case "drizzle":
      return generateDrizzle(nodes, edges);
    default: {
      const _exhaustive: never = format;
      return _exhaustive;
    }
  }
}
