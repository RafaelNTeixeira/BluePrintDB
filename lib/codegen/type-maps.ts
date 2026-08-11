import type { Column, ColumnDataType } from "@/lib/types";

/** Maps our canonical data type to a PostgreSQL column type. */
export function sqlType(column: Column): string {
  switch (column.dataType) {
    case "uuid":
      return "UUID";
    case "int":
      return "INTEGER";
    case "bigint":
      return "BIGINT";
    case "float":
      return "DOUBLE PRECISION";
    case "decimal":
      return "DECIMAL(10, 2)";
    case "varchar":
      return `VARCHAR(${column.length ?? 255})`;
    case "text":
      return "TEXT";
    case "boolean":
      return "BOOLEAN";
    case "timestamp":
      return "TIMESTAMP";
    case "date":
      return "DATE";
    case "json":
      return "JSONB";
    default: {
      const _exhaustive: never = column.dataType;
      return _exhaustive;
    }
  }
}

/** The Postgres-native default expression for a column, if any (e.g. auto-generating a UUID PK). */
export function sqlDefault(column: Column): string | undefined {
  if (column.defaultValue) return column.defaultValue;
  if (column.isPrimaryKey && column.dataType === "uuid") return "gen_random_uuid()";
  return undefined;
}

export interface PrismaScalar {
  /** The base Prisma scalar type, e.g. "String", "Int". */
  type: string;
  /** An optional `@db.X` native-type attribute for precision that Prisma's scalar alone can't express. */
  nativeAttribute?: string;
}

/** Maps our canonical data type to a Prisma scalar type (+ native attribute where precision matters). */
export function prismaScalar(column: Column): PrismaScalar {
  switch (column.dataType) {
    case "uuid":
      return { type: "String", nativeAttribute: "@db.Uuid" };
    case "int":
      return { type: "Int" };
    case "bigint":
      return { type: "BigInt" };
    case "float":
      return { type: "Float" };
    case "decimal":
      return { type: "Decimal", nativeAttribute: "@db.Decimal(10, 2)" };
    case "varchar":
      return { type: "String", nativeAttribute: `@db.VarChar(${column.length ?? 255})` };
    case "text":
      return { type: "String" };
    case "boolean":
      return { type: "Boolean" };
    case "timestamp":
      return { type: "DateTime" };
    case "date":
      return { type: "DateTime", nativeAttribute: "@db.Date" };
    case "json":
      return { type: "Json" };
    default: {
      const _exhaustive: never = column.dataType;
      return _exhaustive;
    }
  }
}

/** The Prisma-native default expression for a column, if any. */
export function prismaDefault(column: Column): string | undefined {
  if (column.defaultValue) return column.defaultValue;
  if (column.isPrimaryKey && column.dataType === "uuid") return "uuid()";
  return undefined;
}

/** Data types that carry a user-editable length (kept here so UI + generators can agree on the list). */
export const TYPES_WITH_LENGTH: ColumnDataType[] = ["varchar"];
