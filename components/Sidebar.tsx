"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES, PROBLEMS, problemHref, type Problem } from "@/lib/problems";
import FeedbackModal, { REPO_URL, type FeedbackProblem } from "@/components/FeedbackModal";
import CommandPalette from "@/components/CommandPalette";
import ThemeControls from "@/components/ThemeControls";
import { Rss } from "lucide-react";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.28 0 .32.22.7.82.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

// Left nav that replaces the old top bar. Searchable and navigable "within
// there": type to filter the whole registry, jump straight to any dossier.
// Collapses to a slim icon rail on desktop; slides in over content on mobile.
// Hand-rolled in the app's own CSS system (no shadcn/Tailwind) to keep the
// zero-dependency, dark-serif aesthetic intact.

function matches(p: Problem, q: string): boolean {
  if (!q) return true;
  const hay = `${p.title} ${(p.aka ?? []).join(" ")} ${p.tags.join(" ")} ${p.category}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t));
}

export default function Sidebar() {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // The problem currently in view (drives the modal's "head-on" context and the
  // active highlight). /p/collatz/attack-log → collatz, etc.
  const currentSlug = pathname?.startsWith("/p/") ? pathname.split("/")[2] : null;
  const current =
    (currentSlug &&
      PROBLEMS.find((p) => p.slug === currentSlug || p.href === `/p/${currentSlug}`)) ||
    null;
  const feedbackProblem: FeedbackProblem | null = current
    ? { title: current.title, slug: current.slug }
    : null;

  const liveCount = PROBLEMS.filter((p) => p.stage === "live").length;
  const tackledCount = PROBLEMS.filter((p) => p.stage !== "untouched").length;

  // Reflect collapse state on <html> so the main content can reclaim the space.
  useEffect(() => {
    const el = document.documentElement;
    if (collapsed) el.setAttribute("data-sidebar", "collapsed");
    else el.removeAttribute("data-sidebar");
  }, [collapsed]);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const groups = useMemo(() => {
    const q = query.trim();
    return CATEGORIES.map((cat) => ({
      cat,
      items: PROBLEMS.filter((p) => p.category === cat && matches(p, q)),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <>
      <button
        className="sb-mobile-toggle"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
      >
        ☰
      </button>

      {mobileOpen && <div className="sb-scrim" onClick={() => setMobileOpen(false)} />}

      <aside className="sidebar" data-collapsed={collapsed} data-mobile-open={mobileOpen}>
        <div className="sb-top">
          <Link href="/" className="sb-wordmark" aria-label="Math Lab — home">
            <span className="sb-mark">M</span>
            <span className="sb-word">
              <b>Math</b> Lab
            </span>
          </Link>
          <button
            className="sb-collapse"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <button
          className="sb-railsearch"
          aria-label="Search (⌘K)"
          title="Search — ⌘K"
          onClick={() => setPaletteOpen(true)}
        >
          ⌕
        </button>

        <div className="sb-searchbar">
          <span className="sb-search-glyph" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search…"
            aria-label="Search problems"
          />
          <kbd className="sb-kbd" aria-hidden onClick={() => setPaletteOpen(true)}>
            ⌘K
          </kbd>
        </div>

        <nav className="sb-nav" aria-label="Problems">

          {total === 0 ? (
            <div className="sb-empty">No problems match &ldquo;{query}&rdquo;.</div>
          ) : (
            groups.map((g) => (
              <div className="sb-group" key={g.cat}>
                <div className="sb-group-label">{g.cat}</div>
                {g.items.map((p) => {
                  const active = current?.slug === p.slug;
                  return (
                    <Link
                      key={p.slug}
                      href={problemHref(p)}
                      className="sb-item"
                      data-active={active}
                      title={p.title}
                    >
                      <span className="sb-dot" data-stage={p.stage} aria-hidden />
                      <span className="sb-item-title">{p.title}</span>
                    </Link>
                  );
                })}
              </div>
            ))
          )}
        </nav>

        <div className="sb-foot">
          <div className="sb-stats" title={`${PROBLEMS.length} problems · ${liveCount} live · ${tackledCount} tackled`}>
            {PROBLEMS.length} problems · {liveCount} live · {tackledCount} tackled
          </div>
          <div className="sb-iconrow">
            <ThemeControls />
            <a className="sb-iconbtn" href="/feed.xml" title="RSS feed" aria-label="RSS feed">
              <Rss className="size-4" aria-hidden />
            </a>
            <a
              className="sb-iconbtn"
              href={REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              title="GitHub — PRs welcome"
              aria-label="GitHub repository"
            >
              <GitHubIcon className="size-4" />
            </a>
          </div>
          <button className="sb-submit" onClick={() => setFeedbackOpen(true)}>
            <span aria-hidden>✎</span>
            <span className="sb-submit-label">Submit / feedback</span>
          </button>
          <Link className="sb-solved" href="/solved" title="Think you've solved one? The playbook">
            <span aria-hidden>✓</span>
            <span className="sb-gh-label">Solved something? Start here</span>
          </Link>
        </div>
      </aside>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        problem={feedbackProblem}
      />

      <CommandPalette
        open={paletteOpen}
        setOpen={setPaletteOpen}
        onOpenFeedback={() => setFeedbackOpen(true)}
      />
    </>
  );
}
