// SEO plumbing shared across the programmatic pages: canonical site URL, the
// category ⇄ slug mapping that backs /problems/[category], the tag index that
// backs /tags/[tag], "related problems" derivation, and JSON-LD builders.
//
// Everything here is derived from the registry (lib/problems.ts) — no hand-kept
// duplicate lists to drift. Add a problem, tag, or category there and the hub
// pages, sitemap, and structured data follow automatically.

import { CATEGORIES, PROBLEMS, problemHref, type Category, type Problem } from "@/lib/problems";

/** Canonical production origin. Drives metadataBase, canonicals, sitemap, OG. */
export const SITE_URL = "https://mathlab.drummerduck.com";
export const SITE_NAME = "Math Lab";

/** Lowercase, hyphenated, url-safe slug (shared by categories and tags). */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ------------------------------------------------------------------ categories

export function categorySlug(c: Category): string {
  return slugify(c);
}

const CATEGORY_BY_SLUG: Map<string, Category> = new Map(
  CATEGORIES.map((c) => [categorySlug(c), c]),
);

export function categoryFromSlug(slug: string): Category | undefined {
  return CATEGORY_BY_SLUG.get(slug);
}

export function problemsInCategory(c: Category): Problem[] {
  return PROBLEMS.filter((p) => p.category === c).sort(byInterest);
}

// ------------------------------------------------------------------------ tags

export interface TagEntry {
  tag: string;
  slug: string;
  count: number;
}

/** Every tag in the registry, with a problem count, most-used first. */
export function allTags(): TagEntry[] {
  const counts = new Map<string, number>();
  for (const p of PROBLEMS) {
    for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, slug: slugify(tag), count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

const TAG_BY_SLUG: Map<string, string> = new Map(allTags().map((t) => [t.slug, t.tag]));

export function tagFromSlug(slug: string): string | undefined {
  return TAG_BY_SLUG.get(slug);
}

export function problemsWithTag(tag: string): Problem[] {
  return PROBLEMS.filter((p) => p.tags.includes(tag)).sort(byInterest);
}

// ------------------------------------------------------------------- ordering

/** Tackled problems (solved/live/started) surface above untouched ones. */
const STAGE_RANK: Record<Problem["stage"], number> = {
  solved: 0,
  live: 1,
  started: 2,
  untouched: 3,
};

export function byInterest(a: Problem, b: Problem): number {
  return STAGE_RANK[a.stage] - STAGE_RANK[b.stage] || a.title.localeCompare(b.title);
}

// -------------------------------------------------------------- related pages

/**
 * Problems worth cross-linking from `p`'s dossier: same category first, then
 * filled out by shared-tag overlap. Purely derived — safe to render without
 * any hand-authored "see also" list, and it kills orphan/thin pages by wiring
 * every dossier into the hub-and-spoke graph.
 */
export function relatedProblems(p: Problem, limit = 6): Problem[] {
  const sameCat = PROBLEMS.filter((q) => q.slug !== p.slug && q.category === p.category);
  const seen = new Set([p.slug, ...sameCat.map((q) => q.slug)]);
  const byTag = PROBLEMS.filter((q) => !seen.has(q.slug))
    .map((q) => ({ q, shared: q.tags.filter((t) => p.tags.includes(t)).length }))
    .filter((r) => r.shared > 0)
    .sort((a, b) => b.shared - a.shared || byInterest(a.q, b.q))
    .map((r) => r.q);
  return [...sameCat.sort(byInterest), ...byTag].slice(0, limit);
}

// ------------------------------------------------------------ structured data

/** Absolute URL for a path or a problem's dossier. */
export function absUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path}`;
}

export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absUrl(c.path),
    })),
  };
}

/**
 * A problem dossier as a DefinedTerm (the honest shape: this is a curated,
 * defined entry in a glossary of open problems) plus, when solved, the
 * resolution surfaced as an Answer. AI answer engines cite DefinedTerm/Article
 * cleanly; the breadcrumb is emitted separately by the page.
 */
export function problemLd(p: Problem) {
  const url = absUrl(problemHref(p));
  const aka = p.aka ?? [];
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "@id": `${url}#term`,
    name: p.title,
    alternateName: aka.length ? aka : undefined,
    description: p.statement,
    url,
    termCode: p.slug,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: `${SITE_NAME} — open problems index`,
      url: SITE_URL,
    },
    isPartOf: {
      "@type": "CollectionPage",
      name: `Open problems in ${p.category}`,
      url: absUrl(`/problems/${categorySlug(p.category)}`),
    },
    keywords: p.tags.join(", "),
  };
  return node;
}

/** ItemList for a hub page (category or tag), in registry-derived order. */
export function itemListLd(name: string, problems: Problem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: problems.length,
    itemListElement: problems.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absUrl(problemHref(p)),
      name: p.title,
    })),
  };
}
