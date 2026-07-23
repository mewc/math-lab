import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProblem, PROBLEMS, STAGE_LABEL } from "@/lib/problems";
import ThemeToggle from "@/components/ThemeToggle";

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
  return {
    title: `Math Lab — ${p.title}`,
    description: p.statement,
  };
}

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProblem(slug);
  if (!p) notFound();

  return (
    <>
      <header className="topbar">
        <span className="wordmark">
          <Link href="/" style={{ color: "inherit" }}>
            <b>Math</b> Lab
          </Link>
        </span>
        <span style={{ color: "var(--ink-faint)", fontSize: 13 }}>{p.category}</span>
        <span className="status-chip">{STAGE_LABEL[p.stage]}</span>
        <ThemeToggle />
      </header>

      <div className="shell" style={{ gridTemplateColumns: "minmax(0, 1fr)", maxWidth: 940 }}>
        <main>
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
        </main>
      </div>
    </>
  );
}
