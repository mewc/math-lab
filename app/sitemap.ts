import type { MetadataRoute } from "next";
import { CATEGORIES, PROBLEMS, problemHref } from "@/lib/problems";
import { SITE_URL, absUrl, categorySlug, hubTags } from "@/lib/seo";

// Every indexable URL, derived from the registry. Regenerates automatically as
// problems, categories, and tags are added — nothing to hand-maintain.

export default function sitemap(): MetadataRoute.Sitemap {
  // Latest note date across the registry stands in for "site last touched".
  const latestNote = PROBLEMS.flatMap((p) => p.notes ?? [])
    .map((n) => n.date)
    .sort()
    .at(-1);
  const siteModified = latestNote ? new Date(latestNote) : undefined;

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: siteModified, changeFrequency: "weekly", priority: 1 },
    { url: absUrl("/problems"), changeFrequency: "weekly", priority: 0.8 },
    { url: absUrl("/tags"), changeFrequency: "weekly", priority: 0.5 },
    // Evergreen playbook — strong search/GEO target, rank it high.
    { url: absUrl("/solved"), changeFrequency: "monthly", priority: 0.8 },
  ];

  const problemPages: MetadataRoute.Sitemap = PROBLEMS.map((p) => {
    const lastNote = (p.notes ?? []).map((n) => n.date).sort().at(-1);
    return {
      url: absUrl(problemHref(p)),
      lastModified: lastNote ? new Date(lastNote) : undefined,
      changeFrequency: p.stage === "untouched" ? "monthly" : "weekly",
      // Tackled dossiers carry the real content — rank them above scaffolds.
      priority: p.stage === "untouched" ? 0.6 : 0.9,
    };
  });

  // Hand-built dossier sub-pages that aren't 1:1 with a registry entry (only
  // Collatz has one today). Listed explicitly so crawlers can reach them.
  const subPages: MetadataRoute.Sitemap = [
    {
      url: absUrl("/p/collatz/attack-log"),
      lastModified: siteModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: absUrl(`/problems/${categorySlug(c)}`),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const tagPages: MetadataRoute.Sitemap = hubTags().map((t) => ({
    url: absUrl(`/tags/${t.slug}`),
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  return [...staticPages, ...problemPages, ...subPages, ...categoryPages, ...tagPages];
}
