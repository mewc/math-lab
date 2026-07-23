"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CATEGORIES,
  PROBLEMS,
  problemHref,
  STAGE_LABEL,
  type Category,
  type Problem,
  type ProblemSolution,
  type Stage,
} from "@/lib/problems";

// Client-side search over the whole registry. Simple token scoring: every
// query token must match somewhere; title/aka hits rank above tag hits, which
// rank above statement hits. Tackled problems break ties upward. A funnel
// button beside the search input opens a popover with category + stage filters.

const ALL_STAGES: Stage[] = ["solved", "live", "started", "untouched"];

function score(p: Problem, tokens: string[]): number {
  const title = p.title.toLowerCase();
  const aka = (p.aka ?? []).join(" ").toLowerCase();
  const tags = p.tags.join(" ").toLowerCase();
  const body = `${p.statement} ${p.status} ${p.attack} ${p.category}`.toLowerCase();
  let total = 0;
  for (const t of tokens) {
    let s = 0;
    if (title.includes(t)) s = 40;
    else if (aka.includes(t)) s = 30;
    else if (tags.includes(t)) s = 20;
    else if (body.includes(t)) s = 8;
    if (s === 0) return 0; // every token must hit
    total += s;
  }
  if (p.stage === "solved") total += 6;
  else if (p.stage === "live") total += 5;
  else if (p.stage === "started") total += 3;
  return total;
}

export default function SearchHome({ feed }: { feed?: ReactNode }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [stages, setStages] = useState<Set<Stage>>(() => new Set(ALL_STAGES));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const stagesFiltered = stages.size !== ALL_STAGES.length;
  const activeFilters = (category ? 1 : 0) + (stagesFiltered ? 1 : 0);

  // Close the popover on outside click or Escape.
  useEffect(() => {
    if (!filtersOpen) return;
    const onDown = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFiltersOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFiltersOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [filtersOpen]);

  const results = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    let list = PROBLEMS.filter(
      (p) => (!category || p.category === category) && stages.has(p.stage),
    );
    if (tokens.length > 0) {
      list = list
        .map((p) => ({ p, s: score(p, tokens) }))
        .filter((r) => r.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((r) => r.p);
    }
    return list;
  }, [query, category, stages]);

  function toggleStage(s: Stage) {
    setStages((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      // Never allow an empty set (would hide everything); reset to all instead.
      return next.size === 0 ? new Set(ALL_STAGES) : next;
    });
  }

  function resetFilters() {
    setCategory(null);
    setStages(new Set(ALL_STAGES));
  }

  return (
    <>
      <div className="search-hero">
        <div className="kicker" style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
          Open problems · computationally approachable · honestly labeled
        </div>
        <h1>
          Every problem worth <em>throwing tokens at</em>
        </h1>
      </div>

      <div className="searchbar-row">
        <div className="searchbar">
          <span className="search-glyph" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            autoFocus
            placeholder="Search problems — try “cycles”, “packing”, “sat”, “polynomials”…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search problems"
          />
        </div>

        <div className="filter-wrap" ref={filterRef}>
          <button
            type="button"
            className="filter-btn"
            aria-label="Filter"
            aria-expanded={filtersOpen}
            data-active={activeFilters > 0}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" />
            </svg>
            {activeFilters > 0 && <span className="filter-badge">{activeFilters}</span>}
          </button>

          {filtersOpen && (
            <div className="filter-popover" role="dialog" aria-label="Filters">
              <div className="fp-section">
                <div className="fp-label">Category</div>
                <div className="fp-chips">
                  <button
                    type="button"
                    className="fp-chip"
                    data-active={!category}
                    onClick={() => setCategory(null)}
                  >
                    all
                  </button>
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="fp-chip"
                      data-active={category === c}
                      onClick={() => setCategory((cur) => (cur === c ? null : c))}
                    >
                      {c.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fp-section">
                <div className="fp-label">Stage</div>
                <div className="fp-chips">
                  {ALL_STAGES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="fp-chip fp-chip-stage"
                      data-active={stages.has(s)}
                      onClick={() => toggleStage(s)}
                    >
                      <span className="sb-dot" data-stage={s} aria-hidden />
                      {STAGE_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fp-foot">
                <button type="button" className="fp-reset" onClick={resetFilters} disabled={activeFilters === 0}>
                  Reset
                </button>
                <button type="button" className="fp-done" onClick={() => setFiltersOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {feed && query.trim() === "" && activeFilters === 0 && feed}

      <div className="result-count">
        {results.length} {results.length === 1 ? "problem" : "problems"}
        {activeFilters > 0 && (
          <button type="button" className="result-clear" onClick={resetFilters}>
            clear filters
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="empty-results">
          Nothing matches. Try a broader term — or that problem isn&apos;t indexed yet.
        </div>
      ) : (
        <div className="problem-list">
          {results.map((p) => (
            <ProblemCard key={p.slug} p={p} />
          ))}
        </div>
      )}
    </>
  );
}

function ProblemCard({ p }: { p: Problem }) {
  // The card is a positioned container with a stretched Link covering it, so the
  // whole card navigates to the dossier — but external links in the solved panel
  // sit above it (z-index) and stay independently clickable without nesting <a>.
  return (
    <div className="problem-card">
      <Link href={problemHref(p)} className="card-hitbox" aria-label={p.title} />
      <div className="card-top">
        <span className="card-title">{p.title}</span>
        <span className="card-cat">{p.category}</span>
        <StageBadge stage={p.stage} />
      </div>
      <p className="card-statement">{p.statement}</p>
      {p.aka && p.aka.length > 0 && <div className="card-aka">a.k.a. {p.aka.join(" · ")}</div>}
      {p.stage === "solved" && p.solution && <SolvedPanel solution={p.solution} />}
    </div>
  );
}

function SolvedPanel({ solution }: { solution: ProblemSolution }) {
  return (
    <div className="card-solution">
      <div className="sol-line">
        <span className="sol-label">Solved by</span>
        <span className="sol-by">
          {solution.by}
          {solution.when ? ` · ${solution.when}` : ""}
        </span>
      </div>
      <p className="sol-approach">{solution.approach}</p>
      {solution.links && solution.links.length > 0 && (
        <div className="sol-links">
          {solution.links.map((l, i) =>
            l.url ? (
              <a key={i} href={l.url} target="_blank" rel="noreferrer noopener">
                {l.label}
              </a>
            ) : (
              <span key={i} className="sol-link-plain">
                {l.label}
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className="stage-badge" data-stage={stage}>
      {STAGE_LABEL[stage]}
    </span>
  );
}
