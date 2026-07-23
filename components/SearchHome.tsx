"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CATEGORIES,
  PROBLEMS,
  problemHref,
  STAGE_LABEL,
  type Category,
  type Problem,
  type Stage,
} from "@/lib/problems";

// Client-side search over the whole registry. Simple token scoring: every
// query token must match somewhere; title/aka hits rank above tag hits, which
// rank above statement hits. Tackled problems break ties upward.

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

export default function SearchHome() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [tackledOnly, setTackledOnly] = useState(false);

  const results = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    let list = PROBLEMS.filter(
      (p) => (!category || p.category === category) && (!tackledOnly || p.stage !== "untouched"),
    );
    if (tokens.length > 0) {
      list = list
        .map((p) => ({ p, s: score(p, tokens) }))
        .filter((r) => r.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((r) => r.p);
    }
    return list;
  }, [query, category, tackledOnly]);

  return (
    <>
      <div className="search-hero">
        <div className="kicker" style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
          Open problems · computationally approachable · honestly labeled
        </div>
        <h1>
          Every problem worth <em>throwing tokens at</em>
        </h1>
        <p className="lede">
          One index of open math problems that reward construction, counterexample hunting, and
          small-case search. Each entry states the problem precisely, reports its real status, and
          sketches the attack. Tackled problems grow into live dossiers — Collatz is the first.
        </p>
      </div>

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

      <div className="filter-row">
        <button
          type="button"
          className="filter-chip"
          data-active={!category && !tackledOnly}
          onClick={() => {
            setCategory(null);
            setTackledOnly(false);
          }}
        >
          all
        </button>
        <button
          type="button"
          className="filter-chip"
          data-active={tackledOnly}
          onClick={() => setTackledOnly((v) => !v)}
        >
          tackled
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className="filter-chip"
            data-active={category === c}
            onClick={() => setCategory((cur) => (cur === c ? null : c))}
          >
            {c.toLowerCase()}
          </button>
        ))}
      </div>

      <div className="result-count">
        {results.length} {results.length === 1 ? "problem" : "problems"}
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
  return (
    <Link href={problemHref(p)} className="problem-card">
      <div className="card-top">
        <span className="card-title">{p.title}</span>
        <span className="card-cat">{p.category}</span>
        <StageBadge stage={p.stage} />
      </div>
      <p className="card-statement">{p.statement}</p>
      {p.aka && p.aka.length > 0 && <div className="card-aka">a.k.a. {p.aka.join(" · ")}</div>}
    </Link>
  );
}

function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className="stage-badge" data-stage={stage}>
      {STAGE_LABEL[stage]}
    </span>
  );
}
