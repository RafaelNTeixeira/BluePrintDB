"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  Panel,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
} from "reactflow";

import { useSchemaStore } from "@/lib/store";
import { TableNode } from "@/components/table-node";
import { RelationEdge } from "@/components/relation-edge";
import { Toolbar } from "@/components/toolbar";
import { Plus } from "lucide-react";

// Registered once, outside the component, so react-flow never sees a new
// object reference on re-render (that would trigger a full remount warning).
const nodeTypes: NodeTypes = { table: TableNode };
const edgeTypes: EdgeTypes = { relation: RelationEdge };

interface ContextMenuState {
  screenX: number;
  screenY: number;
  flowX: number;
  flowY: number;
}

export function SchemaCanvas() {
  const nodes = useSchemaStore((s) => s.nodes);
  const edges = useSchemaStore((s) => s.edges);
  const onNodesChange = useSchemaStore((s) => s.onNodesChange);
  const onEdgesChange = useSchemaStore((s) => s.onEdgesChange);
  const onConnect = useSchemaStore((s) => s.onConnect);
  const addTable = useSchemaStore((s) => s.addTable);

  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setMenu({
        screenX: event.clientX - bounds.left,
        screenY: event.clientY - bounds.top,
        flowX: flowPos.x,
        flowY: flowPos.y,
      });
    },
    [screenToFlowPosition]
  );

  const closeMenu = useCallback(() => setMenu(null), []);

  const handleAddTableFromMenu = useCallback(() => {
    if (!menu) return;
    addTable({ x: menu.flowX, y: menu.flowY });
    setMenu(null);
  }, [menu, addTable]);

  // Right-clicking blank canvas space should always offer "Add table here";
  // right-clicking an existing node just closes any open menu.
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      closeMenu();
    },
    [closeMenu]
  );

  return (
    <div ref={wrapperRef} className="relative h-full w-full bg-[#0B2138]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onPaneClick={closeMenu}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        onMoveStart={closeMenu}
        defaultEdgeOptions={{
          type: "relation",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: "#4C86AC",
          },
        }}
        minZoom={0.25}
        maxZoom={2}
        fitView
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={28}
          lineWidth={1}
          color="rgba(76,134,172,0.16)"
        />
        <Controls className="!border-[#2E5D82] !bg-[#123452] [&>button]:!border-[#2E5D82] [&>button]:!bg-[#123452] [&>button:hover]:!bg-[#17405f] [&_svg]:!fill-[#EAF4FB]" />
        <Panel position="top-left" className="!m-3">
          <Toolbar />
        </Panel>
        {nodes.length === 0 && (
          <Panel position="top-center" className="!m-0 !mt-32">
            <div className="pointer-events-none flex flex-col items-center gap-1 text-center">
              <p className="font-mono text-sm text-[#4C86AC]">
                Blank canvas.
              </p>
              <p className="text-xs text-[#4C86AC]/70">
                Right-click anywhere, or use "Add table" above, to start
                drafting your schema. Drag between column dots to connect
                tables, then click the relationship to set its type.
              </p>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {menu && (
        <div
          style={{ left: menu.screenX, top: menu.screenY }}
          className="absolute z-50 min-w-[180px] overflow-hidden rounded-md border border-[#2E5D82] bg-[#123452] py-1 shadow-xl shadow-black/40"
        >
          <button
            type="button"
            onClick={handleAddTableFromMenu}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[#EAF4FB] hover:bg-[#17405f]"
          >
            <Plus className="h-3.5 w-3.5 text-[#57C7E3]" />
            Add table here
          </button>
        </div>
      )}
    </div>
  );
}
