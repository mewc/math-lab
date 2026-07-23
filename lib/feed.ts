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

export type FeedKind = "solve" | "post" | "note" | "release" | "meme";

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
  /** Optional image (path under /public, e.g. a meme) — shown in the card + RSS. */
  image?: string;
  /** Alt text for `image`. */
  imageAlt?: string;
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

  // Memes — clearly tagged as memes (kind "meme"), not research claims. Being a
  // little funny is fine; keep it honest by labeling them and only linking to
  // real sources (the cat is from the trending X topic; the comics have no known
  // canonical source, so they carry no link).
  {
    id: "meme-open-x-every-6-hours",
    date: "2026-07-23",
    kind: "meme",
    title: "Meme: open X every 6 hours → AI disproves another conjecture",
    summary:
      "It's a meme, but it's the mood of the week: refresh the timeline, another conjecture falls. Fitting — the DGG cost conjecture just went down by counterexample.",
    source: "x",
    image: "/figures/ai-disproves-conjecture.png",
    imageAlt: "A cat captioned 'open X every 6 hours → AI disproves another conjecture', on a loop.",
    links: [{ label: "The trending topic on X", url: "https://x.com/i/trending/2080179717932458044" }],
  },
  {
    id: "meme-pls-continue-counterexample",
    date: "2026-07-23",
    kind: "meme",
    title: "Meme: 'pls continue' → 'Fine. Counterexample attached.'",
    summary:
      "A meme going around: badgering the model past 'I couldn't find a counterexample' until it finally attaches one. Any resemblance to real research is coincidental. Mostly.",
    image: "/figures/meme-disprove-conjecture.png",
    imageAlt:
      "Comic: 'Disprove the conjecture.' — 'I couldn't find a counterexample.' — 'pls continue' … 'Fine. Counterexample attached.' — 'oh my god.'",
  },
  {
    id: "meme-complete-unconditional-counterexample",
    date: "2026-07-23",
    kind: "meme",
    title: "Meme: 'complete unconditional counterexample' … 'oh my god.'",
    summary:
      "Another from the timeline: 'let's finish with a complete unconditional counterexample' → it finishes. A meme — but also basically the DGG solve log.",
    image: "/figures/meme-complete-counterexample.png",
    imageAlt:
      "Comic: 'let's finish with a complete unconditional counterexample' → 'finished with complete counterexample' → 'oh my god.'",
  },
  {
    id: "meme-dont-give-up-diamonds",
    date: "2026-07-23",
    kind: "meme",
    title: "Meme: don't turn back three feet from the diamonds",
    summary:
      "The classic 'never give up' cartoon — the miner who turned back was inches from the vein. A meme, and a decent reminder for iteration 4.",
    image: "/figures/meme-dont-give-up-diamonds.png",
    imageAlt: "Cartoon: two miners — the one who turned back gave up inches from a wall of diamonds.",
  },
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
      const x = (s.links ?? []).some((l) => /(^|\.)x\.com\//.test(l.url ?? ""));
      items.push({
        id: `solve-${p.slug}`,
        date: s.when ?? "",
        kind: "solve",
        title: `${p.title} — solved (${s.by})`,
        summary: s.approach,
        problemSlug: p.slug,
        source: chatgpt ? "chatgpt" : x ? "x" : "lab",
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

  // Memes are timeless and share the same add-date, so a plain date sort clumps
  // them all at the top. Weave them through the real timeline instead — one meme
  // after every couple of substantive items — so the serious news leads and the
  // funny stuff is sprinkled "in parts of" the feed rather than dumped up front.
  const woven = weaveMemes(merged);
  return typeof limit === "number" ? woven.slice(0, limit) : woven;
}

/** Interleave meme items through the non-meme timeline (order otherwise kept). */
function weaveMemes(items: FeedItem[]): FeedItem[] {
  const memes = items.filter((i) => i.kind === "meme");
  if (memes.length === 0) return items;
  const rest = items.filter((i) => i.kind !== "meme");
  if (rest.length === 0) return memes;

  const GAP = 2; // a meme after every 2 substantive items
  const out: FeedItem[] = [];
  let m = 0;
  for (let i = 0; i < rest.length; i++) {
    out.push(rest[i]);
    if (m < memes.length && (i + 1) % GAP === 0) out.push(memes[m++]);
  }
  while (m < memes.length) out.push(memes[m++]); // any leftover memes at the tail
  return out;
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
  meme: "Meme",
};

export const FEED_SOURCE_LABEL: Record<FeedSource, string> = {
  chatgpt: "ChatGPT",
  x: "X",
  lab: "Lab",
  github: "GitHub",
  web: "Web",
};
