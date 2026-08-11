"use client";

import { Compass, Plus } from "lucide-react";
import { useSchemaStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ExportPanel } from "@/components/export-panel";

export function Toolbar() {
  const addTable = useSchemaStore((s) => s.addTable);
  const tableCount = useSchemaStore((s) => s.nodes.length);

  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-md border border-[#2E5D82] bg-[#123452]/95 px-3 py-2 shadow-lg shadow-black/30 backdrop-blur">
      <div className="flex items-center gap-2 pr-2">
        <Compass className="h-4 w-4 text-[#57C7E3]" />
        <span className="font-mono text-sm font-semibold tracking-tight text-[#EAF4FB]">
          BluePrintDB
        </span>
      </div>
      <div className="h-5 w-px bg-[#2E5D82]" />
      <Button size="sm" onClick={() => addTable()}>
        <Plus className="h-3.5 w-3.5" />
        Add table
      </Button>
      <ExportPanel />
      <span className="text-xs text-[#8FB4CC]">
        {tableCount} table{tableCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}
