"use client";

/**
 * Theme toggle — hand-rolled, zero runtime deps (this repo keeps only Next +
 * React; no next-themes / shadcn / lucide). The default is the visitor's system
 * color scheme, handled entirely in CSS via `prefers-color-scheme`. Clicking
 * flips to an explicit light/dark choice stored in localStorage; a tiny inline
 * script in the root layout applies that choice before first paint (no flash).
 *
 * The sun/moon glyph is swapped purely by CSS off the resolved theme, so there
 * is no hydration mismatch and no icon flicker — this button only writes state.
 */
export default function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const explicit = root.getAttribute("data-theme");
    const current =
      explicit ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode / storage disabled — the toggle still works for the session */
    }
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      title="Toggle light / dark theme"
    >
      {/* shown in dark mode → click for light */}
      <svg
        className="icon-sun"
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      {/* shown in light mode → click for dark */}
      <svg
        className="icon-moon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
