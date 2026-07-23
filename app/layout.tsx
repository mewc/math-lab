import type { Metadata, Viewport } from "next";
import { Geist_Mono, Prata } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const prata = Prata({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-prata",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Math Lab — the open problems index",
  description:
    "One searchable index of open, computationally approachable math problems — each with a precise statement, honest status, and an attack plan. Tackled problems grow into live dossiers, starting with Collatz.",
  manifest: "/manifest.json",
  // Favicon stack (abacus, theme-aware) generated with favicontools.com
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16-light.png", type: "image/png", sizes: "16x16", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-16x16-dark.png", type: "image/png", sizes: "16x16", media: "(prefers-color-scheme: dark)" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistMono.variable} ${prata.variable}`}>
      <body>
        <Sidebar />
        <div className="app-main">{children}</div>
      </body>
    </html>
  );
}
