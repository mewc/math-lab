"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Icon-only light/dark toggle. "System" only decides the INITIAL theme (the
// no-FOUC script in app/layout.tsx applies it before paint; the mount effect
// below syncs state). Once toggled, an explicit "light"/"dark" choice is stored
// and wins from then on. Palette lives in globals.css (:root + .dark).

export const THEME_KEY = "mathlab-theme";

export default function ThemeControls() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const isDark =
      stored === "dark" ||
      (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function onToggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="sb-iconbtn"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light" : "Switch to dark"}
    >
      {dark ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
    </button>
  );
}
