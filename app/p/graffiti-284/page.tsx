import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import JsonLd from "@/components/JsonLd";
import { getProblem } from "@/lib/problems";
import { breadcrumbLd, categorySlug, problemLd, SITE_NAME } from "@/lib/seo";

const problem = getProblem("graffiti-284")!;

export const metadata: Metadata = {
  title: "Graffiti conjecture 284",
  description: problem.statement,
  keywords: [problem.title, ...(problem.aka ?? []), ...problem.tags],
  alternates: { canonical: "/p/graffiti-284" },
  openGraph: {
    type: "article",
    title: `${problem.title} · ${SITE_NAME}`,
    description: problem.statement,
    url: "/p/graffiti-284",
  },
  twitter: { card: "summary_large_image", title: problem.title, description: problem.statement },
};

function Equation({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="mathbox" aria-label={label}>
      <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
        {children}
      </math>
    </div>
  );
}

export default function Graffiti284Page() {
  const breadcrumb = breadcrumbLd([
    { name: "Math Lab", path: "/" },
    { name: problem.category, path: `/problems/${categorySlug(problem.category)}` },
    { name: problem.title, path: "/p/graffiti-284" },
  ]);

  return (
    <>
      <JsonLd data={problemLd(problem)} />
      <JsonLd data={breadcrumb} />
      <div className="shell" style={{ gridTemplateColumns: "minmax(0, 1fr)", maxWidth: 940 }}>
        <main>
          <div className="crumbs">
            <Link href="/">← all problems</Link>
            <Link href={`/problems/${categorySlug(problem.category)}`}>{problem.category}</Link>
            <span className="status-chip" data-stage="solved">Disproved</span>
          </div>

          <div className="hero">
            <div className="kicker">Counterexample dossier · spectral graph theory</div>
            <h1>Graffiti conjecture 284</h1>
            <p className="lede">
              A familiar 50-vertex graph makes the claimed dual-degree bound fail by three.
            </p>
          </div>

          <section className="chapter">
            <div className="chapter-head">
              <span className="num">§1</span>
              <h2>The conjecture</h2>
            </div>
            <p>
              Write <i>d</i>(v) for the degree of v, and define its dual degree <i>d</i><sup>*</sup>(v)
              as the average of the degrees of its neighbors. For a connected graph with girth at
              least 5, Graffiti 284 asserted the following inequality, where λ<sub>min</sub>(D) is
              the least eigenvalue of the graph&apos;s distance matrix.
            </p>
            <Equation label="The conjectured inequality: minimum dual degree is at most negative lambda minimum of D G">
              <mrow>
                <munder><mi>min</mi><mrow><mi>v</mi><mo>∈</mo><mi>V</mi><mo>(</mo><mi>G</mi><mo>)</mo></mrow></munder>
                <msup><mi>d</mi><mo>*</mo></msup><mo>(</mo><mi>v</mi><mo>)</mo><mo>≤</mo><mo>−</mo>
                <msub><mi>λ</mi><mi>min</mi></msub><mo>(</mo><mi>D</mi><mo>(</mo><mi>G</mi><mo>)</mo><mo>)</mo>
              </mrow>
            </Equation>
            <p>
              The report that prompted this entry identifies the Hoffman–Singleton graph as a
              counterexample. The calculation below independently verifies the implication; the
              original Graffiti-record attribution remains flagged for bibliographic audit.
            </p>
          </section>

          <section className="chapter">
            <div className="chapter-head">
              <span className="num">§2</span>
              <h2>The witness</h2>
            </div>
            <p>
              The Hoffman–Singleton graph H is the standard strongly regular graph with parameters
              (50, 7, 0, 1). In particular, it has 50 vertices, is 7-regular, has diameter 2, and
              has girth 5. Regularity immediately gives the left side: every neighbor of every
              vertex has degree 7.
            </p>
            <Equation label="Every dual degree of the Hoffman Singleton graph equals seven">
              <mrow>
                <msup><mi>d</mi><mo>*</mo></msup><mo>(</mo><mi>v</mi><mo>)</mo><mo>=</mo>
                <mfrac><mn>1</mn><mn>7</mn></mfrac><munderover><mo>∑</mo><mrow><mi>u</mi><mo>∼</mo><mi>v</mi></mrow><mrow /></munderover>
                <mi>d</mi><mo>(</mo><mi>u</mi><mo>)</mo><mo>=</mo><mn>7</mn>
              </mrow>
            </Equation>
          </section>

          <section className="chapter">
            <div className="chapter-head">
              <span className="num">§3</span>
              <h2>Distance spectrum — exact reduction</h2>
            </div>
            <p>
              Let A be H&apos;s adjacency matrix, I the identity, and J the all-ones matrix. Because
              H has diameter 2, distinct vertices are at distance 1 precisely on edges and at
              distance 2 otherwise. Therefore its distance matrix is:
            </p>
            <Equation label="Distance matrix D equals two times J minus I, minus adjacency matrix A">
              <mrow><mi>D</mi><mo>=</mo><mn>2</mn><mo>(</mo><mi>J</mi><mo>−</mo><mi>I</mi><mo>)</mo><mo>−</mo><mi>A</mi></mrow>
            </Equation>
            <p>
              The adjacency spectrum of H is 7<sup>1</sup>, 2<sup>28</sup>, (−3)<sup>21</sup>.
              On the all-ones line, D has eigenvalue 2(50−1)−7=91. On the orthogonal complement,
              J vanishes, so an A-eigenvalue θ becomes −2−θ for D. Hence:
            </p>
            <Equation label="Distance spectrum: 91 once, 1 twenty-one times, and negative 4 twenty-eight times">
              <mrow><mi>Spec</mi><mo>(</mo><mi>D</mi><mo>)</mo><mo>=</mo><msup><mn>91</mn><mn>1</mn></msup><mo>,</mo><msup><mn>1</mn><mn>21</mn></msup><mo>,</mo><msup><mrow><mo>(</mo><mo>−</mo><mn>4</mn><mo>)</mo></mrow><mn>28</mn></msup></mrow>
            </Equation>
          </section>

          <section className="chapter">
            <div className="chapter-head">
              <span className="num">§4</span>
              <h2>Contradiction</h2>
            </div>
            <p>
              Thus λ<sub>min</sub>(D)=−4 and the conjectured right side is 4, while the left side
              is 7. H has the required girth, so it is a valid witness — no numerical eigensolver
              or graph search is involved.
            </p>
            <Equation label="The false inequality 7 less than or equal to 4">
              <mrow><mn>7</mn><mo>=</mo><munder><mi>min</mi><mi>v</mi></munder><msup><mi>d</mi><mo>*</mo></msup><mo>(</mo><mi>v</mi><mo>)</mo><mo>≤</mo><mo>−</mo><msub><mi>λ</mi><mi>min</mi></msub><mo>(</mo><mi>D</mi><mo>)</mo><mo>=</mo><mn>4</mn></mrow>
            </Equation>
            <p className="footer">
              Verdict: false. The substance of the counterexample is independently checked here;
              see the references for the standard graph data and the original social report.
            </p>
          </section>

          <section className="chapter">
            <div className="chapter-head">
              <span className="num">§5</span>
              <h2>References</h2>
            </div>
            <ul className="ref-list">
              {(problem.refs ?? []).map((ref) => (
                <li key={ref.label}>
                  {ref.url ? <a href={ref.url} target="_blank" rel="noreferrer noopener">{ref.label}</a> : ref.label}
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </>
  );
}
