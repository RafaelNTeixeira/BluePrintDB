"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Database, Copy, Trash2, Plus, X } from "lucide-react";

import { useSchemaStore } from "@/lib/store";
import { COLUMN_DATA_TYPES, type ColumnDataType, type TableNodeData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConstraintBadge } from "@/components/ui/constraint-badge";

function TableNodeComponent({ id, data, selected }: NodeProps<TableNodeData>) {
  const updateTableName = useSchemaStore((s) => s.updateTableName);
  const removeTable = useSchemaStore((s) => s.removeTable);
  const duplicateTable = useSchemaStore((s) => s.duplicateTable);
  const addColumn = useSchemaStore((s) => s.addColumn);
  const updateColumn = useSchemaStore((s) => s.updateColumn);
  const removeColumn = useSchemaStore((s) => s.removeColumn);
  const setColumnDataType = useSchemaStore((s) => s.setColumnDataType);

  const [isHeaderHover, setHeaderHover] = useState(false);

  return (
    <div
      className={cn(
        "w-[300px] rounded-md border bg-[#123452] shadow-lg shadow-black/30 transition-shadow",
        selected
          ? "border-[#57C7E3] shadow-[0_0_0_1px_#57C7E3,0_0_16px_rgba(87,199,227,0.25)]"
          : "border-[#2E5D82]"
      )}
    >
      {/* --- Header --------------------------------------------------- */}
      <div
        className="flex items-center gap-1.5 rounded-t-md border-b border-[#2E5D82] bg-[#17405f] px-2 py-1.5"
        onMouseEnter={() => setHeaderHover(true)}
        onMouseLeave={() => setHeaderHover(false)}
      >
        <Database className="h-3.5 w-3.5 shrink-0 text-[#57C7E3]" />
        <Input
          value={data.label}
          onChange={(e) => updateTableName(id, e.target.value)}
          placeholder="table_name"
          className="h-6 flex-1 py-0 font-mono text-sm font-semibold"
        />
        <div
          className={cn(
            "flex items-center gap-0.5 transition-opacity",
            isHeaderHover ? "opacity-100" : "opacity-0"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            title="Duplicate table"
            onClick={() => duplicateTable(id)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            title="Delete table"
            onClick={() => removeTable(id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* --- Columns ---------------------------------------------------- */}
      <div className="py-1">
        {data.columns.map((column) => (
          <div
            key={column.id}
            className="group relative flex items-center gap-1 px-2 py-0.5"
          >
            {/* Connection handles: one target (left) + one source (right), scoped to this column */}
            <Handle
              type="target"
              position={Position.Left}
              id={`${column.id}-target`}
              className="!h-2.5 !w-2.5 !border-2 !border-[#0B2138] !bg-[#57C7E3] hover:!scale-125"
              style={{ left: -6 }}
            />
            <Handle
              type="source"
              position={Position.Right}
              id={`${column.id}-source`}
              className="!h-2.5 !w-2.5 !border-2 !border-[#0B2138] !bg-[#57C7E3] hover:!scale-125"
              style={{ right: -6 }}
            />

            <Input
              value={column.name}
              onChange={(e) =>
                updateColumn(id, column.id, { name: e.target.value })
              }
              placeholder="column_name"
              className="h-6 min-w-0 flex-1 py-0 font-mono text-xs"
            />

            <Select
              value={column.dataType}
              onValueChange={(value) =>
                setColumnDataType(id, column.id, value as ColumnDataType)
              }
            >
              <SelectTrigger className="w-[84px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_DATA_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex shrink-0 items-center gap-0.5">
              <ConstraintBadge
                label="PK"
                tooltip="Primary key"
                active={column.isPrimaryKey}
                activeClassName="border-[#57C7E3] bg-[#57C7E3]/15 text-[#57C7E3]"
                onClick={() =>
                  updateColumn(id, column.id, {
                    isPrimaryKey: !column.isPrimaryKey,
                    // A primary key can never be nullable.
                    isNullable: column.isPrimaryKey ? column.isNullable : false,
                  })
                }
              />
              <ConstraintBadge
                label="UQ"
                tooltip="Unique"
                active={column.isUnique}
                activeClassName="border-[#F2B84B] bg-[#F2B84B]/15 text-[#F2B84B]"
                onClick={() =>
                  updateColumn(id, column.id, { isUnique: !column.isUnique })
                }
              />
              <ConstraintBadge
                label="N?"
                tooltip="Nullable"
                active={column.isNullable}
                activeClassName="border-[#8FB4CC] bg-[#8FB4CC]/15 text-[#8FB4CC]"
                onClick={() =>
                  updateColumn(id, column.id, {
                    isNullable: !column.isNullable,
                  })
                }
              />
            </div>

            <button
              type="button"
              title="Remove column"
              onClick={() => removeColumn(id, column.id)}
              className="nodrag flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-[#8FB4CC]/0 hover:bg-[#E2645B]/15 hover:text-[#E2645B] group-hover:text-[#8FB4CC]/70"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {data.columns.length === 0 && (
          <p className="px-3 py-2 text-xs text-[#8FB4CC]/60">
            No columns yet.
          </p>
        )}
      </div>

      {/* --- Footer: add column ------------------------------------------ */}
      <button
        type="button"
        onClick={() => addColumn(id)}
        className="nodrag flex w-full items-center justify-center gap-1 rounded-b-md border-t border-dashed border-[#2E5D82] py-1.5 text-xs text-[#8FB4CC] hover:bg-[#17405f] hover:text-[#EAF4FB]"
      >
        <Plus className="h-3 w-3" />
        Add column
      </button>
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
