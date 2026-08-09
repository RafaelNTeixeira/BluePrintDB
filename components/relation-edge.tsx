"use client";

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "reactflow";
import type { RelationEdgeData } from "@/lib/types";

const RELATION_ABBREVIATION: Record<RelationEdgeData["relationType"], string> = {
  "one-to-one": "1:1",
  "one-to-many": "1:N",
  "many-to-many": "N:N",
};

export function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<RelationEdgeData>) {
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

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "#57C7E3" : "#4C86AC",
          strokeWidth: selected ? 2 : 1.5,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
          className="nodrag nopan rounded-sm border border-[#2E5D82] bg-[#0B2138] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#8FB4CC]"
        >
          {RELATION_ABBREVIATION[relationType]}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
