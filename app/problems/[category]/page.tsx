import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES } from "@/lib/problems";
import JsonLd from "@/components/JsonLd";
import ProblemCardLink from "@/components/ProblemCardLink";
import {
  breadcrumbLd,
  categoryFromSlug,
  categorySlug,
  itemListLd,
  problemsInCategory,
  SITE_NAME,
} from "@/lib/seo";

// Category hub — "open problems in <field>". One page per Category, generated
// from the registry. Targets the "open problems in graph theory" class of
// query and wires every dossier in the field into the hub-and-spoke graph.

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: categorySlug(c) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const c = categoryFromSlug(category);
  if (!c) return { title: SITE_NAME };
  const list = problemsInCategory(c);
  const description = `${list.length} open ${c} problems, each with a precise statement, honest status, and a computational attack plan — ${list
    .slice(0, 4)
    .map((p) => p.title)
    .join(", ")}, and more.`;
  return {
    title: `Open problems in ${c}`,
    description,
    alternates: { canonical: `/problems/${category}` },
    openGraph: {
      type: "website",
      title: `Open problems in ${c} · ${SITE_NAME}`,
      description,
      url: `/problems/${category}`,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const c = categoryFromSlug(category);
  if (!c) notFound();

  const list = problemsInCategory(c);
  const tackled = list.filter((p) => p.stage !== "untouched").length;
  const others = CATEGORIES.filter((x) => x !== c);

  return (
    <>
      <JsonLd data={itemListLd(`Open problems in ${c}`, list)} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Math Lab", path: "/" },
          { name: "Problems by field", path: "/problems" },
          { name: c, path: `/problems/${category}` },
        ])}
      />
      <div className="shell" style={{ gridTemplateColumns: "minmax(0, 1fr)", maxWidth: 940 }}>
        <main>
          <div className="crumbs">
            <Link href="/">← all problems</Link>
            <Link href="/problems">by field</Link>
          </div>
          <div className="hero">
            <div className="kicker">
              {c} · {list.length} problems{tackled > 0 ? ` · ${tackled} tackled` : ""}
            </div>
            <h1>Open problems in {c}</h1>
            <p className="lede">
              Every {c} problem in the {SITE_NAME} index — {list.length} in all. Each carries a
              precise statement, an honest status (open means open), and a concrete plan for
              throwing compute or tokens at it.
            </p>
          </div>

          <div className="problem-list">
            {list.map((p) => (
              <ProblemCardLink key={p.slug} p={p} />
            ))}
          </div>

          <section className="chapter" style={{ marginTop: 28 }}>
            <div className="chapter-head">
              <span className="num">→</span>
              <h2>Other fields</h2>
            </div>
            <ul className="ref-list">
              {others.map((x) => (
                <li key={x}>
                  <Link href={`/problems/${categorySlug(x)}`}>Open problems in {x}</Link>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </>
  );
}
