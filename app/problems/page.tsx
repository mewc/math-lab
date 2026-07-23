import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, PROBLEMS } from "@/lib/problems";
import JsonLd from "@/components/JsonLd";
import {
  breadcrumbLd,
  categorySlug,
  problemsInCategory,
  SITE_NAME,
} from "@/lib/seo";

// Hub-of-hubs: the field index. Every category is a real crawlable link, and
// this is where /problems/[category] pages hang off the site architecture.

export const metadata: Metadata = {
  title: "Open math problems by field",
  description:
    "Browse the Math Lab index by field — number theory, graph theory, combinatorics, geometry & packing, algebra, dynamics, and more. Every problem carries a precise statement, honest status, and a computational attack plan.",
  alternates: { canonical: "/problems" },
};

export default function ProblemsIndex() {
  const tackled = PROBLEMS.filter((p) => p.stage !== "untouched").length;

  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Math Lab", path: "/" }, { name: "Problems by field", path: "/problems" }])} />
      <div className="shell" style={{ gridTemplateColumns: "minmax(0, 1fr)", maxWidth: 940 }}>
        <main>
          <div className="crumbs">
            <Link href="/">← all problems</Link>
          </div>
          <div className="hero">
            <div className="kicker">Index · {PROBLEMS.length} problems · {tackled} tackled</div>
            <h1>Open math problems by field</h1>
            <p className="lede">
              {SITE_NAME} tracks {PROBLEMS.length} open, computationally approachable problems
              across {CATEGORIES.length} fields. Pick a field to see every problem in it — each
              with a precise statement, an honest status, and a concrete way to throw compute at
              it.
            </p>
          </div>

          <div className="cat-grid">
            {CATEGORIES.map((c) => {
              const list = problemsInCategory(c);
              const live = list.filter((p) => p.stage !== "untouched").length;
              return (
                <Link key={c} href={`/problems/${categorySlug(c)}`} className="cat-card">
                  <span className="cat-card-title">{c}</span>
                  <span className="cat-card-meta">
                    {list.length} {list.length === 1 ? "problem" : "problems"}
                    {live > 0 ? ` · ${live} tackled` : ""}
                  </span>
                  <span className="cat-card-sample">
                    {list.slice(0, 3).map((p) => p.title).join(" · ")}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="footer" style={{ marginTop: 28 }}>
            Also browse{" "}
            <Link href="/tags">by tag</Link> — techniques and objects that cut across fields
            (SAT, counterexamples, sphere packing, exhaustive search…).
          </div>
        </main>
      </div>
    </>
  );
}
