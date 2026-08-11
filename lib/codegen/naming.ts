/**
 * Casing + naming helpers shared by the SQL / Prisma / Drizzle generators.
 *
 * Table and column names are always taken from the user's canvas verbatim
 * for the actual database identifier (what ends up in `CREATE TABLE`,
 * `@@map(...)`, or the string literal passed to `pgTable(...)`). These
 * helpers only produce the *derived* identifiers a generator also needs —
 * a Prisma model name, a Drizzle export name, a relation field name — none
 * of which the user has a chance to type themselves.
 */

function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-\s]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

export function toPascalCase(input: string): string {
  const words = splitWords(input);
  if (words.length === 0) return "Unnamed";
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

export function toCamelCase(input: string): string {
  const pascal = toPascalCase(input);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Deliberately simple heuristic pluralization, used only for default
 * relation field names (e.g. the array field on the "one" side of a
 * 1-to-many). Good enough for common cases; not a full English pluralizer.
 */
export function pluralize(word: string): string {
  if (!word) return word;
  if (/(ss|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  if (/s$/i.test(word)) return word; // already looks plural (e.g. "posts")
  return `${word}s`;
}

/** Best-effort inverse of {@link pluralize}, used for default join-table column names. */
export function singularize(word: string): string {
  if (!word) return word;
  if (/ies$/i.test(word)) return `${word.slice(0, -3)}y`;
  if (/(ches|shes|xes|zes|sses)$/i.test(word)) return word.slice(0, -2);
  if (/s$/i.test(word) && !/ss$/i.test(word)) return word.slice(0, -1);
  return word;
}

/** Wrap a Postgres identifier in double quotes, escaping any embedded quotes. */
export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * "author_id" -> "author", "userId" -> "user". Used to derive a relation
 * field name from an FK column, and to disambiguate two FKs from the same
 * table to the same parent table (e.g. posts.author_id / posts.editor_id
 * both -> users.id). Falls back to "ref" for an unusual FK column name
 * that isn't of the form "*_id"/"*Id" (e.g. a bare "id").
 */
export function fkBaseName(rawColumnName: string): string {
  const camel = toCamelCase(rawColumnName);
  const stripped = camel.replace(/Id$/, "");
  return stripped.length > 0 ? stripped : "ref";
}

/** Fallback used whenever a table/column name is blank so output is still valid code. */
export function safeName(name: string, fallback: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}
