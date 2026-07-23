import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProblem, problemHref, PROBLEMS, STAGE_LABEL } from "@/lib/problems";
import JsonLd from "@/components/JsonLd";
import {
  breadcrumbLd,
  categorySlug,
  problemLd,
  relatedProblems,
  SITE_NAME,
} from "@/lib/seo";

// Generic dossier scaffold for every registry problem that doesn't yet have a
// hand-built page (Collatz has one at app/p/collatz/, which shadows this
// route). When a problem gets tackled: add notes to its registry entry, then
// graduate it to its own directory with real instruments.

export function generateStaticParams() {
  return PROBLEMS.filter((p) => !p.href).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getProblem(slug);
  if (!p) return { title: "Math Lab" };
  // Keyword-led title: searchers type the problem name, not the brand. aka's
  // widen the match ("3n+1 problem", "Syracuse problem") without stuffing.
  const title = p.aka && p.aka.length > 0 ? `${p.title} (${p.aka[0]})` : p.title;
  const canonical = `/p/${p.slug}`;
  return {
    title,
    description: p.statement,
    keywords: [p.title, ...(p.aka ?? []), p.category, ...p.tags],
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: `${p.title} · ${SITE_NAME}`,
      description: p.statement,
      url: canonical,
    },
    twitter: { card: "summary_large_image", title: p.title, description: p.statement },
  };
}

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProblem(slug);
  if (!p) notFound();

  const related = relatedProblems(p);
  const breadcrumb = breadcrumbLd([
    { name: "Math Lab", path: "/" },
    { name: p.category, path: `/problems/${categorySlug(p.category)}` },
    { name: p.title, path: `/p/${p.slug}` },
  ]);

  return (
    <>
      <JsonLd data={problemLd(p)} />
      <JsonLd data={breadcrumb} />
      <div className="shell" style={{ gridTemplateColumns: "minmax(0, 1fr)", maxWidth: 940 }}>
        <main>
          <div className="crumbs">
            <Link href="/">← all problems</Link>
            <Link href={`/problems/${categorySlug(p.category)}`}>{p.category}</Link>
            <span className="status-chip" data-stage={p.stage}>
              {STAGE_LABEL[p.stage]}
            </span>
          </div>
          <div className="hero">
            <div className="kicker">Problem dossier · {p.category}</div>
            <h1>{p.title}</h1>
            {p.aka && p.aka.length > 0 && (
              <p style={{ color: "var(--ink-faint)", fontSize: 14, marginTop: -6 }}>
                a.k.a. {p.aka.join(" · ")}
              </p>
            )}
            <p className="lede">{p.statement}</p>
          </div>

          <section className="chapter">
            <div className="chapter-head">
              <span className="num">§1</span>
              <h2>Status</h2>
            </div>
            <p>{p.status}</p>
            {p.stage !== "solved" && (
              <div className="solved-cta">
                Think you can crack this one?{" "}
                <Link href="/solved">Read the playbook before you announce →</Link>
              </div>
            )}
          </section>

          <section className="chapter">
            <div className="chapter-head">
              <span className="num">§2</span>
              <h2>The Angle of Attack</h2>
            </div>
            <p>{p.attack}</p>
            <p style={{ fontSize: 14, color: "var(--ink-faint)" }}>
              Tags: <span className="mono">{p.tags.join(" · ")}</span>
            </p>
          </section>

          <section className="chapter">
            <div className="chapter-head">
              <span className="num">§3</span>
              <h2>The Lab</h2>
            </div>
            {p.stage === "untouched" ? (
              <div className="scaffold-empty">
                No instruments built yet. When this problem gets tackled, its interactive
                instruments — explorers, searches, verifiers running in the browser — live here.
                See the <Link href="/p/collatz">Collatz dossier</Link> for what a fully tackled
                problem looks like.
              </div>
            ) : (
              <p>Instruments under construction.</p>
            )}
          </section>

          <section className="chapter">
            <div className="chapter-head">
              <span className="num">§4</span>
              <h2>The Log</h2>
            </div>
            {p.notes && p.notes.length > 0 ? (
              p.notes.map((note, i) => (
                <div className="note-entry" key={i}>
                  <div className="note-date">{note.date}</div>
                  <p>{note.body}</p>
                </div>
              ))
            ) : (
              <div className="scaffold-empty">
                Empty. Work on this problem gets logged here as dated entries — constructions
                tried, code run, dead ends included. Dead ends are results.
              </div>
            )}
            <div className="footer">
              Ground rules (inherited from Collatz Lab): no fabricated steps, honest statuses,
              corrections kept on the record. &ldquo;Open&rdquo; means open.
            </div>
          </section>

          {p.refs && p.refs.length > 0 && (
            <section className="chapter">
              <div className="chapter-head">
                <span className="num">§5</span>
                <h2>References</h2>
              </div>
              <ul className="ref-list">
                {p.refs.map((ref, i) => (
                  <li key={i}>
                    {ref.url ? (
                      <a href={ref.url} target="_blank" rel="noreferrer noopener">
                        {ref.label}
                      </a>
                    ) : (
                      ref.label
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {related.length > 0 && (
            <section className="chapter">
              <div className="chapter-head">
                <span className="num">§{p.refs && p.refs.length > 0 ? 6 : 5}</span>
                <h2>Related Problems</h2>
              </div>
              <p style={{ fontSize: 14, color: "var(--ink-faint)" }}>
                More open problems in{" "}
                <Link href={`/problems/${categorySlug(p.category)}`}>{p.category}</Link> and
                adjacent territory.
              </p>
              <ul className="ref-list">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={problemHref(r)}>{r.title}</Link>
                    <span style={{ color: "var(--ink-faint)" }}> — {r.category}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
