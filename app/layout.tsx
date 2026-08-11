import type { Metadata } from "next";
import "reactflow/dist/style.css";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "BluePrintDB — Visual Database Schema & Code Generator",
  description:
    "Design database schemas visually and instantly export SQL, Prisma, or Drizzle code. 100% client-side.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen w-screen overflow-hidden bg-[#0B2138] text-[#EAF4FB] antialiased">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
