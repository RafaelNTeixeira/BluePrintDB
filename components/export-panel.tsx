"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Code2, Copy, Download } from "lucide-react";

import { useSchemaStore } from "@/lib/store";
import { EXPORT_FORMAT_META, generateCode } from "@/lib/codegen";
import type { ExportFormat } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/code-block";
import {
  Dialog,
  DialogCloseButton,
  DialogDescription,
  DialogSheetContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const FORMAT_ORDER: ExportFormat[] = ["sql", "prisma", "drizzle"];

export function ExportPanel() {
  const nodes = useSchemaStore((s) => s.nodes);
  const edges = useSchemaStore((s) => s.edges);
  const exportFormat = useSchemaStore((s) => s.exportFormat);
  const setExportFormat = useSchemaStore((s) => s.setExportFormat);

  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Regenerated on every render while the panel is open, straight from the
  // live store — there's no separate "generate" step, the preview always
  // reflects the current canvas.
  const code = useMemo(
    () => generateCode(exportFormat, nodes, edges),
    [exportFormat, nodes, edges]
  );
  const meta = EXPORT_FORMAT_META[exportFormat];

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can fail (e.g. insecure context, denied permission) —
      // fail quietly rather than throwing in the user's face.
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = meta.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Code2 className="h-3.5 w-3.5" />
          Export code
        </Button>
      </DialogTrigger>

      <DialogSheetContent>
        <DialogDescription className="sr-only">
          Live-generated schema code in SQL, Prisma, or Drizzle format.
        </DialogDescription>

        <div className="flex items-center justify-between gap-3 border-b border-[#2E5D82] px-4 py-3">
          <div className="flex items-center gap-3">
            <DialogTitle className="font-mono text-sm font-semibold text-[#EAF4FB]">
              Export schema
            </DialogTitle>
            <Tabs value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
              <TabsList>
                {FORMAT_ORDER.map((format) => (
                  <TabsTrigger key={format} value={format}>
                    {EXPORT_FORMAT_META[format].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <DialogCloseButton />
        </div>

        <div className="min-h-0 flex-1 bg-[#0B2138]">
          <CodeBlock code={code} format={exportFormat} />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[#2E5D82] px-4 py-3">
          <span className="font-mono text-xs text-[#8FB4CC]">{meta.filename}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
            <Button size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
      </DialogSheetContent>
    </Dialog>
  );
}
