import type { Metadata } from "next";
import Link from "next/link";
import { Note } from "@/components/Note";
import JsonLd from "@/components/JsonLd";
import { getProblem } from "@/lib/problems";
import { breadcrumbLd, categorySlug, problemLd } from "@/lib/seo";

const DESCRIPTION =
  "An annotated dossier on Gallai's path decomposition conjecture: every connected graph on n vertices into ⌈n/2⌉ paths. Certificate-backed verification through 11 vertices, the exact tight census, a reduction toolkit with proofs, and a new boundary lower bound that explains every previously unexplained tight graph.";

export const metadata: Metadata = {
  title: "Gallai's path decomposition conjecture — the tightness dossier",
  description: DESCRIPTION,
  keywords: [
    "Gallai's conjecture",
    "path decomposition",
    "path number",
    "Lovász path cycle theorem",
    "odd semi-clique",
    "Bonamy–Perrett",
    "graph decomposition",
  ],
  alternates: { canonical: "/p/gallai-paths" },
  openGraph: {
    type: "article",
    title: "Gallai's path decomposition conjecture — the tightness dossier",
    description: DESCRIPTION,
    url: "/p/gallai-paths",
  },
};

const SECTIONS = [
  ["problem", "The Problem"],
  ["status", "What Is Known"],
  ["ledger", "The Verified Ledger"],
  ["toolkit", "The Reduction Toolkit"],
  ["tight", "Which Graphs Are Tight"],
  ["boundary", "A New Lower Bound"],
  ["parity", "The Parity Axis"],
  ["corrections", "Corrections On The Record"],
  ["reading", "The Reading List"],
] as const;

function Chapter({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="chapter" id={id}>
      <div className="chapter-head">
        <span className="num">§{n}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

/** A stated result with its proof, kept visually distinct from prose. */
function Result({
  tag,
  name,
  status,
  children,
}: {
  tag: string;
  name: string;
  status: "proved" | "verified" | "conjecture" | "classical";
  children: React.ReactNode;
}) {
  const label =
    status === "proved"
      ? "proved here, all n"
      : status === "verified"
        ? "machine-verified on a finite range"
        : status === "classical"
          ? "classical"
          : "conjecture — not proved";
  return (
    <div className="panel" style={{ marginBottom: 18 }}>
      <div className="panel-title">
        <span className="mono">{tag}</span> · {name}
        <span className="stage-badge" style={{ marginLeft: 8 }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

export default function Page() {
  const p = getProblem("gallai-paths")!;
  return (
    <>
      <JsonLd data={problemLd(p)} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Math Lab", path: "/" },
          { name: p.category, path: `/problems/${categorySlug(p.category)}` },
          { name: p.title, path: "/p/gallai-paths" },
        ])}
      />
      <div className="shell">
        <nav className="toc" aria-label="Contents">
          <div className="crumbs">
            <Link href="/">← all problems</Link>
            <span className="status-chip">open · since 1966</span>
          </div>
          <div className="toc-title">Contents</div>
          {SECTIONS.map(([id, title], i) => (
            <a key={id} href={`#${id}`}>
              <span className="toc-num">§{i + 1}</span>
              {title}
            </a>
          ))}
        </nav>

        <main>
          <div className="hero">
            <div className="kicker">An annotated research dossier · est. 1966</div>
            <h1>
              Cut every graph into <em>half as many paths as vertices</em> — Gallai&apos;s
              conjecture
            </h1>
            <p className="lede">
              Take any connected graph on n vertices. Gallai conjectured that its edges can always
              be split into at most <strong>⌈n/2⌉</strong> paths, each edge used exactly once. Sixty
              years on it is proved for a growing list of classes and verified by computer for small
              graphs, and open in general. This dossier is the machine-checked part: what we
              verified, the reductions we proved, the exact census of the graphs that need every
              path the bound allows, and one new lower bound that turned out to explain all of them.
            </p>
            <div className="honesty-box">
              <b>Intellectual honesty clause.</b> This page does not settle the conjecture, and
              nothing here is claimed as new mathematics unless it says so. Two earlier claims in
              this campaign were <strong>demoted after a literature check</strong> and are kept on
              the record in <a href="#corrections">§8</a> rather than quietly deleted: our
              verification at 11 vertices reproduces a published 2019 result, and the structural
              pattern we found at odd order is a known open question of Bonamy and Perrett. Every
              upper bound quoted below carries a decomposition that was re-verified edge by edge,
              and every &ldquo;impossible&rdquo; carries an exhaustive search that ran to
              completion — never one that merely gave up.
            </div>
          </div>

          <Chapter id="problem" n={1} title="The Problem">
            <p>
              A <strong>path decomposition</strong> of a graph G is a set of paths whose edge sets
              partition E(G): every edge lies on exactly one path, and no path repeats a vertex
              <Note n={1}>
                The vertex-disjointness inside each part is the whole difficulty. Drop it and you
                get <em>trails</em>, and Euler settles the question immediately: a connected graph
                with q odd-degree vertices decomposes into exactly max(q/2, 1) trails, and q ≤ n, so
                the Gallai bound is free for trails. Everything hard about this conjecture lives in
                the gap between trails and paths.
              </Note>
              . The <strong>path number</strong> p(G) is the smallest size of such a decomposition.
            </p>
            <div className="mathbox">
              p(G) ≤ ⌈n/2⌉ for every connected graph G on n vertices
              <span className="caption">
                Gallai&apos;s conjecture (1966, reported by Lovász). We write B(n) = ⌈n/2⌉
                throughout, and call G <strong>tight</strong> when p(G) = B(n).
              </span>
            </div>
            <p>
              The bound cannot be improved. If every vertex of G has odd degree then every vertex
              must be an endpoint of some path — a path meets each of its interior vertices in two
              edges — so with n endpoints available and two per path, at least n/2 paths are needed.
              Every graph with all degrees odd is therefore tight, and there are many
              <Note n={2}>
                Three classical lower bounds follow the same counting logic and are used everywhere
                in this dossier: p(G) ≥ ⌈q/2⌉ where q counts odd-degree vertices; p(G) ≥
                max<sub>v</sub> ⌈deg(v)/2⌉, since a single path uses at most two edges at any
                vertex; and p(G) ≥ ⌈m/(n−1)⌉, since a path on n vertices holds at most n−1 edges.
                None of the three can ever exceed ⌈n/2⌉ — so no counting argument of this kind will
                ever disprove the conjecture.
              </Note>
              .
            </p>
            <p>
              Computing p(G) is NP-hard, for a reason worth keeping in mind: p(G) = 1 exactly when G
              has a Hamiltonian path. So no polynomial-time formula can equal the path number unless
              P = NP — a constraint that shapes <a href="#boundary">§6</a>.
            </p>
          </Chapter>

          <Chapter id="status" n={2} title="What Is Known">
            <p>
              The conjecture is proved for many classes, and the proofs almost all attack the same
              object: the subgraph induced by the <strong>even-degree</strong> vertices, written
              G<sub>E</sub>. That is where the difficulty concentrates, because odd-degree vertices
              are forced to be path endpoints and therefore pay for themselves.
            </p>
            <ul>
              <li>
                <strong>Lovász (1968)</strong> — every graph on n vertices decomposes into at most
                ⌊n/2⌋ <em>paths and cycles</em>. This is the foundation everything else stands on,
                and it settles the conjecture outright when all degrees are odd
                <Note n={3}>
                  If every degree is odd, no cycle can appear in such a decomposition: each odd
                  vertex must end a path, so counting endpoints gives 2·#paths ≥ n, hence #paths ≥
                  n/2; but #paths + #cycles ≤ ⌊n/2⌋ = n/2, forcing #cycles = 0. The same count also
                  shows every vertex ends <em>exactly one</em> path — a rigidity we exploit in{" "}
                  <a href="#parity">§7</a>.
                </Note>
                .
              </li>
              <li>
                <strong>Pyber</strong> — holds when G<sub>E</sub> is a forest. <strong>Fan</strong>{" "}
                — holds when each block of G<sub>E</sub> is triangle-free with maximum degree at
                most three.
              </li>
              <li>
                <strong>Bonamy–Perrett (2019)</strong> — holds for maximum degree at most 5.{" "}
                <strong>Botler–Jiménez–Sambinelli–Wakabayashi</strong> — treewidth at most 3 (and
                later work at treewidth 4). <strong>Blanché–Bonamy–Bonichon</strong> — planar
                graphs. Also known for 2-degenerate graphs, block graphs, and Cartesian products.
              </li>
              <li>
                <strong>Verified by computer for all graphs on at most 11 vertices</strong> —
                Botler, Cunha and Sambinelli (2019), via an integer-programming model for the path
                number, together with bipartite graphs to 16 vertices and regular graphs to 14.
              </li>
              <li>
                <strong>The sharpened open question (Bonamy–Perrett).</strong> Can every connected
                graph be decomposed into at most ⌊n/2⌋ paths <em>unless</em> G is an{" "}
                <strong>odd semi-clique</strong> — a clique on 2k+1 vertices minus at most k−1
                edges? At odd n, ⌊n/2⌋ = B(n) − 1, so this asks precisely which graphs are tight.
                Known for treewidth ≤ 3 and for planar graphs, where K₃ and K₅ minus an edge are the
                only exceptions.
              </li>
            </ul>
          </Chapter>

          <Chapter id="ledger" n={3} title="The Verified Ledger">
            <p>
              Everything in this section is a finite computation with certificates. Unlabeled graphs
              come from nauty&apos;s <span className="mono">geng</span>; each claimed decomposition
              is re-checked edge by edge; each claimed impossibility is an exhaustive search that
              terminated, and searches that hit their node budget are reported as{" "}
              <em>undecided</em> rather than counted on either side.
            </p>
            <div className="statgrid">
              <div className="stat">
                <b>≤ 11</b>
                <span>vertices verified, every connected graph</span>
              </div>
              <div className="stat">
                <b>577,076,528</b>
                <span>graphs checked directly at n = 11 (δ ≥ 3)</span>
              </div>
              <div className="stat">
                <b>42.7%</b>
                <span>of n = 11 removed by a proved reduction</span>
              </div>
              <div className="stat">
                <b>0</b>
                <span>counterexamples, and 0 undecided</span>
              </div>
            </div>
            <p>
              At n = 11 the population is A001349(11) = 1,006,700,565 connected graphs. Because 11
              is <em>odd</em>, every graph with a vertex of degree at most 2 follows unconditionally
              from the verified 10-vertex case — see <a href="#toolkit">§4</a> — which leaves only
              the graphs of minimum degree 3. Those were checked in 15.5 minutes across 14 shards,
              with coverage asserted against an independent <span className="mono">geng -u</span>{" "}
              count so that no shard could silently drop work. The greedy engine sufficed for every
              single graph: zero escalations to the exhaustive solver, so nothing rests on a search
              that ran out of budget.
            </p>
            <p>
              To guard against a coding error hiding inside the 42.7% that the reduction skips, the
              prescribed certificate was built and verified for 100,049 sampled degree-≤2 graphs at
              n = 11, deliberately spread across edge counts 10 through 47
              <Note n={4}>
                The first version of that sample took the head of geng&apos;s output, which is
                sparse graphs only — a real sampling bias, corrected. The densest band yields few
                instances (49 within a 4-million-graph scan cap; m = 47 is the largest edge count
                compatible with a degree-2 vertex on 11 vertices), and that cap is reported rather
                than papered over.
              </Note>
              .
            </p>
          </Chapter>

          <Chapter id="toolkit" n={4} title="The Reduction Toolkit">
            <p>
              These are the levers the campaign proved for itself. Two of them are unconditional
              reductions; the rest confine where the difficulty can hide. All are elementary, and
              all are very likely folklore — no priority is claimed.
            </p>

            <Result tag="F" name="the degree-2 splice" status="proved">
              <p>
                Let G be connected with a vertex v of degree 2 whose neighbours u, w are{" "}
                <strong>non-adjacent</strong>, and set H = (G − v) + uw. Then H is a simple
                connected graph on n−1 vertices and <strong>p(G) ≤ p(H)</strong>.
              </p>
              <p>
                <em>Proof.</em> H is simple because uw ∉ E(G), and connected because any G-path
                through v enters and leaves by u–v–w, which the new edge short-circuits. Take any
                path decomposition of H. The edge uw lies on exactly one path P = A–u–w–B; replace P
                by A–u–v–w–B. Since v ∉ V(H) this is again a path, and the edges it covers are those
                of P with uw traded for uv and vw. The result covers E(H) ∖ {"{uw}"} ∪ {"{uv, vw}"} =
                E(G), each edge once, with <strong>the same number of paths</strong>. ∎
              </p>
              <p>
                Being size-preserving is what makes it useful at even n, where B(n−1) = B(n) leaves
                no room to spend a path. It is also the one reduction here that stands alone, with
                no leftover hypothesis — and it is what made the 11-vertex sweep affordable.
              </p>
              <p>
                <strong>Honest scope.</strong> If u and w <em>are</em> adjacent — v sits in a
                triangle — the substitution uncovers uw and the argument fails. For odd n the two
                edges at v already form the path u–v–w, so p(G) ≤ p(G−v) + 1 = B(n) suffices. For
                even n it suffices that some decomposition of G−v of size ≤ B(n) has u and w as ends
                of two <em>distinct</em> paths; distinctness matters, since appending v to both ends
                of a single u…w path closes a cycle. That held in all 7,328 instances arising at
                n ≤ 9, decided by exhaustive search.
              </p>
            </Result>

            <Result tag="A + B + G" name="where the endpoint property can fail" status="proved">
              <p>
                Write E(G, v) for: <em>G has a decomposition of size ≤ B(n) in which v is an end of
                some path.</em> Three one-line arguments confine its failures.
              </p>
              <p>
                <strong>A (splitting).</strong> If p(G) ≤ B(n) − 1 then E(G, v) holds for every v of
                positive degree: take such a decomposition; if no path ends at v, then v is interior
                to some path, and cutting that path at v yields two paths — one more part, still
                within B(n), and v now an end.
              </p>
              <p>
                <strong>B (parity).</strong> In <em>every</em> decomposition, the number of paths
                ending at v is congruent to deg(v) mod 2 — each path uses two edges at v when v is
                interior and one when v is an end. So odd-degree vertices are ends for free.
              </p>
              <p>
                <strong>G (orbit).</strong> E transfers along automorphisms, so every
                vertex-transitive graph satisfies it at every vertex — in particular every complete
                graph.
              </p>
              <p>
                Together: <strong>E(G, v) can fail only if G is tight and deg(v) is even.</strong>{" "}
                Hence it holds for every graph with all degrees odd and for every tree
                <Note n={5}>
                  A tree has p(T) = q/2 exactly, so tightness would force q/2 = ⌈n/2⌉, i.e. q = n —
                  all degrees odd — and then parity applies. Verified computationally too: exact
                  p(T) = q/2 in both directions on all 200 trees to 10 vertices.
                </Note>
                . E was verified exhaustively for every connected graph and every vertex at n ≤ 9 —
                2,719,830 certificates, zero failures.
              </p>
            </Result>

            <Result tag="D" name="the leaf reduction" status="proved">
              <p>
                G connected with a leaf x at a, H = G − x. If p(H) ≤ B(n−1) and E(H, a) holds then
                p(G) ≤ B(n): either H has slack and the edge ax becomes its own path, or H is tight
                and E(H, a) hands us a path ending at a to extend. Both parities, no search.
              </p>
              <p>
                <strong>But it is an equivalence, not a shortcut.</strong> For tight H of odd order,
                E(H, a) holds exactly when p(H + a pendant at a) ≤ B(m+1) — so &ldquo;E on order
                n−1&rdquo; and &ldquo;Gallai for leafy graphs of order n&rdquo; are the same
                statement. Theorem D reorganises and localises the problem; it does not reduce it to
                anything easier, and we said so once we noticed.
              </p>
            </Result>

            <Result tag="prunes" name="two exact search prunes" status="proved">
              <p>
                Deciding <em>impossibility</em> is what costs, so two exact prunes carry the
                censuses in <a href="#tight">§5</a>.
              </p>
              <p>
                <strong>Capacity.</strong> With r paths left to cover `rem` residual edges and no
                path able to hold more than n−1 edges, <em>every</em> path of any completing
                decomposition carries at least rem − (r−1)(n−1) edges, because the others absorb at
                most (r−1)(n−1) between them. Shorter candidates cannot appear in any solution.
              </p>
              <p>
                <strong>End-count.</strong> When rem &gt; (r−1)(n−1), all r remaining paths must be
                used, so they supply exactly 2r path-ends. A vertex of residual degree d hosts f of
                them with 2·(interior visits) + f = d and (d+f)/2 ≤ r, so f ≤ min(d, 2r−d). If those
                caps cannot sum to 2r, or one vertex is forced above its own cap, the branch is
                dead.
              </p>
              <p>
                The effect is not marginal: thirteen graphs at 10 vertices had each survived{" "}
                <strong>400,000,000 search nodes</strong> without a verdict, and the end-count prune
                refuted all thirteen <strong>at the root, in zero nodes</strong>. That is the
                difference between an exact census and one with an asterisk.
              </p>
            </Result>
          </Chapter>

          <Chapter id="tight" n={5} title="Which Graphs Are Tight">
            <p>
              A graph is tight when it needs every path the bound allows. Tightness splits in two:{" "}
              <strong>lower-bound-forced</strong>, where one of the three classical bounds already
              reaches B(n), and <strong>structure-forced</strong>, where all three are strictly
              below B(n) and the graph is tight anyway. The second kind is the interesting kind, and
              it had never been counted at 10 vertices — deciding it means refuting a 4-path
              decomposition for each of 11.7 million graphs.
            </p>
            <table className="steps">
              <thead>
                <tr>
                  <th>n</th>
                  <th className="val">connected</th>
                  <th className="val">tight</th>
                  <th className="val">lower-bound-forced</th>
                  <th className="val">structure-forced</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>6</td>
                  <td className="val">112</td>
                  <td className="val">47</td>
                  <td className="val">44</td>
                  <td className="val">3</td>
                </tr>
                <tr>
                  <td>8</td>
                  <td className="val">11,117</td>
                  <td className="val">1,284</td>
                  <td className="val">1,233</td>
                  <td className="val">51</td>
                </tr>
                <tr>
                  <td>10</td>
                  <td className="val">11,716,571</td>
                  <td className="val">307,266</td>
                  <td className="val">305,585</td>
                  <td className="val">1,681</td>
                </tr>
              </tbody>
            </table>
            <p>
              The 10-vertex row is exact and complete: 11,409,305 graphs certified into ≤ 4 paths
              plus 307,266 tight sums to A001349(10) = 11,716,571 with nothing undecided. Two
              independent pipelines reach 1,681 by different routes, and the 305,585 reproduces an
              earlier streaming count from a different engine.
            </p>
            <p>
              At <strong>odd</strong> order the picture is completely different — tight graphs are
              rare, and they are exactly the dense ones:
            </p>
            <table className="steps">
              <thead>
                <tr>
                  <th>n (odd)</th>
                  <th className="val">connected</th>
                  <th className="val">tight</th>
                  <th>tight graphs are…</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>3</td>
                  <td className="val">2</td>
                  <td className="val">1</td>
                  <td>K₃</td>
                </tr>
                <tr>
                  <td>5</td>
                  <td className="val">21</td>
                  <td className="val">2</td>
                  <td>K₅, K₅ − e</td>
                </tr>
                <tr>
                  <td>7</td>
                  <td className="val">853</td>
                  <td className="val">4</td>
                  <td>K₇ minus ≤ 2 edges</td>
                </tr>
                <tr>
                  <td>9</td>
                  <td className="val">261,080</td>
                  <td className="val">9</td>
                  <td>K₉ minus ≤ 3 edges</td>
                </tr>
                <tr>
                  <td>11</td>
                  <td className="val">1,006,700,565</td>
                  <td className="val">20</td>
                  <td>K₁₁ minus ≤ 4 edges</td>
                </tr>
              </tbody>
            </table>
            <p>
              Those are exactly the <strong>odd semi-cliques</strong>, so this table is the
              Bonamy–Perrett question confirmed on a range — exhaustively for n ≤ 9, and at n = 11
              for every graph with at least 45 edges, which is the hard region
              <Note n={6}>
                At m = 50 on 11 vertices, five paths hold at most 5·10 = 50 edges, so a 5-path
                decomposition must be five Hamiltonian paths exactly, with zero slack. The general
                exhaustive solver could not decide one such graph after 60 million nodes; Walecki
                settles the whole band instead. K₁₁ is five Hamiltonian cycles, so if the missing
                edges land in distinct cycles, deleting them cuts each cycle once and the graph{" "}
                <em>is</em> a set of Hamiltonian paths. All 26 graphs at m = 50 were certified that
                way in 0.025 seconds — the stubborn one needed 66 random relabellings.
              </Note>
              . Sparser bands at n = 11 are not claimed.
            </p>
          </Chapter>

          <Chapter id="boundary" n={6} title="A New Lower Bound">
            <p>
              Here is the one piece of this dossier we think is genuinely new, and it came from
              asking a simple question: are the structure-forced tight graphs really unexplained, or
              merely unexplained by <em>global</em> bounds? All three classical bounds count over the
              whole graph. So we looked for local ones.
            </p>
            <p>
              Fix a decomposition into k paths and a vertex set S. Each path P meets S in some number
              c<sub>P</sub> of subpaths, covering |V(P) ∩ S| − c<sub>P</sub> edges inside S. Summing
              gives e(S) ≤ k·|S| − Σc<sub>P</sub>, and three bounds fall out — density (a path is a
              forest, so this is Nash-Williams arboricity), local parity, and both at once. All three
              are valid, and sharper than the classical maximum on some graphs. They explained{" "}
              <strong>43 of the 1,681</strong> structure-forced graphs at 10 vertices. Counting was
              not the answer.
            </p>
            <p>
              What the counting bounds miss is visible in the two smallest unexplained graphs. One is
              a <strong>triangle joined by an edge to a vertex carrying two leaves</strong>; the other
              is <strong>two triangles joined by a bridge</strong>. A triangle needs two paths on its
              own, and only a limited number of paths can <em>enter</em> it across a small boundary.
              That is not a density statement — it is about a cut.
            </p>
            <Result tag="L5" name="the boundary bound" status="proved">
              <div className="mathbox">
                2·p(G) ≥ max(2·p(G[S]) − b, odd<sub>S</sub>) + max(2·p(G[V∖S]) − b, odd
                <sub>V∖S</sub>)
                <span className="caption">
                  for every S ⊆ V, where b is the number of edges between S and V∖S, and odd
                  <sub>X</sub> counts the vertices of X having odd degree in G.
                </span>
              </div>
              <p>
                <em>Proof.</em> Fix a decomposition into k paths. The subpaths lying inside S form a
                path decomposition of G[S], so there are at least p(G[S]) of them, contributing at
                least 2·p(G[S]) subpath-ends. Each such end is either a genuine end of one of the k
                paths, lying in S, or a point where a path steps out of S along one of the b boundary
                edges — and each boundary edge, being used by exactly one path, provides at most one
                exit. Writing E<sub>S</sub> for the number of path-ends inside S, this gives
                2·p(G[S]) ≤ E<sub>S</sub> + b. Independently, parity forces E<sub>S</sub> ≥ odd
                <sub>S</sub>, since every odd-degree vertex ends at least one path. The identical
                argument applies to V∖S with the same b, and the 2k ends of the decomposition split
                between the two sides: 2k = E<sub>S</sub> + E<sub>V∖S</sub>. ∎
              </p>
              <p>
                Taking S = ∅ recovers the classical odd-vertex bound, so this is a genuine
                generalisation rather than an unrelated inequality. It is also the only bound here
                that sees a cut, and unlike the others it is <strong>recursive</strong> — it calls
                the path number of induced subgraphs.
              </p>
            </Result>
            <p>
              <strong>The result: it explains all of them.</strong>
            </p>
            <table className="steps">
              <thead>
                <tr>
                  <th>n</th>
                  <th className="val">structure-forced tight</th>
                  <th className="val">explained by counting (L1–L3)</th>
                  <th className="val">explained by the boundary bound</th>
                  <th className="val">left unexplained</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>6</td>
                  <td className="val">3</td>
                  <td className="val">1</td>
                  <td className="val">3</td>
                  <td className="val">0</td>
                </tr>
                <tr>
                  <td>8</td>
                  <td className="val">51</td>
                  <td className="val">8</td>
                  <td className="val">51</td>
                  <td className="val">0</td>
                </tr>
                <tr>
                  <td>10</td>
                  <td className="val">1,681</td>
                  <td className="val">43</td>
                  <td className="val">1,681</td>
                  <td className="val">0</td>
                </tr>
              </tbody>
            </table>
            <p>
              So &ldquo;structure-forced&rdquo; was never a property of the graphs — it was a gap in
              the toolkit. With the boundary bound added, <strong>every tight graph on at most 10
              vertices has its tightness certified by a lower bound</strong>, with nothing left over.
            </p>
            <p>
              That invites a much stronger question, and the answer on the range we can check is
              striking: <strong>p(G) equals the best of these bounds for every one of the 273,192
              connected graphs on at most 9 vertices</strong> — 12,112 up to 8 vertices and all
              261,080 at 9 vertices, with no gaps at all
              <Note n={7}>
                The bounds are proved ≤ p(G), so equality only needs the other direction: exhibit a
                decomposition whose size equals the bound. That is one feasibility check per graph
                rather than an escalation, which is what makes a whole order affordable.
              </Note>
              . If that identity held in general it would <em>imply</em> Gallai by induction: for any
              cut with b ≥ 1, using p(G[S]) ≤ ⌈|S|/2⌉ and p(G[V∖S]) ≤ ⌈|V∖S|/2⌉ on the smaller sides
              gives 2p(G[S]) + 2p(G[V∖S]) − 2b ≤ (|S|+1) + (|V∖S|+1) − 2b ≤ n. So the identity is at
              least as strong as the conjecture — which is also why it will not be easy.
            </p>
            <p>
              One consistency check worth stating: since p(G) = 1 exactly when G has a Hamiltonian
              path, no <em>polynomial-time</em> family of bounds can equal p(G) unless P = NP. The
              boundary bound escapes that only because it is recursive. The recursion is essential,
              not an artifact.
            </p>
          </Chapter>

          <Chapter id="parity" n={7} title="The Parity Axis">
            <p>
              Every reduction in <a href="#toolkit">§4</a> inducts on the number of vertices, and
              they all hit the same wall. So we tried inducting on <strong>degree parity</strong>
              instead, standing on Lovász&apos;s theorem.
            </p>
            <p>
              All-odd graphs are completely rigid: p = n/2 exactly, and in every optimal
              decomposition each vertex ends exactly one path, so the path-ends form a perfect
              pairing of the vertex set. Any graph can be pushed into that class by{" "}
              <strong>toggling parity</strong> — pair up the even-degree vertices and flip each pair,
              deleting the edge if present and adding it if absent. Converting back to G costs
              nothing when an added edge is an <em>end-edge</em> of its path (deleting it merely
              shortens the path) or a deleted edge can be <em>re-attached</em> at a path end.
            </p>
            <Result tag="FT" name="the Free Toggle conjecture" status="conjecture">
              <p>
                For every graph on even n and <strong>every</strong> perfect matching on its
                even-degree vertices, the toggled all-odd graph has an optimal decomposition in which
                every toggle is free.
              </p>
              <p>
                Gallai needs only <em>one</em> good pairing; the data says every pairing is good. All
                76,632 pairings across all 11,235 connected graphs on even n ≤ 8 worked, each with a
                decomposition of G rebuilt from the all-odd case and verified edge by edge; the first
                pairing tried sufficed for 10,893 of the 11,117 graphs at n = 8. A sampled sweep at
                n = 10 and thirteen adversarial all-even-degree families to n = 12 (K<sub>n</sub>
                minus a perfect matching, complete bipartite and tripartite, cycles and their
                squares) produced <strong>zero decided failures</strong>.
              </p>
              <p>
                Like Theorem D this is a reformulation, not a shortcut. Its value is a rigid base
                class and a sharper falsification target: one decided (G, pairing) failure kills it.
                The natural first target is a single toggle, which is the classical cycle-absorption
                obstruction in miniature.
              </p>
            </Result>
            <p>
              A negative result on the record: the natural two-endpoint strengthening that would make
              a self-contained induction work is <strong>false</strong> — it fails for 25 of 758
              instances at n ≤ 6, and 6 of those failures involve only vertices of degree ≥ 3, so it
              is not an artifact of the degree-2 vertices the splice removes.
            </p>
          </Chapter>

          <Chapter id="corrections" n={8} title="Corrections On The Record">
            <p>
              This campaign carried the caveat &ldquo;the literature cannot be checked from this
              environment&rdquo; for several turns. That was simply wrong, and checking it demoted
              two of our own headline claims. Both are kept here rather than deleted.
            </p>
            <div className="honesty-box">
              <p>
                <b>1. Verification at 11 vertices is not a frontier extension.</b> Botler, Cunha and
                Sambinelli published it in 2019 using an integer-programming model. We had called it
                &ldquo;the frontier&rdquo; and hedged with &ldquo;no priority claimed&rdquo;; the
                accurate statement is that it was already done, and our sweep is an{" "}
                <strong>independent replication by a different method</strong>. That is still worth
                something — an ILP verification asks you to trust a solver, while ours emits a
                checkable certificate for every one of 577 million graphs — but it is not new.
              </p>
              <p>
                <b>2. Our &ldquo;new structural finding&rdquo; is a named open problem.</b> Tight
                graphs at odd order being K<sub>n</sub> minus at most (n−3)/2 edges is exactly the
                Bonamy–Perrett question about odd semi-cliques. Our celebrated
                &ldquo;prediction&rdquo; of 20 tight graphs at 11 vertices was, unknowingly, counting
                the odd semi-cliques on 11 vertices — it landed exactly because it is a definition,
                not a forecast. What stands is independent computational evidence for a live
                question.
              </p>
              <p>
                <b>3. Everything else is treated as folklore.</b> The splitting, parity and orbit
                lemmas, the endpoint property, the degree-2 splice and the parity toggling are all
                elementary. We could not find the boundary bound of <a href="#boundary">§6</a> or the
                Free Toggle statement in print, but four web searches are weak evidence of novelty
                for a sixty-year-old problem — so they are offered, not claimed.
              </p>
            </div>
            <p>
              The standing instruction that came out of this, now at the top of our research log:{" "}
              <strong>check the literature first.</strong> One turn was spent naming and localising a
              property that already had a name, a literature, and known partial results.
            </p>
          </Chapter>

          <Chapter id="reading" n={9} title="The Reading List">
            <ul className="reading">
              <li>
                <strong>L. Lovász, On covering of graphs (1968)</strong> — the paths-and-cycles
                theorem that everything here stands on.
              </li>
              <li>
                <a
                  href="https://www.sciencedirect.com/science/article/pii/S1571066119300672"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  F. Botler, M. Cunha, M. Sambinelli — On Computing the Path Number of a Graph
                </a>{" "}
                (ENTCS 346, 2019) — the ILP model, and the verification of all graphs on ≤ 11
                vertices that our sweep replicates.
              </li>
              <li>
                <a href="https://arxiv.org/abs/1609.06257" target="_blank" rel="noopener noreferrer">
                  M. Bonamy, T. Perrett — Gallai&apos;s path decomposition conjecture for graphs of
                  small maximum degree
                </a>{" "}
                — Δ ≤ 5, and the source of the odd semi-clique question.
              </li>
              <li>
                <a href="https://arxiv.org/abs/1911.04546" target="_blank" rel="noopener noreferrer">
                  F. Botler et al. — Towards Gallai&apos;s path decomposition conjecture
                </a>{" "}
                — structure of the even-degree subgraph, the modern line of attack.
              </li>
              <li>
                <a
                  href="https://www.sciencedirect.com/science/article/abs/pii/S0012365X25003334"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Gallai&apos;s conjecture and the path number of odd semi-cliques
                </a>{" "}
                (Discrete Mathematics, 2025) — work directly on the class our odd-order tables
                enumerate.
              </li>
              <li>
                <a href="https://arxiv.org/pdf/2110.08870" target="_blank" rel="noopener noreferrer">
                  Blanché, Bonamy, Bonichon — Gallai&apos;s path decomposition in planar graphs
                </a>{" "}
                — the planar case, where K₃ and K₅ − e are the only odd semi-cliques.
              </li>
              <li>
                <a href="https://arxiv.org/pdf/2211.07159" target="_blank" rel="noopener noreferrer">
                  Gallai&apos;s path decomposition for 2-degenerate graphs
                </a>{" "}
                — another class, and a clear write-up of the standard toolkit.
              </li>
              <li>
                <strong>In this repository:</strong> <span className="mono">research/RESEARCH.md</span>{" "}
                holds the full campaign log including dead ends and corrections;{" "}
                <span className="mono">research/gallai-*.ts</span> are the verifiers, each exiting
                non-zero if any certificate fails.
              </li>
            </ul>
          </Chapter>
        </main>
      </div>
    </>
  );
}
