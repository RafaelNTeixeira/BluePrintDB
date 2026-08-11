import type { ExportFormat } from "@/lib/types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Tailwind classes per token kind, tuned to the blueprint palette. */
const TOKEN_CLASS: Record<string, string> = {
  comment: "text-[#5A7C94] italic",
  string: "text-[#8FD9A8]",
  ident: "text-[#EAF4FB] font-semibold",
  keyword: "text-[#57C7E3]",
  type: "text-[#F2B84B]",
};

function wordsToPattern(words: string[]): string {
  return `\\b(?:${words.join("|")})`;
}

const SQL_REGEX = new RegExp(
  [
    `(?<comment>--.*$)`,
    `(?<string>'(?:[^'\\\\]|\\\\.)*')`,
    `(?<ident>"(?:[^"\\\\]|\\\\.)*")`,
    `(?<type>${wordsToPattern([
      "DOUBLE PRECISION",
      "UUID",
      "VARCHAR\\(\\d+\\)",
      "INTEGER",
      "BIGINT",
      "DECIMAL\\(\\d+,\\s*\\d+\\)",
      "TEXT",
      "BOOLEAN",
      "TIMESTAMP",
      "DATE",
      "JSONB",
    ])})`,
    `(?<keyword>${wordsToPattern([
      "CREATE",
      "TABLE",
      "ALTER",
      "ADD",
      "CONSTRAINT",
      "FOREIGN",
      "KEY",
      "REFERENCES",
      "PRIMARY",
      "NOT",
      "NULL",
      "UNIQUE",
      "DEFAULT",
    ])})`,
  ].join("|"),
  "gm"
);

const PRISMA_REGEX = new RegExp(
  [
    `(?<comment>//.*$)`,
    `(?<string>"(?:[^"\\\\]|\\\\.)*")`,
    `(?<keyword>${wordsToPattern(["generator", "datasource", "model", "provider", "url", "env"])})`,
    `(?<type>${wordsToPattern([
      "String",
      "Int",
      "BigInt",
      "Float",
      "Decimal",
      "Boolean",
      "DateTime",
      "Json",
    ])})`,
    `(?<ident>@@?[A-Za-z]+)`,
  ].join("|"),
  "gm"
);

const TS_REGEX = new RegExp(
  [
    `(?<comment>//.*$)`,
    `(?<string>\`(?:[^\`\\\\]|\\\\.)*\`|"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')`,
    `(?<keyword>${wordsToPattern(["import", "export", "const", "from", "as"])})`,
    `(?<type>${wordsToPattern([
      "pgTable",
      "primaryKey",
      "relations",
      "uuid",
      "varchar",
      "integer",
      "bigint",
      "doublePrecision",
      "decimal",
      "text",
      "boolean",
      "timestamp",
      "date",
      "jsonb",
      "sql",
      "one",
      "many",
    ])})`,
  ].join("|"),
  "gm"
);

const REGEX_BY_FORMAT: Record<ExportFormat, RegExp> = {
  sql: SQL_REGEX,
  prisma: PRISMA_REGEX,
  drizzle: TS_REGEX,
};

/**
 * Escapes `code` for safe HTML rendering, then wraps recognized tokens in
 * colored <span>s. Single-pass via one combined regex with named groups —
 * this is what makes it safe: `String.replace` scans the *original*
 * (already-escaped) string exactly once, so a keyword regex can never
 * "see" or corrupt a `<span>` inserted by an earlier match.
 */
export function highlightCode(code: string, format: ExportFormat): string {
  const escaped = escapeHtml(code);
  const regex = REGEX_BY_FORMAT[format];

  return escaped.replace(regex, (match, ...rest) => {
    const groups = rest[rest.length - 1] as Record<string, string | undefined>;
    const kind = Object.keys(groups).find((key) => groups[key] !== undefined);
    const className = kind ? TOKEN_CLASS[kind] : undefined;
    return className ? `<span class="${className}">${match}</span>` : match;
  });
}
