import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import ProblemCardLink from "@/components/ProblemCardLink";
import {
  breadcrumbLd,
  hubTags,
  isHubTag,
  itemListLd,
  problemsWithTag,
  SITE_NAME,
  tagFromSlug,
} from "@/lib/seo";

// Tag hub — every problem carrying one tag, across all fields. Generated from
// the registry's tag set.

export function generateStaticParams() {
  return hubTags().map((t) => ({ tag: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const name = tagFromSlug(tag);
  if (!name) return { title: SITE_NAME };
  const list = problemsWithTag(name);
  const description = `${list.length} open math ${
    list.length === 1 ? "problem" : "problems"
  } tagged "${name}" in the Math Lab index — ${list
    .slice(0, 4)
    .map((p) => p.title)
    .join(", ")}${list.length > 4 ? ", and more" : ""}.`;
  return {
    title: `${name} — open problems`,
    description,
    alternates: { canonical: `/tags/${tag}` },
    openGraph: {
      type: "website",
      title: `Open problems tagged "${name}" · ${SITE_NAME}`,
      description,
      url: `/tags/${tag}`,
    },
  };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const name = tagFromSlug(tag);
  // Only cross-cutting tags (≥2 problems) get a hub page; singletons 404.
  if (!name || !isHubTag(name)) notFound();

  const list = problemsWithTag(name);
  // Fields this tag spans, for the intro line.
  const fields = [...new Set(list.map((p) => p.category))];

  return (
    <>
      <JsonLd data={itemListLd(`Open problems tagged "${name}"`, list)} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Math Lab", path: "/" },
          { name: "Tags", path: "/tags" },
          { name, path: `/tags/${tag}` },
        ])}
      />
      <div className="shell" style={{ gridTemplateColumns: "minmax(0, 1fr)", maxWidth: 940 }}>
        <main>
          <div className="crumbs">
            <Link href="/">← all problems</Link>
            <Link href="/tags">all tags</Link>
          </div>
          <div className="hero">
            <div className="kicker">
              Tag · {list.length} {list.length === 1 ? "problem" : "problems"} ·{" "}
              {fields.length} {fields.length === 1 ? "field" : "fields"}
            </div>
            <h1>
              Open problems tagged <span className="mono">{name}</span>
            </h1>
            <p className="lede">
              {list.length} {list.length === 1 ? "problem" : "problems"} in the {SITE_NAME} index
              touch <span className="mono">{name}</span>
              {fields.length > 1 ? `, spanning ${fields.join(", ")}` : ""}. Each carries a precise
              statement, an honest status, and a computational line of attack.
            </p>
          </div>

          <div className="problem-list">
            {list.map((p) => (
              <ProblemCardLink key={p.slug} p={p} />
            ))}
          </div>

          <div className="footer" style={{ marginTop: 28 }}>
            Browse <Link href="/tags">all tags</Link> or <Link href="/problems">by field</Link>.
          </div>
        </main>
      </div>
    </>
  );
}
