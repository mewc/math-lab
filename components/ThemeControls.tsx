"use client";

import { useEffect, useState } from "react";

// Admin control: light / dark / system theme toggle. The palette lives in
// globals.css as `:root` (light) + `.dark` (dark); this just decides when the
// `.dark` class sits on <html>. Preference persists in localStorage under
// THEME_KEY; a matching no-FOUC script in app/layout.tsx applies it before
// first paint so there's no flash. Zero dependencies — no next-themes.

export const THEME_KEY = "mathlab-theme";

type Theme = "light" | "dark" | "system";

const OPTIONS: { id: Theme; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

export default function ThemeControls() {
  // Start at "system" for a stable first render; sync to the stored value after
  // mount (the inline script has already applied the real theme to <html>).
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system";
    setTheme(stored);
  }, []);

  // Follow the OS when on "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  function choose(next: Theme) {
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  return (
    <div className="sb-admin">
      <div className="sb-admin-label">Theme</div>
      <div className="theme-toggle" role="radiogroup" aria-label="Theme">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={theme === o.id}
            data-active={theme === o.id}
            className="theme-opt"
            title={o.label}
            onClick={() => choose(o.id)}
          >
            <ThemeIcon theme={o.id} />
            <span className="theme-opt-label">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ThemeIcon({ theme }: { theme: Theme }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (theme === "light") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </svg>
    );
  }
  if (theme === "dark") {
    return (
      <svg {...common}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
