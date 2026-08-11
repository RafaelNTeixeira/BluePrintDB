"use client";

import { useMemo } from "react";
import type { ExportFormat } from "@/lib/types";
import { highlightCode } from "@/lib/syntax-highlight";

interface CodeBlockProps {
  code: string;
  format: ExportFormat;
}

export function CodeBlock({ code, format }: CodeBlockProps) {
  // highlightCode HTML-escapes the source before ever wrapping tokens in
  // spans, so this is safe even though the source embeds user-typed table
  // and column names verbatim (see lib/syntax-highlight.ts).
  const html = useMemo(() => highlightCode(code, format), [code, format]);

  return (
    <pre className="h-full overflow-auto p-4 text-[13px] leading-relaxed">
      <code
        className="font-mono text-[#8FB4CC]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </pre>
  );
}
