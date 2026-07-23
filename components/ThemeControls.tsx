"use client";

import { useEffect, useState } from "react";

// Admin control: a single button that toggles light <-> dark. "System" is not a
// selectable mode — it only decides the INITIAL theme (handled by the no-FOUC
// script in app/layout.tsx and the mount effect below). Once you click, an
// explicit "light"/"dark" choice is stored and wins from then on. The palette
// lives in globals.css as `:root` (light) + `.dark` (dark); this just decides
// when the `.dark` class sits on <html>. Zero dependencies.

export const THEME_KEY = "mathlab-theme";

type Resolved = "light" | "dark";

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function ThemeControls() {
  // Resolved theme actually on screen. Seed with a stable value for SSR; sync to
  // the real state on mount (the inline script already set <html> before paint).
  const [theme, setTheme] = useState<Resolved>("light");

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const resolved: Resolved =
      stored === "light" || stored === "dark"
        ? stored
        : systemPrefersDark()
          ? "dark"
          : "light";
    setTheme(resolved);
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, []);

  function toggle() {
    const next: Resolved = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_KEY, next); // explicit choice from here on
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <span className="theme-toggle-track" data-dark={isDark} aria-hidden>
        <span className="theme-toggle-thumb">
          {isDark ? <MoonIcon /> : <SunIcon />}
        </span>
      </span>
      <span className="theme-toggle-label">{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}

const iconProps = {
  width: 13,
  height: 13,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
