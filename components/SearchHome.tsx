"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Filter } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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

  const stagesFiltered = stages.size !== ALL_STAGES.length;
  const activeFilters = (category ? 1 : 0) + (stagesFiltered ? 1 : 0);

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

        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              aria-label="Filter"
              className={cn(
                "relative h-auto w-14 self-stretch rounded-[14px]",
                activeFilters > 0 && "border-primary text-primary",
              )}
            >
              <Filter className="size-[18px]" />
              {activeFilters > 0 && (
                <Badge className="absolute -top-2 -right-2 size-[18px] justify-center rounded-full p-0 text-[10px]">
                  {activeFilters}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-[300px]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Category
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    variant={!category ? "secondary" : "outline"}
                    size="sm"
                    className="h-7 rounded-full px-3 text-xs font-normal"
                    onClick={() => setCategory(null)}
                  >
                    all
                  </Button>
                  {CATEGORIES.map((c) => (
                    <Button
                      key={c}
                      variant={category === c ? "secondary" : "outline"}
                      size="sm"
                      className="h-7 rounded-full px-3 text-xs font-normal"
                      onClick={() => setCategory((cur) => (cur === c ? null : c))}
                    >
                      {c.toLowerCase()}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Stage
                </div>
                <div className="grid gap-2">
                  {ALL_STAGES.map((s) => (
                    <label key={s} className="flex cursor-pointer items-center gap-2.5 text-sm">
                      <Checkbox checked={stages.has(s)} onCheckedChange={() => toggleStage(s)} />
                      <span className="sb-dot" data-stage={s} aria-hidden />
                      {STAGE_LABEL[s]}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  disabled={activeFilters === 0}
                >
                  Reset
                </Button>
                <Button size="sm" onClick={() => setFiltersOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
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
