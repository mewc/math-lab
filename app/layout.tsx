import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Math Lab — the open problems index",
  description:
    "One searchable index of open, computationally approachable math problems — each with a precise statement, honest status, and an attack plan. Tackled problems grow into live dossiers, starting with Collatz.",
};

export const viewport: Viewport = {
  themeColor: "#f0b429",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
