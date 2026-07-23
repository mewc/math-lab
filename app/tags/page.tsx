import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { breadcrumbLd, hubTags, SITE_NAME } from "@/lib/seo";

// Tag index — the cross-field cut. Techniques and objects (SAT, counterexample,
// sphere packing, exhaustive search) that recur across otherwise unrelated
// problems. Each tag links to a hub page; sized by problem count.

export const metadata: Metadata = {
  title: "Open math problems by technique & object",
  description:
    "Browse the Math Lab index by tag — the techniques and objects that cut across fields: SAT, counterexamples, sphere packing, exhaustive search, polynomials, matrices, and dozens more.",
  alternates: { canonical: "/tags" },
};

export default function TagsIndex() {
  // Only cross-cutting tags (≥2 problems) — the ones that earn a hub page.
  const tags = hubTags();
  const max = tags[0]?.count ?? 1;

  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Math Lab", path: "/" }, { name: "Tags", path: "/tags" }])} />
      <div className="shell" style={{ gridTemplateColumns: "minmax(0, 1fr)", maxWidth: 940 }}>
        <main>
          <div className="crumbs">
            <Link href="/">← all problems</Link>
            <Link href="/problems">by field</Link>
          </div>
          <div className="hero">
            <div className="kicker">Index · {tags.length} tags</div>
            <h1>Browse by technique &amp; object</h1>
            <p className="lede">
              The cross-field cut through the {SITE_NAME} index: {tags.length} tags for the
              techniques and objects that recur across otherwise unrelated problems. Larger tags
              touch more problems.
            </p>
          </div>

          <div className="tag-cloud">
            {tags.map((t) => (
              <Link
                key={t.slug}
                href={`/tags/${t.slug}`}
                className="tag-pill"
                style={{ fontSize: `${13 + Math.round((t.count / max) * 7)}px` }}
              >
                {t.tag}
                <span className="tag-count">{t.count}</span>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
