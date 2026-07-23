"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Switch } from "@/components/ui/switch";

// Admin control: a single shadcn Switch toggling light <-> dark. "System" is not
// a selectable mode — it only decides the INITIAL theme (the no-FOUC script in
// app/layout.tsx applies it before paint; the mount effect below syncs state).
// Once toggled, an explicit "light"/"dark" choice is stored and wins from then
// on. The palette lives in globals.css (:root + .dark); this decides when the
// `.dark` class sits on <html>.

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

  function onToggle(next: boolean) {
    setDark(next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light"); // explicit from here on
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <div className="theme-controls flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
      <span className="theme-controls-text flex items-center gap-2 text-xs text-muted-foreground">
        {dark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
        {dark ? "Dark" : "Light"}
      </span>
      <Switch checked={dark} onCheckedChange={onToggle} aria-label="Toggle dark theme" />
    </div>
  );
}
