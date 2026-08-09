"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConstraintBadgeProps {
  label: string;
  tooltip: string;
  active: boolean;
  activeClassName: string;
  onClick: () => void;
}

/**
 * A 2-3 letter toggle badge (PK / UQ / N?). Chosen over a full switch
 * component because a table row only has ~20px of vertical space per
 * constraint — the badge itself communicates state through color/fill,
 * and the tooltip gives the full constraint name on hover.
 */
export function ConstraintBadge({
  label,
  tooltip,
  active,
  activeClassName,
  onClick,
}: ConstraintBadgeProps) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "nodrag flex h-6 w-7 shrink-0 items-center justify-center rounded-sm border text-[10px] font-mono font-semibold tracking-tight transition-colors",
            active
              ? activeClassName
              : "border-[#2E5D82] bg-transparent text-[#8FB4CC]/60 hover:border-[#4C86AC] hover:text-[#8FB4CC]"
          )}
        >
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
