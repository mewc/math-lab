import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Math Lab — the open problems index",
  description:
    "One searchable index of open, computationally approachable math problems — each with a precise statement, honest status, and an attack plan. Tackled problems grow into live dossiers, starting with Collatz.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e14" },
  ],
};

// Applies the visitor's saved theme choice before first paint so there is no
// flash of the wrong theme. If no explicit choice is stored we leave the
// document alone and CSS `prefers-color-scheme` governs (system default).
const NO_FLASH = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
        {children}
      </body>
    </html>
  );
}
