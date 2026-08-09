"use client";

import { useMemo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "reactflow";
import { Trash2 } from "lucide-react";

import { useSchemaStore } from "@/lib/store";
import { RELATION_TYPES, type RelationEdgeData } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const RELATION_ABBREVIATION: Record<RelationEdgeData["relationType"], string> = {
  "one-to-one": "1:1",
  "one-to-many": "1:N",
  "many-to-many": "N:N",
};

export function RelationEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<RelationEdgeData>) {
  const [open, setOpen] = useState(false);

  const updateEdgeRelationType = useSchemaStore(
    (s) => s.updateEdgeRelationType
  );
  const removeEdge = useSchemaStore((s) => s.removeEdge);

  // Resolve human-readable "table.column" labels for both ends so the
  // picker can show exactly what this relationship binds, e.g.
  // "orders.user_id  →  users.id" rather than raw ids.
  const sourceNode = useSchemaStore((s) => s.nodes.find((n) => n.id === source));
  const targetNode = useSchemaStore((s) => s.nodes.find((n) => n.id === target));

  const sourceLabel = useMemo(() => {
    const col = sourceNode?.data.columns.find((c) => c.id === data?.sourceColumnId);
    return sourceNode ? `${sourceNode.data.label}${col ? `.${col.name}` : ""}` : "?";
  }, [sourceNode, data?.sourceColumnId]);

  const targetLabel = useMemo(() => {
    const col = targetNode?.data.columns.find((c) => c.id === data?.targetColumnId);
    return targetNode ? `${targetNode.data.label}${col ? `.${col.name}` : ""}` : "?";
  }, [targetNode, data?.targetColumnId]);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 6,
  });

  const relationType = data?.relationType ?? "one-to-many";
  const isHighlighted = selected || open;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: isHighlighted ? "#57C7E3" : "#4C86AC",
          strokeWidth: isHighlighted ? 2 : 1.5,
        }}
      />

      {/* Wider, invisible hit area so clicking anywhere near the line (not
          just the label pill) opens the relationship picker. */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        className="cursor-pointer"
        onClick={() => setOpen(true)}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
          className="nodrag nopan"
        >
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-semibold transition-colors ${
                  isHighlighted
                    ? "border-[#57C7E3] bg-[#0B2138] text-[#57C7E3]"
                    : "border-[#2E5D82] bg-[#0B2138] text-[#8FB4CC] hover:border-[#4C86AC]"
                }`}
              >
                {RELATION_ABBREVIATION[relationType]}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <div className="px-2 py-1 font-mono text-[10px] text-[#8FB4CC]">
                {sourceLabel} → {targetLabel}
              </div>
              <DropdownMenuSeparator />
              {RELATION_TYPES.map((rt) => (
                <DropdownMenuItem
                  key={rt.value}
                  active={relationType === rt.value}
                  onSelect={() => updateEdgeRelationType(id, rt.value)}
                >
                  {rt.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => removeEdge(id)}>
                <Trash2 className="h-3 w-3" />
                Delete relationship
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
