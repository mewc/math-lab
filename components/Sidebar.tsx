"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES, PROBLEMS, problemHref, type Problem } from "@/lib/problems";
import FeedbackModal, { REPO_URL, type FeedbackProblem } from "@/components/FeedbackModal";

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
          <button className="sb-submit" onClick={() => setFeedbackOpen(true)}>
            <span aria-hidden>✎</span>
            <span className="sb-submit-label">Submit / feedback</span>
          </button>
          <a className="sb-gh" href={REPO_URL} target="_blank" rel="noreferrer noopener">
            <span aria-hidden>⌥</span>
            <span className="sb-gh-label">GitHub — PRs welcome</span>
          </a>
        </div>
      </aside>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        problem={feedbackProblem}
      />
    </>
  );
}
