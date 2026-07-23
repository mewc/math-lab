// The Math Lab news feed — "the latest" across the lab. Two sources merge here:
//
//   1. DERIVED items, computed from the problem registry (lib/problems.ts): every
//      solved problem's resolution and every dated problem note becomes a feed
//      entry automatically. This is the important half — when an AI campaign (or
//      anyone) tackles a problem and records a note or a solve in problems.ts,
//      it shows up in the feed and the RSS without any extra step.
//
//   2. CURATED items, hand-listed below: things that aren't tied to a single
//      problem note — external write-ups (e.g. a ChatGPT deep-reasoning solve),
//      X / Twitter posts, releases, announcements. Add real items here with real
//      links; keep it honest (same accuracy rule as the registry).
//
// Both feed the homepage NewsFeed and /feed.xml. When you update a problem or
// ship something worth surfacing, CONSIDER whether it belongs in the feed:
// a problem note/solve lands automatically; anything else gets a CURATED entry.

import { PROBLEMS, problemHref, type ProblemRef } from "@/lib/problems";

export type FeedKind = "solve" | "post" | "note" | "release";

/** Where an item came from — drives the little source glyph/label in the UI. */
export type FeedSource = "chatgpt" | "x" | "lab" | "github" | "web";

export interface FeedItem {
  /** Stable id, used as the RSS guid and React key. */
  id: string;
  /** ISO date (YYYY-MM-DD) or a looser label like "Jul 2026"; sorted best-effort. */
  date: string;
  kind: FeedKind;
  title: string;
  /** One-to-three sentence summary — plain text, no markup. */
  summary: string;
  /** Slug of the related problem, if any (links into its dossier). */
  problemSlug?: string;
  source?: FeedSource;
  /** External / in-lab links (write-ups, posts, verifiers). */
  links?: ProblemRef[];
}

// --------------------------------------------------------------------------
// CURATED items — add real, sourced entries here. X posts, external write-ups,
// releases. Seeded with the deep-reasoning DGG solve highlight (the same event
// the registry records, called out here as a standalone "latest" headline).
// Keep this list honest: only real links.
// --------------------------------------------------------------------------

export const CURATED_FEED: FeedItem[] = [
  {
    id: "curated-dgg-chatgpt-solve",
    date: "2026-07-23",
    kind: "solve",
    title: "ChatGPT disproves the Goemans / DGG cost conjecture by counterexample",
    summary:
      "A four-iteration deep-reasoning campaign built a finite, exact-integer-checkable instance (7 vertices, three demands) where every congestion-good unsplittable routing costs ≥ 60 while the fractional flow costs only 58 — breaking the cost strengthening of the Dinitz–Garg–Goemans theorem. Reproduced in-lab by an exhaustive verifier; pending external audit.",
    problemSlug: "goemans-unsplittable-flow",
    source: "chatgpt",
    links: [
      {
        label: "Solution write-up & search log (ChatGPT share)",
        url: "https://chatgpt.com/share/6a60b2eb-0b64-83ee-9c76-7931ca1de063",
      },
      { label: "In-lab verifier — research/dgg-counterexample.ts" },
    ],
  },
  // Add X / Twitter posts and other external updates here, e.g.:
  // {
  //   id: "x-<handle>-<short>",
  //   date: "2026-07-24",
  //   kind: "post",
  //   title: "…",
  //   summary: "…",
  //   problemSlug: "collatz",
  //   source: "x",
  //   links: [{ label: "View on X", url: "https://x.com/…/status/…" }],
  // },
];

// --------------------------------------------------------------------------
// Feed assembly
// --------------------------------------------------------------------------

/** Best-effort sort key: parse an ISO date, else pull a year/month from a label. */
function dateSortKey(d: string): number {
  const iso = Date.parse(d);
  if (!Number.isNaN(iso)) return iso;
  // Fallbacks like "Jul 2026" or "2026": parse against a fixed reference so the
  // ordering is deterministic (no Date.now dependence).
  const parsed = Date.parse(`${d} 1`);
  if (!Number.isNaN(parsed)) return parsed;
  const year = /\b(19|20)\d\d\b/.exec(d);
  return year ? Date.parse(`${year[0]}-01-01`) : 0;
}

/** Derive feed items from the registry: one per solve, one per dated note. */
function derivedItems(): FeedItem[] {
  const items: FeedItem[] = [];

  for (const p of PROBLEMS) {
    // A solved problem's resolution → a "solve" headline.
    if (p.stage === "solved" && p.solution) {
      const s = p.solution;
      const chatgpt = /chatgpt|gpt|openai/i.test(s.by) ||
        (s.links ?? []).some((l) => (l.url ?? "").includes("chatgpt.com"));
      items.push({
        id: `solve-${p.slug}`,
        date: s.when ?? "",
        kind: "solve",
        title: `${p.title} — solved (${s.by})`,
        summary: s.approach,
        problemSlug: p.slug,
        source: chatgpt ? "chatgpt" : "lab",
        links: s.links,
      });
    }

    // Each dated note → a "note" entry (the running attack log, surfaced).
    for (let i = 0; i < (p.notes?.length ?? 0); i++) {
      const n = p.notes![i];
      items.push({
        id: `note-${p.slug}-${i}`,
        date: n.date,
        kind: "note",
        title: `${p.title} — progress note`,
        summary: n.body,
        problemSlug: p.slug,
        source: "lab",
      });
    }
  }

  return items;
}

/**
 * The merged, date-descending feed. Curated items win id collisions (they are
 * layered first). Pass a limit to cap the list (homepage shows a slice; RSS can
 * take more).
 */
export function buildFeed(limit?: number): FeedItem[] {
  const seen = new Set<string>();
  const merged: FeedItem[] = [];
  for (const item of [...CURATED_FEED, ...derivedItems()]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  merged.sort((a, b) => dateSortKey(b.date) - dateSortKey(a.date));
  return typeof limit === "number" ? merged.slice(0, limit) : merged;
}

/** Link target for a feed item: its problem dossier, else the first external URL. */
export function feedItemHref(item: FeedItem): string | null {
  if (item.problemSlug) {
    const p = PROBLEMS.find((x) => x.slug === item.problemSlug);
    if (p) return problemHref(p);
  }
  const url = (item.links ?? []).find((l) => l.url)?.url;
  return url ?? null;
}

export const FEED_KIND_LABEL: Record<FeedKind, string> = {
  solve: "Solved",
  post: "Post",
  note: "Progress",
  release: "Release",
};

export const FEED_SOURCE_LABEL: Record<FeedSource, string> = {
  chatgpt: "ChatGPT",
  x: "X",
  lab: "Lab",
  github: "GitHub",
  web: "Web",
};
