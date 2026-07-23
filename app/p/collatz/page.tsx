import type { Metadata } from "next";
import Link from "next/link";
import HailstoneExplorer from "@/components/HailstoneExplorer";
import StoppingTimeScatter from "@/components/StoppingTimeScatter";
import VariantLab from "@/components/VariantLab";
import { Note } from "@/components/Note";

// The Collatz dossier — imported from apps/collatz-lab (which remains its own
// standalone island; this is a copy, not a dependency). The flagship "live"
// problem of the Math Lab index.

export const metadata: Metadata = {
  title: "Math Lab — Collatz: the 3n + 1 dossier",
  description:
    "An annotated research dossier on the Collatz conjecture: interactive trajectories, the statistical landscape, every major partial result, and exactly what a settlement would require.",
};

const SECTIONS = [
  ["problem", "The Problem"],
  ["status", "Current Status"],
  ["anatomy", "Anatomy of a Trajectory"],
  ["landscape", "The Statistical Landscape"],
  ["proven", "What Is Actually Proven"],
  ["failure", "The Two Ways It Could Fail"],
  ["routes", "Reformulations & Attack Routes"],
  ["resists", "Why It Resists Proof"],
  ["settle", "What a Settlement Must Contain"],
  ["reading", "The Reading List"],
  ["campaign", "The Campaign (Live)"],
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

export default function Page() {
  return (
    <>
      <div className="shell">
        <nav className="toc" aria-label="Contents">
          <div className="crumbs">
            <Link href="/">← all problems</Link>
            <Link href="/p/collatz/attack-log">the attack log →</Link>
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
            <div className="kicker">An annotated research dossier · est. 1937</div>
            <h1>
              Everything required to <em>settle</em> the Collatz conjecture
            </h1>
            <p className="lede">
              Take any positive integer. If it is even, halve it; if it is odd, triple it and add
              one. Repeat. The conjecture — that <strong>every</strong> starting number eventually
              reaches 1 — is arithmetic a child can run and a problem no mathematician has closed.
              This dossier assembles the full state of the art: live instruments for exploring the
              map, every major partial result with annotations, the exact failure modes a proof must
              exclude, and the checklist any settlement has to satisfy.
            </p>
            <div className="honesty-box">
              <b>Intellectual honesty clause.</b> No web page settles this problem, and neither does
              this one — anyone claiming otherwise is selling something. The conjecture is open. What
              <i> can</i> be assembled is the complete map of the battlefield: what is proven, what
              is checked, what is heuristic, and precisely where every known line of attack dies.
              That is what this page is.
            </div>
          </div>

          <Chapter id="problem" n={1} title="The Problem">
            <p>
              Define the Collatz map on the positive integers:
              <Note n={1}>
                Named for <b>Lothar Collatz</b>, who circulated it around 1937. It travels under
                many aliases — the 3n+1 problem, the Syracuse problem, Kakutani&apos;s problem,
                Ulam&apos;s conjecture, the hailstone problem — a sociological fingerprint of how
                many communities it has infected independently.
              </Note>
            </p>
            <div className="mathbox">
              C(n) =
              <span className="cases">
                <span>n / 2</span>
                <span className="cond">if n ≡ 0 (mod 2)</span>
                <span>3n + 1</span>
                <span className="cond">if n ≡ 1 (mod 2)</span>
              </span>
              <span className="caption">
                The orbit of n is the sequence n, C(n), C(C(n)), … — its &ldquo;hailstone
                trajectory.&rdquo;
              </span>
            </div>
            <p>
              <strong>Conjecture (Collatz).</strong> For every integer n ≥ 1, the orbit of n
              eventually reaches 1<Note n={2}>
                After which it is trapped forever in the trivial cycle 1 → 4 → 2 → 1. An equivalent
                phrasing: 1 → 4 → 2 is the <b>only</b> cycle among positive integers, and no orbit
                escapes to infinity. Those are exactly the two ways the conjecture could fail — §6
                is devoted to them.
              </Note>
              . Analysts usually work with the <strong>accelerated (Syracuse) map</strong> T(n) =
              (3n+1)/2 for odd n, which folds in the guaranteed halving after every odd step
              <Note n={3}>
                3n+1 is always even when n is odd, so nothing is lost. Fully accelerated form: the
                Syracuse function takes odd n to (3n+1)/2<sup className="inline-sup">v</sup> where
                2<sup className="inline-sup">v</sup> exactly divides 3n+1 — odd numbers straight to
                odd numbers. Most modern results (Terras, Tao) are stated for these accelerated
                maps; convergence for any one of them is equivalent to convergence for C.
              </Note>
              .
            </p>
            <p>
              The formal statement is a <strong>Π⁰₂ sentence</strong> of arithmetic — &ldquo;for
              all n there exists a k with C<sup className="inline-sup">k</sup>(n) = 1&rdquo; — and
              that logical shape matters
              <Note n={4}>
                A Π⁰₂ statement can fail two ways: a cycle would be <i>witnessable</i> by a finite
                computation (find the cycle, check it), but a divergent orbit would not — no finite
                amount of computing certifies &ldquo;this orbit never comes back.&rdquo; This
                asymmetry is why brute force can in principle disprove-by-cycle but can never
                disprove-by-divergence, and can never prove the conjecture at all.
              </Note>
              . Paul Erdős put a $500 bounty on it and delivered the field&apos;s most quoted
              verdict: <em>&ldquo;Mathematics may not be ready for such problems.&rdquo;</em>
              <Note n={5}>
                The bounty market has since inflated: in 2021 the Japanese firm Bakuage posted a
                prize of <b>120 million yen</b> (roughly a million US dollars) for a proof or
                disproof. Unclaimed. Jeffrey Lagarias — the problem&apos;s chief archivist — calls
                it &ldquo;completely out of reach of present day mathematics.&rdquo;
              </Note>
            </p>
          </Chapter>

          <Chapter id="status" n={2} title="Current Status">
            <ul>
              <li>
                <strong>Open.</strong> Neither proved nor disproved, for 89 years and counting.
              </li>
              <li>
                <strong>Verified by computation</strong> for every starting value up to roughly{" "}
                <span className="mono">2⁷¹ ≈ 2.4 × 10²¹</span>
                <Note n={6}>
                  David Barina&apos;s distributed search holds the frontier; his peer-reviewed
                  record (<i>Journal of Supercomputing</i>, 2020) is 2⁶⁸, with the ongoing project
                  reported around 2⁷¹. The engine room: precomputed lookup tables that process
                  numbers in 2- and 3-adic blocks, sieves that skip residue classes which provably
                  fall below themselves, and the observation that you only need to check each n
                  drops <i>below its starting value</i> — the rest follows by induction.
                </Note>
                . Every one of those ~10²¹ orbits fell to 1.
              </li>
              <li>
                <strong>Computation settles nothing here.</strong> The conjecture quantifies over
                all integers; 10²¹ is measure zero of them. Worse, the problem is famous for
                late-arriving structure — orbits like 27&apos;s wander to 9,232 before collapsing,
                and there is no known bound f such that checking up to f(n) certifies n
                <Note n={7}>
                  Contrast with problems where finite checking <i>can</i> close the book (e.g. a
                  Π⁰₁ statement like Goldbach-up-to-N or the Four Color reduction to finitely many
                  configurations). Collatz has no known reduction to a finite computation — that
                  itself would be a monumental theorem.
                </Note>
                .
              </li>
              <li>
                <strong>The strongest theorem</strong> (Tao, 2019) says orbits go &ldquo;almost
                bounded&rdquo; for &ldquo;almost all&rdquo; n — a spectacular result that is still,
                by its own architecture, unable to reach <em>all</em> n (§5, §8).
              </li>
            </ul>
          </Chapter>

          <Chapter id="anatomy" n={3} title="Anatomy of a Trajectory">
            <p>
              Vocabulary, then the instrument. For a starting value n:{" "}
              <strong>total stopping time</strong> σ∞(n) is the number of steps to reach 1;{" "}
              <strong>stopping time</strong> σ(n) is the number of steps until the orbit first dips{" "}
              <em>below n</em>
              <Note n={8}>
                The distinction is load-bearing. If <b>every</b> n ≥ 2 has finite stopping time —
                merely dips below itself, ever — the full conjecture follows by strong induction:
                n falls below n, lands on some m &lt; n already known to reach 1. Essentially every
                serious partial result (Terras, Korec, Tao) attacks stopping time, not total
                stopping time, for exactly this reason.
              </Note>
              ; the <strong>peak</strong> is the orbit&apos;s maximum excursion. The chart is
              log-scale — odd steps (red) kick the value up, even steps (green) grind it down.
            </p>
            <HailstoneExplorer />
            <p>
              Things worth trying above: <strong>27</strong>, the canonical wild ride (111 steps,
              peak 9,232 — a 342× overshoot of its start)
              <Note n={9}>
                27 is why small-number intuition fails here. Its neighbors 26 and 28 finish in 10
                and 18 steps; 27 takes 111. The map&apos;s sensitivity to the seed&apos;s 2-adic
                fine structure — not its size — is the first thing every would-be prover
                underestimates.
              </Note>
              ; <strong>837,799</strong>, holder of the longest flight below one million (524
              steps); and <strong>2⁶⁸ + 1</strong>, a value just past the peer-reviewed verification
              frontier — your browser verifies it in exact arithmetic in milliseconds, which is
              simultaneously impressive and, per §2, mathematically worthless.
            </p>
          </Chapter>

          <Chapter id="landscape" n={4} title="The Statistical Landscape">
            <p>
              Why do essentially all mathematicians believe the conjecture? Because in aggregate the
              map is a <strong>biased random walk pointed downhill</strong>. Follow an odd number
              through 3n+1 and the subsequent run of halvings: the trailing zeros of 3n+1 behave
              like fair coin flips, so the expected number of halvings per tripling is 2, giving an
              expected factor of <span className="mono">3/4 &lt; 1</span> per odd step
              <Note n={10}>
                Equivalently: one step of the accelerated map T multiplies n by 3/2 (odd case) or
                1/2 (even case), each &ldquo;half the time,&rdquo; for a geometric mean of{" "}
                <b>√3/2 ≈ 0.866</b>. Take logs and you have a random walk with drift −½ log(4/3)
                per step. Negative drift ⇒ the walk hits any floor with probability 1 ⇒
                &ldquo;probability 1&rdquo; convergence. Every word of that argument is heuristic:
                Collatz orbits are deterministic, and nothing licenses treating their parity bits
                as independent coins forever (§8).
              </Note>
              . The same heuristic predicts the average flight length: σ∞(n) ≈ 2 ln n / ln(4/3) ≈
              6.95 ln n — the dashed curve below, threading a cloud it has no right to fit this
              well.
            </p>
            <StoppingTimeScatter />
            <p>
              Annotations on the cloud: the horizontal banding comes from orbit-merging — huge
              families of n share tail trajectories, so their flight counts differ by small offsets
              <Note n={11}>
                E.g. any n and 2n differ by exactly one step; n ≡ 4 (mod 6) is reachable from
                (n−1)/3 one step earlier. The predecessor tree of 1 branches so prolifically that
                Applegate–Lagarias proved its population up to x is at least x^0.84 — see
                Krasikov–Lagarias in §5.
              </Note>
              . The gold record-holders drifting upward roughly logarithmically are exactly what the
              random-walk model predicts for maxima of ~n independent-ish flights. The heuristic
              explains <em>everything visible in this chart</em> and proves none of it — the gap
              between those two clauses is the conjecture.
            </p>
          </Chapter>

          <Chapter id="proven" n={5} title="What Is Actually Proven">
            <p>
              The honor roll, annotated. Note the shape of every entry: <em>almost all</em>,{" "}
              <em>at least</em>, <em>no cycle shorter than</em> — quantifier concessions that mark
              exactly where each technique ran out of road.
            </p>
            <div className="timeline">
              <div className="tl-item">
                <div className="tl-year">1976</div>
                <div className="tl-title">Terras: almost every integer falls below itself</div>
                <p>
                  The set of n with finite stopping time has natural density 1
                  <Note n={12}>
                    The engine is <b>parity-vector equidistribution</b>: the first k parity bits of
                    an orbit, as n ranges over residues mod 2<sup className="inline-sup">k</sup>,
                    hit every pattern exactly once — for k ≈ log₂ n the orbit genuinely is a fair
                    coin, and the random-walk heuristic becomes a theorem <i>on that horizon</i>.
                    The entire difficulty of Collatz lives beyond that horizon, where the
                    correlations the map actually has are invisible to counting arguments.
                  </Note>
                  . Independently Everett (1977). This converts &ldquo;most numbers behave&rdquo;
                  from folklore to theorem — but density-1 leaves infinitely many exceptions
                  unaccounted for, and one divergent exception falsifies everything.
                </p>
              </div>
              <div className="tl-item">
                <div className="tl-year">1977</div>
                <div className="tl-title">Steiner: no nontrivial &ldquo;circuits&rdquo;</div>
                <p>
                  A cycle that climbs through odd numbers once then descends once (a 1-cycle) cannot
                  exist. The proof imports <b>Baker&apos;s theorem</b> on linear forms in logarithms
                  — transcendence theory walks into the problem for the first time
                  <Note n={13}>
                    Why transcendence? A cycle with a odd steps and b even steps forces 2
                    <sup className="inline-sup">b</sup> ≈ 3<sup className="inline-sup">a</sup> to
                    absurd precision — the cycle equation traps |b log 2 − a log 3| below roughly
                    1/(product of cycle elements). Baker-type bounds say that quantity cannot be{" "}
                    <i>that</i> small. Every cycle-exclusion result since is this one idea with
                    sharper constants: Simons–de Weger killed m-cycles up to m = 68 (2005); Hercher
                    reached m ≤ 91 (2023).
                  </Note>
                  .
                </p>
              </div>
              <div className="tl-item">
                <div className="tl-year">1993</div>
                <div className="tl-title">Eliahou: cycles must be enormous</div>
                <p>
                  Any nontrivial cycle has length at least 17,087,915, via the continued-fraction
                  convergents of log₂ 3 — and the bound scales with the computational frontier:
                  feeding in today&apos;s ~2⁷¹ verification pushes the minimum length into the
                  hundreds of billions
                  <Note n={14}>
                    The mechanism: every element of a nontrivial cycle must exceed the verification
                    bound V (anything below V provably reaches 1), and the cycle equation then
                    forces the length to be a numerator-scale multiple drawn from the continued
                    fraction expansion of log₂ 3 — the admissible lengths are sums of terms like
                    301,994·a + 17,087,915·b. Bigger V, longer minimum cycle. A disproof-by-cycle
                    would be an object of genuinely astronomical size.
                  </Note>
                  .
                </p>
              </div>
              <div className="tl-item">
                <div className="tl-year">1994</div>
                <div className="tl-title">Korec: almost every orbit falls polynomially far</div>
                <p>
                  For almost all n, the orbit dips below n<sup className="inline-sup">θ</sup> for
                  any θ &gt; log 3 / log 4 ≈ 0.7925. Strengthens Terras from &ldquo;falls below
                  n&rdquo; to &ldquo;falls well below n.&rdquo;
                </p>
              </div>
              <div className="tl-item">
                <div className="tl-year">2003</div>
                <div className="tl-title">Krasikov–Lagarias: the basin of 1 is fat</div>
                <p>
                  The count of n ≤ x that provably reach 1 is at least x
                  <sup className="inline-sup">0.84</sup>, from systems of difference inequalities
                  over residue classes mod 3<sup className="inline-sup">k</sup>. Unconditional, no
                  &ldquo;almost&rdquo; — but a power short of x, which is the whole game.
                </p>
              </div>
              <div className="tl-item">
                <div className="tl-year">2019</div>
                <div className="tl-title">Tao: almost all orbits attain almost bounded values</div>
                <p>
                  For any function f(n) → ∞, no matter how slowly, almost every n (logarithmic
                  density) has an orbit dipping below f(n)
                  <Note n={15}>
                    <b>The best theorem anyone has.</b> Tao&apos;s move: build an invariant-ish
                    measure for the accelerated map and run a probabilistic decay argument on
                    3-adic residue classes, importing PDE-flavored propagation-of-smallness ideas.
                    Take f(n) = log log log log n and almost every orbit still gets under it. But
                    the method is intrinsically statistical: it controls the ensemble, and by
                    Tao&apos;s own assessment cannot by itself reach <i>every</i> orbit — the
                    exceptional set shrinks and never provably empties. §8 explains why that wall
                    is structural.
                  </Note>
                  .
                </p>
              </div>
              <div className="tl-item">
                <div className="tl-year">2020s</div>
                <div className="tl-title">Barina: the computational frontier</div>
                <p>
                  Peer-reviewed verification to 2⁶⁸; the distributed project reports ~2⁷¹. Also the
                  source of the modern record tables for peaks and flight lengths.
                </p>
              </div>
            </div>
          </Chapter>

          <Chapter id="failure" n={6} title="The Two Ways It Could Fail">
            <p>
              A settlement must destroy, or exhibit, each of these — and both failure modes{" "}
              <em>really occur</em> in the map&apos;s nearest relatives, which is the strongest
              evidence that no soft argument will ever work:
            </p>
            <ul>
              <li>
                <strong>Failure A — a nontrivial cycle.</strong> Some orbit repeats without ever
                touching 1. Known constraints: every element &gt; 2⁷¹, length in the hundreds of
                billions, and no m-cycle shape with m ≤ 91 (§5).
              </li>
              <li>
                <strong>Failure B — a divergent orbit.</strong> Some orbit marches to infinity.
                Nothing whatsoever excludes this; the density theorems only say such orbits are
                statistically invisible
                <Note n={16}>
                  A sobering fact: it is not even proven that <b>one single orbit</b> of the 5n+1
                  map diverges — not for seed 7, not for any seed — despite divergence there being
                  overwhelmingly certain heuristically (positive drift). Humanity currently owns no
                  technique for proving any specific orbit of any specific qn+r map divergent. That
                  tool simply does not exist yet, and Failure B cannot be ruled out without
                  something like it.
                </Note>
                .
              </li>
            </ul>
            <VariantLab />
            <p>
              The moral of the lab: <strong>3n−1</strong> (equivalently, Collatz on negative
              integers) has three known cycles — so &ldquo;maps of this shape funnel into one
              cycle&rdquo; is simply false as a general principle. <strong>5n+1</strong> has
              positive drift and apparently divergent orbits — so &ldquo;maps of this shape come
              back down&rdquo; is also false. Any correct proof must therefore consume the exact
              constants 3 and +1 and the positivity of the domain
              <Note n={17}>
                This is a genuine <b>no-go criterion</b> you can apply to any claimed proof in
                about a minute: if the argument would survive with −1 in place of +1, or 5 in place
                of 3, it is wrong — full stop — because its conclusion is false for those maps.
                Nearly every amateur proof (and more than one professional preprint) dies on this
                test, usually because it secretly only uses &ldquo;odd steps go up, even steps go
                down.&rdquo;
              </Note>
              .
            </p>
          </Chapter>

          <Chapter id="routes" n={7} title="Reformulations & Attack Routes">
            <p>
              The problem has been transplanted into a dozen fields, each yielding structure — and
              each inheriting the difficulty intact. The major equivalences:
            </p>
            <h3 className="sub">2-adic dynamics: the map is secretly a coin flip</h3>
            <p>
              The accelerated map extends to the 2-adic integers ℤ₂, where it is topologically
              conjugate to the one-sided shift — measure-preserving, ergodic, as random as a
              dynamical system can be
              <Note n={18}>
                The conjugacy Q sends each x ∈ ℤ₂ to its parity vector (the infinite record of
                odd/even choices), and every infinite parity sequence is realized by exactly one
                2-adic integer. So &ldquo;chaotic Collatz behavior&rdquo; exists in abundance — the
                conjecture asserts that the measure-zero, un-generic set ℤ⁺ threads the needle and
                always lands in the eventually-periodic parity tail (10)(10)(10)… Ergodic theory
                sees the ocean perfectly and cannot see the needle: measure-theoretic tools are
                structurally blind to a specific measure-zero set, which is why this beautiful
                reformulation has produced zero unconditional convergence results for actual
                integers.
              </Note>
              .
            </p>
            <h3 className="sub">Computability: the neighborhood is undecidable</h3>
            <p>
              Conway (1972) proved that iterating <em>generalized</em> Collatz functions
              (piecewise-linear maps chosen by residue class) can simulate any Turing machine, and
              built FRACTRAN to demonstrate it; Kurtz–Simon later pinned the generalized problem as
              Π⁰₂-complete
              <Note n={19}>
                Read carefully: this does <b>not</b> prove Collatz itself undecidable — 3n+1 is one
                fixed, very short program, not the general family. What it proves is that no{" "}
                <i>uniform method</i> can settle all problems of this shape, so any proof must
                exploit the specific arithmetic of 3 and 2 — fully consistent with the no-go
                criterion of §6. It also keeps alive the unsettling possibility that Collatz is
                independent of PA or even ZFC (§9, Path C).
              </Note>
              .
            </p>
            <h3 className="sub">The other transplants</h3>
            <ul>
              <li>
                <strong>Diophantine:</strong> cycle existence ⇔ solvability of the cycle equation,
                where linear forms in logarithms of 2 and 3 rule (all of §5&apos;s cycle results
                live here). The relevant open sharpening — how well log₂ 3 can be approximated —
                connects to deep unsolved problems in transcendence theory.
              </li>
              <li>
                <strong>Functional equations:</strong> Berg–Meinardus recast the conjecture as a
                statement about solutions of a functional equation for generating functions on the
                unit disk — analytic, elegant, and so far inert.
              </li>
              <li>
                <strong>The predecessor tree:</strong> Wirsching&apos;s program studies the tree of
                all ancestors of 1; the conjecture says the tree is <em>everything</em>. Yields the
                x^0.84 density bounds; stuck below exponent 1.
              </li>
              <li>
                <strong>Rewriting systems / tag systems:</strong> Collatz is equivalent to
                termination of a 3-symbol tag system — connecting it to term-rewriting termination,
                another land of undecidability
                <Note n={20}>
                  A recurring pattern worth annotating: every translation lands the problem next
                  door to an undecidable general question — Turing machines, tag systems,
                  termination, matrix mortality. The conjecture keeps choosing neighborhoods where
                  general methods provably cannot exist. This is either a hint about its nature or
                  a filter on which translations get published; probably some of both.
                </Note>
                .
              </li>
            </ul>
          </Chapter>

          <Chapter id="resists" n={8} title="Why It Resists Proof">
            <p>The obstructions, stated as sharply as the literature allows:</p>
            <ul>
              <li>
                <strong>No conserved or monotone quantity.</strong> The standard way to prove
                termination is a Lyapunov/ranking function that provably decreases. None is known
                for Collatz, and the map&apos;s violent excursions (27 → 9,232) show any candidate
                must tolerate enormous transient growth — it would have to encode, in effect, the
                answer itself
                <Note n={21}>
                  This is the graveyard of most serious amateur attempts: weight functions,
                  entropy-like counts of binary digits, clever potentials. The binary view in §3
                  shows the difficulty — ×3 rewrites the whole bit-string (carries propagate
                  globally), while ÷2 only trims the end. No local accounting of digits has ever
                  survived the carries.
                </Note>
                .
              </li>
              <li>
                <strong>The 2-adic/3-adic incompatibility.</strong> The even step is perfectly
                natural in base 2; the odd step in base 3. The map shuttles information between two
                incommensurable number systems, and mathematics has famously weak tools for
                statements coupling multiplicative structure in 2 and 3 simultaneously
                <Note n={22}>
                  The same wall shows up across number theory: Furstenberg&apos;s ×2, ×3
                  conjecture, the digits of 2<sup className="inline-sup">n</sup> in base 3,
                  Mahler&apos;s Z-number problem — all open, all &ldquo;2 versus 3.&rdquo; Collatz
                  is plausibly hard <i>because</i> it sits squarely on this fault line, iterating
                  the two structures against each other.
                </Note>
                .
              </li>
              <li>
                <strong>Statistical methods cannot finish.</strong> Terras-to-Tao arguments control
                density; the conjecture demands totality. An exceptional set of density zero can
                still be infinite — and one exception is fatal. Closing &ldquo;almost all&rdquo; to
                &ldquo;all&rdquo; requires per-orbit, non-statistical control that no one has
                <Note n={23}>
                  Tao&apos;s own framing: getting <i>every</i> orbit this way is &ldquo;analogous
                  to the invariant-measure approach to the Riemann hypothesis&rdquo; — the method
                  averages, and averages cannot see one rogue orbit. A genuinely new mechanism is
                  required, not a sharper constant in the same mechanism.
                </Note>
                .
              </li>
              <li>
                <strong>The verification asymmetry (§1, note 4).</strong> No finite computation can
                even in principle certify a divergent orbit — so the &ldquo;experimental&rdquo;
                route to disproof is half-closed, and the proof route gets no inductive foothold
                from the 10²¹ verified cases.
              </li>
            </ul>
          </Chapter>

          <Chapter id="settle" n={9} title="What a Settlement Must Contain">
            <p>
              The deliverable, itemized. There are exactly three exits, and each has a
              non-negotiable bill of materials:
            </p>
            <h3 className="sub">Path A — prove it true</h3>
            <ol className="checklist">
              <li>
                <span className="box">[ ]</span>
                <span>
                  <span className="what">Exclude all nontrivial cycles, for every period.</span>
                  <span className="why">
                    Current transcendence bounds cap out at m-cycles, m ≤ 91. A full exclusion
                    needs either radically stronger lower bounds on |2^b − 3^a| (beyond what
                    Baker-type theory delivers) or a structurally new cycle argument.
                  </span>
                </span>
              </li>
              <li>
                <span className="box">[ ]</span>
                <span>
                  <span className="what">Exclude divergent orbits — every single one.</span>
                  <span className="why">
                    The hard core. Requires per-orbit control: a decreasing ranking function, a
                    covering-system induction that closes, or an entirely new mechanism. Nothing in
                    the current literature — including Tao&apos;s theorem — even claims a path to
                    this.
                  </span>
                </span>
              </li>
              <li>
                <span className="box">[ ]</span>
                <span>
                  <span className="what">Pass the no-go filter of §6.</span>
                  <span className="why">
                    The argument must visibly fail for 3n−1 and for 5n+1, and must fail on the
                    negative integers. If you cannot point to the exact step where it does, the
                    proof is wrong before refereeing begins.
                  </span>
                </span>
              </li>
            </ol>
            <h3 className="sub">Path B — prove it false</h3>
            <ol className="checklist">
              <li>
                <span className="box">[ ]</span>
                <span>
                  <span className="what">Exhibit a counterexample orbit.</span>
                  <span className="why">
                    A cycle: every element &gt; 2⁷¹, hundreds of billions of terms, verifiable but
                    unfindable by any current search strategy. Or divergence: which needs a{" "}
                    <em>proof</em> of escape for a specific orbit — a type of theorem never yet
                    achieved for any qn+r map (§6, note 16). Disproof is, if anything, harder than
                    proof.
                  </span>
                </span>
              </li>
            </ol>
            <h3 className="sub">Path C — prove it unprovable</h3>
            <ol className="checklist">
              <li>
                <span className="box">[ ]</span>
                <span>
                  <span className="what">Show independence from PA (or ZFC).</span>
                  <span className="why">
                    Conway&apos;s universality makes this less absurd than it sounds, but no
                    independence technique (forcing, incompleteness coding) has ever been made to
                    grip a specific, natural Π⁰₂ arithmetic statement like this one. Note the
                    fine print: independence would <em>not</em> mean &ldquo;true&rdquo; — that
                    shortcut works for Π⁰₁ statements only, and Collatz is not one.
                  </span>
                </span>
              </li>
            </ol>
            <p>
              Anything presented as a settlement that does not check one of these boxes — in full,
              with the quantifier &ldquo;all&rdquo; and not &ldquo;almost all&rdquo; — is a
              contribution to §5 at best and to the crackpot file at worst
              <Note n={24}>
                Lagarias maintains an annotated bibliography of the problem&apos;s literature —
                hundreds of entries — and the survey volume&apos;s dry warning stands: the problem
                &ldquo;has a reputation for consuming careers.&rdquo; The historically productive
                stance has been to treat Collatz as a <b>lens</b> — a generator of good mathematics
                in ergodic theory, transcendence, and computability — rather than a target for
                frontal assault.
              </Note>
              .
            </p>
          </Chapter>

          <Chapter id="reading" n={10} title="The Reading List">
            <p>The canonical shelf, in reading order:</p>
            <ul className="reading">
              <li>
                <span className="cite">
                  J. C. Lagarias, <i>The 3x+1 Problem and Its Generalizations</i>
                </span>
                <span className="where">
                  American Mathematical Monthly 92 (1985). The classic survey; still the right
                  first read. His two annotated bibliographies (arXiv math/0309224 and
                  math/0608208) index essentially the entire literature.
                </span>
              </li>
              <li>
                <span className="cite">
                  J. C. Lagarias (ed.), <i>The Ultimate Challenge: The 3x+1 Problem</i>
                </span>
                <span className="where">AMS, 2010. The book of record on the problem.</span>
              </li>
              <li>
                <span className="cite">
                  T. Tao, <i>Almost all orbits of the Collatz map attain almost bounded values</i>
                </span>
                <span className="where">
                  Forum of Mathematics, Pi (2022); arXiv:1909.03562. The state of the art, with an
                  unusually candid discussion of why the method cannot finish the job.
                </span>
              </li>
              <li>
                <span className="cite">
                  R. Terras, <i>A stopping time problem on the positive integers</i>
                </span>
                <span className="where">Acta Arithmetica 30 (1976). Where density-1 began.</span>
              </li>
              <li>
                <span className="cite">
                  I. Krasikov &amp; J. C. Lagarias, <i>Bounds for the 3x+1 problem using difference
                  inequalities</i>
                </span>
                <span className="where">Acta Arithmetica 109 (2003). The x^0.84 bound.</span>
              </li>
              <li>
                <span className="cite">
                  J. L. Simons &amp; B. M. M. de Weger, <i>Theoretical and computational bounds for
                  m-cycles of the 3n+1 problem</i>
                </span>
                <span className="where">
                  Acta Arithmetica 117 (2005); extended by C. Hercher to m ≤ 91 (2023).
                </span>
              </li>
              <li>
                <span className="cite">
                  J. H. Conway, <i>Unpredictable Iterations</i>
                </span>
                <span className="where">
                  Proc. 1972 Number Theory Conf., Boulder. Undecidability enters; see also his{" "}
                  <i>FRACTRAN</i> paper (1987) and Kurtz–Simon (2007) for Π⁰₂-completeness.
                </span>
              </li>
              <li>
                <span className="cite">
                  G. J. Wirsching, <i>The Dynamical System Generated by the 3n+1 Function</i>
                </span>
                <span className="where">Springer Lecture Notes in Mathematics 1681 (1998).</span>
              </li>
              <li>
                <span className="cite">
                  D. Barina, <i>Convergence verification of the Collatz problem</i>
                </span>
                <span className="where">
                  Journal of Supercomputing (2020), plus the live project records.
                </span>
              </li>
            </ul>
          </Chapter>

          <Chapter id="campaign" n={11} title="The Campaign (Live)">
            <p>
              This dossier grew a research wing: a live, iterated attack campaign on the conjecture,
              run under strict ground rules — no fabricated steps, dead ends logged as results,
              corrections kept on the record. Twenty-five paths and counting, all executing in the
              browser at <Link href="/p/collatz/attack-log">the attack log</Link>, with the full
              iteration log kept in the standalone Collatz Lab app. Headlines so far:
            </p>
            <ul>
              <li>
                <strong>Certificate program exhausted:</strong> modular Lyapunov tables (any modulus),
                Syracuse valuation tables, all finite-state machines over (residue, parity history),
                and both one-counter classes — each decided empty with machine-verified witnesses,
                all killed by the same obstruction: the negative-domain cycles at −1, −5, −17.
              </li>
              <li>
                <strong>Certified density bounds:</strong> the Applegate–Lagarias tree-search method
                pushed far past its published-era depth — γ ≥ 0.7748, certifying 1.6×10¹⁸ integers
                below 2^78.1 reach 1, territory beyond the 2⁷¹ verification frontier.
              </li>
              <li>
                <strong>A literature-grade cycle bound assembled:</strong> Hercher 2023 + Barina 2025
                combine to establish K ≥ 1.375×10¹¹ odd members in any nontrivial cycle — and our
                exact-convergent engine independently derived the same integer, 137,528,045,312.
              </li>
              <li>
                <strong>Unifications and corrections:</strong> the covering tail and the divergence
                barrier shown to be one large-deviation object (entropy rate 0.05004 bits/step,
                confirmed against exact combinatorics); an evolutionary adversary that converges onto
                the proven obstruction map; four of our own overclaims caught by our own instruments
                and downgraded in public.
              </li>
            </ul>
            <p>
              The status line has not moved: <strong>the conjecture is open.</strong> What the
              campaign adds is an unusually precise, machine-checked map of why — and a standing
              triage kit for every future claimed proof.
            </p>
            <div className="footer">
              Imported into Math Lab from the standalone Collatz Lab island app. All computation
              runs in your browser in exact BigInt arithmetic; no data leaves the page. Nothing
              here — or anywhere else, yet — settles the conjecture. §9 has the checklist; the
              field awaits. <Link href="/">← back to the index</Link>
            </div>
          </Chapter>
        </main>
      </div>
    </>
  );
}
