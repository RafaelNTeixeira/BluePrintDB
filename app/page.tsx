"use client";

import { ReactFlowProvider } from "reactflow";
import { SchemaCanvas } from "@/components/schema-canvas";

export default function Home() {
  return (
    <main className="h-full w-full">
      <ReactFlowProvider>
        <SchemaCanvas />
      </ReactFlowProvider>
    </main>
  );
}
