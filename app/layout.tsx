import type { Metadata } from "next";
import "./globals.css";

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
      <body className="h-screen w-screen overflow-hidden antialiased">
        {children}
      </body>
    </html>
  );
}
