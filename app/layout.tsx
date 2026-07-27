import type { Metadata, Viewport } from "next";
import { Geist_Mono, Fraunces } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

// Fraunces: a sturdier, screen-friendly old-style serif (variable weights +
// true italic). Replaces Prata, whose hairline didone strokes shimmered on
// screen. The headings already ask for weight 500–700, which Prata (single
// 400) couldn't honor — Fraunces renders them at their intended weight.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const DESCRIPTION =
  "One searchable index of open, computationally approachable math problems — each with a precise statement, honest status, and an attack plan. Tackled problems grow into live dossiers, starting with Collatz.";

// Which public/ favicon set this build serves. Production ships the plain
// abacus at the root; preview and local dev get a colour-badged copy under
// public/<env>/ so their browser tabs stand apart. VERCEL_ENV is set per
// deployment (production | preview); it's absent locally, where NODE_ENV is
// "development".
const ICON_BASE =
  process.env.VERCEL_ENV === "production"
    ? ""
    : process.env.VERCEL_ENV === "preview"
      ? "/preview"
      : process.env.NODE_ENV === "production"
        ? "" // non-Vercel production build → plain icons
        : "/dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Math Lab — the open problems index",
    // Child pages set a keyword-led title; this appends the brand.
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": [{ url: "/feed.xml", title: "Math Lab — the latest" }] },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "Math Lab — the open problems index",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Math Lab — the open problems index",
    description: DESCRIPTION,
  },
  manifest: "/manifest.json",
  // Favicon stack (abacus, theme-aware) generated with favicontools.com.
  // The tab icon is badged per environment so prod / preview / local dev tabs
  // are distinguishable at a glance: production is the plain abacus, preview
  // gets an amber corner dot, local `next dev` an emerald one. The badged sets
  // live in public/<env>/ (regenerate with scripts/gen-env-favicons.py). Each
  // Vercel environment builds separately, so resolving VERCEL_ENV at build time
  // bakes the right set into that deployment.
  icons: {
    icon: [
      { url: `${ICON_BASE}/favicon.ico`, sizes: "any" },
      { url: `${ICON_BASE}/favicon-16x16-light.png`, type: "image/png", sizes: "16x16", media: "(prefers-color-scheme: light)" },
      { url: `${ICON_BASE}/favicon-16x16-dark.png`, type: "image/png", sizes: "16x16", media: "(prefers-color-scheme: dark)" },
      { url: `${ICON_BASE}/favicon-32x32.png`, type: "image/png", sizes: "32x32" },
      { url: `${ICON_BASE}/favicon-48x48.png`, type: "image/png", sizes: "48x48" },
      { url: `${ICON_BASE}/favicon-96x96.png`, type: "image/png", sizes: "96x96" },
    ],
    apple: [{ url: `${ICON_BASE}/apple-touch-icon.png`, sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1815" },
  ],
};

// Applies the saved theme (light/dark/system) to <html> before first paint so
// there's no flash of the wrong theme. Mirrors the logic in ThemeControls.
const THEME_SCRIPT = `(function(){try{var k='mathlab-theme';var t=localStorage.getItem(k)||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${fraunces.variable}`}
      // THEME_SCRIPT toggles the `dark` class on <html> before hydration
      // (no-FOUC), so the server/client class list differs by design.
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Sidebar />
        <div className="app-main">{children}</div>
      </body>
    </html>
  );
}
