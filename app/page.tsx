import Link from "next/link";
import SearchHome from "@/components/SearchHome";
import NewsFeed from "@/components/NewsFeed";
import HomeMemeLoop from "@/components/HomeMemeLoop";
import { CATEGORIES } from "@/lib/problems";
import { categorySlug, hubTags } from "@/lib/seo";

export default function Page() {
  // Top cross-cutting tags — a crawlable cross-section beside the fields.
  const topTags = hubTags().slice(0, 16);

  return (
    <div className="home-shell">
      <SearchHome feed={<NewsFeed limit={6} />} banner={<HomeMemeLoop />} />

      {/* Server-rendered internal-link layer. The search filters above are
          client-only; these real <a>s give crawlers (and AI answer engines) a
          path into every field and the busiest tags. */}
      <nav className="browse-nav" aria-label="Browse the index">
        <div className="browse-block">
          <div className="browse-label">Browse by field</div>
          <ul className="browse-links">
            {CATEGORIES.map((c) => (
              <li key={c}>
                <Link href={`/problems/${categorySlug(c)}`}>Open problems in {c}</Link>
              </li>
            ))}
            <li>
              <Link href="/problems">
                <strong>All fields →</strong>
              </Link>
            </li>
          </ul>
        </div>
        <div className="browse-block">
          <div className="browse-label">Browse by tag</div>
          <ul className="browse-tags">
            {topTags.map((t) => (
              <li key={t.slug}>
                <Link href={`/tags/${t.slug}`}>{t.tag}</Link>
              </li>
            ))}
            <li>
              <Link href="/tags">
                <strong>All tags →</strong>
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  );
}
