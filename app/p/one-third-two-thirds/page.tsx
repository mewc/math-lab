import type { Metadata } from "next";
import Link from "next/link";
import BalanceLab from "@/components/BalanceLab";
import BalanceSpectrum from "@/components/BalanceSpectrum";
import { Note } from "@/components/Note";

export const metadata: Metadata = {
  title: "Math Lab — the 1/3–2/3 dossier",
  description:
    "An annotated dossier on the 1/3–2/3 conjecture for posets: exact linear-extension instruments, an exhaustive machine-verified campaign over every poset on up to 9 elements, and the extremal landscape at 1/3.",
};

const SECTIONS = [
  ["problem", "The Problem"],
  ["status", "Current Status"],
  ["lab", "The Balance Lab"],
  ["campaign", "The Campaign (Live)"],
  ["extremal", "The Extremal Landscape"],
  ["resists", "Why It Resists Proof"],
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

export default function Page() {
  return (
    <>
      <header className="topbar">
        <span className="wordmark">
          <Link href="/" style={{ color: "inherit" }}>
            <b>Math</b> Lab
          </Link>
        </span>
        <span style={{ color: "var(--ink-faint)", fontSize: 13 }}>the 1/3–2/3 dossier</span>
        <span className="status-chip">status: open · since 1968</span>
      </header>

      <div className="shell">
        <nav className="toc" aria-label="Contents">
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
            <div className="kicker">An annotated research dossier · est. 1968</div>
            <h1>
              Every unsorted pair is <em>almost fair</em> — the 1/3–2/3 conjecture
            </h1>
            <p className="lede">
              Take any finite partially ordered set that isn&apos;t already a chain, and shuffle it
              into a random linear order consistent with the known comparisons. The conjecture:
              there is always some pair of elements whose relative order is genuinely uncertain —
              each of the two outcomes has probability at least <strong>1/3</strong>. Fifty-eight
              years, three landmark partial results, and the constant still stands at 3/11-and-a-bit
              instead of 1/3.
            </p>
            <div className="honesty-box">
              <b>Intellectual honesty clause.</b> This page does not settle the conjecture. What it
              adds is machine-verified territory: an exhaustive, exact sweep of every poset on up
              to 10 elements (2,769,961 of them), one elementary theorem proved and machine
              cross-checked in-house, live instruments you can point at any small poset, and an
              honestly logged map of the extremal landscape at 1/3. Observations labeled
              &ldquo;empirical&rdquo; are ours; several are likely known — no novelty is claimed,
              only verification.
            </div>
          </div>

          <Chapter id="problem" n={1} title="The Problem">
            <p>
              A <strong>linear extension</strong> of a poset P is a total order of its elements
              consistent with every relation of P
              <Note n={1}>
                Think of P as partial knowledge from comparisons already made, and a linear
                extension as one full ranking consistent with that knowledge. Counting them is
                #P-complete in general (Brightwell–Winkler 1991) — but exact for small posets via
                dynamic programming over order ideals, which is what every instrument on this page
                does.
              </Note>
              . Draw one uniformly at random and write P(x &lt; y) for the probability that x lands
              below y.
            </p>
            <div className="mathbox">
              b(P) = max
              <span style={{ fontSize: 14, verticalAlign: "sub" }}>(x,y) incomparable</span>{" "}
              min&#123; P(x&lt;y), P(y&lt;x) &#125;
              <span className="caption">
                The best balanced pair. The conjecture (Kislitsyn 1968): every finite poset that is
                not a chain has b(P) ≥ 1/3 — equivalently, some pair with P(x&lt;y) ∈ [1/3, 2/3].
              </span>
            </div>
            <p>
              The constant 1/3 is the best possible: the three-element poset made of a two-element
              chain plus one incomparable point — <strong>1+2</strong> — has exactly three linear
              extensions, and its isolated point falls below the chain&apos;s bottom in exactly one
              of them
              <Note n={2}>
                Label the chain a &lt; b and the free point c. The extensions are abc, acb, cab: so
                P(c&lt;a) = 1/3, P(c between) = 1/3, P(c on top) = 1/3. Every incomparable pair of
                this poset has min-side probability exactly 1/3, so b(1+2) = 1/3 on the nose. Any
                conjectured constant above 1/3 dies here.
              </Note>
              .
            </p>
            <p>
              Why anyone cares: sorting under partial information. A pair with both outcomes ≥ 1/3
              means a single comparison shrinks the count of consistent rankings by a factor of at
              least 3/2 no matter the answer — so any poset could be fully sorted in about
              log<sub>3/2</sub> of its extension count comparisons
              <Note n={3}>
                This is Fredman&apos;s 1976 route into the problem (Linial arrived independently in
                1984). The information-theoretic lower bound is log₂ e(P) comparisons; a standing
                supply of 1/3-balanced pairs would match it up to the constant log₂(3/2) ≈ 0.585.
                The conjecture is exactly the claim that this greedy engine never stalls.
              </Note>
              .
            </p>
          </Chapter>

          <Chapter id="status" n={2} title="Current Status">
            <ul>
              <li>
                <strong>Open</strong> since Kislitsyn posed it in 1968 (rediscovered by Fredman and
                by Linial).
              </li>
              <li>
                <strong>The proven constant is (5−√5)/10 ≈ 0.2764</strong>, not 1/3: Kahn–Saks
                (1984) first broke the problem open with 3/11
                <Note n={4}>
                  Kahn–Saks introduced the geometric machinery — mixed volumes and the
                  Alexandrov–Fenchel inequalities applied to order polytopes — that still powers
                  the best bounds. Brightwell–Felsner–Trotter (1995) sharpened the constant to the
                  golden-ratio value (5−√5)/10, where it has sat for three decades.
                </Note>
                , and Brightwell–Felsner–Trotter (1995) pushed to the golden-ratio constant.
              </li>
              <li>
                <strong>The golden-ratio constant is a real wall:</strong> there is an infinite
                poset where (5−√5)/10 is exactly tight — so any proof of 1/3 must genuinely use
                finiteness
                <Note n={5}>
                  Brightwell&apos;s infinite semiorder shows the BFT bound cannot be improved for
                  infinite posets at all. The conjecture is thus a statement about finite
                  combinatorics specifically; arguments that never invoke finiteness are filtered
                  out in advance — a no-go criterion in the Collatz-dossier spirit.
                </Note>
                .
              </li>
              <li>
                <strong>Proved for classes:</strong> width-2 posets (Linial 1984), semiorders
                (Brightwell 1989), N-free posets (Zaguia), posets whose comparability structure is
                otherwise special — and, by Peczarski&apos;s computations, every poset with at most
                11 elements
                <Note n={6}>
                  Our exhaustive sweep below reaches 10 elements — inside Peczarski&apos;s
                  computational frontier, so it is an independent reproduction, not new territory.
                  What it adds is the full exact spectrum (through n = 9), the extremal census
                  (through n = 10), and instruments anyone can re-run in a browser.
                </Note>
                .
              </li>
            </ul>
          </Chapter>

          <Chapter id="lab" n={3} title="The Balance Lab">
            <p>
              The conjecture, executable. Pick a poset — or roll a random one — and get every
              incomparable pair&apos;s exact order probability as a BigInt fraction, the best
              balanced pair (★, highlighted in the diagram), and the exact comparison against 1/3.
              No floating point participates in any verdict.
            </p>
            <BalanceLab />
            <p>
              Things worth trying: <strong>1+2</strong>, the extremal seed, sits at exactly 1/3.
              The <strong>hook H(4)</strong> — a 4-chain with two pendant feet — also lands at
              exactly 1/3 (§5). The <strong>Boolean cube B₃</strong> is rigid with symmetry: its
              best pair is perfectly fair at 1/2. Random posets essentially never come close to
              1/3.
            </p>
          </Chapter>

          <Chapter id="campaign" n={4} title="The Campaign (Live)">
            <p>
              Iteration 1 of our campaign: enumerate <em>every</em> poset up to isomorphism on n ≤
              9 elements — growing each poset by attaching a new maximal element over every order
              ideal, deduplicating canonically, and cross-checking the census against OEIS A000112
              at every size
              <Note n={7}>
                The counts 5, 16, 63, 318, 2045, 16999, 183231 for n = 3…9 all matched the known
                sequence, which is the self-check that the enumerator isn&apos;t silently dropping
                or duplicating posets. Balance was then computed exactly for each non-chain poset:
                202,670 of them, under a minute total in Bun, every comparison done by BigInt
                cross-multiplication.
              </Note>
              . Verdict:
            </p>
            <BalanceSpectrum />
            <ul>
              <li>
                <strong>Zero posets below 1/3</strong> — the conjecture survives, exactly, on all
                2,769,953 non-chain posets with at most 10 elements. (The n = 10 level — all
                2,567,284 posets, reached through 8,070,524 generation candidates — runs in an
                early-exit mode that records the verdict and the extremal census but not the full
                spectrum; n ≤ 9 has the complete spectrum above.)
              </li>
              <li>
                <strong>The minimum never moves:</strong> min b(P) is exactly 1/3 at every size,
                achieved by 1, 2, 3, 5, 8, 12, 18, 27 posets for n = 3…10
                <Note n={8}>
                  The census differences — 1, 1, 2, 3, 4, 6, 9, and (per the grown class of §5)
                  13, 19 at n = 11, 12 — satisfy <b>d(k) = d(k−1) + d(k−3)</b> at every computed
                  point: the recurrence counting compositions into parts of size 1 and 3, exactly
                  what towers built from chain-links and 3-element hooks would produce. Correction
                  on the record: our first guess for this census (A000792, cited from memory)
                  predicted 39 and 57 at n = 11, 12 — the machine grew 40 and 59, falsifying it
                  same-day. The recurrence version fits everything computed and predicts a census
                  of 87 at n = 13, the next falsifiable target.
                </Note>
                .
              </li>
              <li>
                <strong>The spectrum hugs 1/3 from above:</strong> the runner-up balance — the
                smallest value strictly greater than 1/3 — decreases at every level: 2/5, 4/11,
                5/14, 5/14, 16/45, 6/17, and 37/106 at n = 10
                <Note n={9}>
                  ≈ 0.400, 0.364, 0.357, 0.357, 0.356, 0.353, 0.349; the gaps above 1/3 run 1/15,
                  1/33, 1/42, 1/45, 1/51, 5/318. An honest reading: balance values appear to
                  accumulate at 1/3 from above as posets grow, so &ldquo;the conjecture is safe
                  because small cases clear 1/3 with room&rdquo; is false comfort — the room
                  shrinks. Guessed parametric families all failed to reproduce this creep
                  (iteration 5 — they run to 1/2 or collapse onto 1/3 exactly), so whether the
                  accumulation is genuine, and at what rate, remains open. The n = 10 runner-up is
                  a single intricate braided poset; nobody has explained it yet, including us.
                </Note>
                .
              </li>
              <li>
                <strong>Beyond exhaustion, sampling:</strong> 8,000 random posets on 10–13 elements
                (two generation models, seeded and reproducible) — none below 1/3, several landing
                exactly on it. Sampling is evidence, not proof, and is logged as such.
              </li>
            </ul>
          </Chapter>

          <Chapter id="extremal" n={5} title="The Extremal Landscape">
            <p>
              Who lives at exactly 1/3? The campaign&apos;s later iterations dissected the census,
              and one observation graduated to a proof:
            </p>
            <ul>
              <li>
                <strong>Theorem (in-house, elementary).</strong> The hook H(k) — a chain c₁ &lt; …
                &lt; c<sub>k</sub> with two incomparable feet x &lt; c₁ and y &lt; c₂ — satisfies
                b(H(k)) = 1/3 <em>exactly</em>, for every k ≥ 1
                <Note n={10}>
                  <b>Proof.</b> In any linear extension, the elements x, c₁, …, c<sub>k</sub> are
                  forced into that exact order. An extension is therefore determined by where y is
                  inserted, and y must precede c₂ — leaving three slots: before x, between x and
                  c₁, between c₁ and c₂. So e(H(k)) = 3, always. The only incomparable pairs are
                  (x, y) and (y, c₁), and each realizes its minority order in exactly one of the
                  three slots: both sit at exactly 1/3. ∎ Machine cross-checked (extension count,
                  pair list, per-pair fractions) for k ≤ 12; the argument is k-independent.
                  Elementary and very likely known — the point is that the conjecture, if true, is{" "}
                  <b>tight at every size</b>, not just at n = 3.
                </Note>
                .
              </li>
              <li>
                <strong>Extremal posets are totally balanced.</strong> In all 49 exactly-1/3 posets
                on ≤ 9 elements, <em>every</em> incomparable pair sits at exactly 1/3 — none below
                — and the extension count is always a power of 3 (49/49 on both counts). Extremal
                posets look like towers of decoupled hooks, each hook contributing a factor of 3
                <Note n={11}>
                  Directly buildable: stack a hook at the bottom of a long chain and a dual hook
                  (two heads) at the top. Iteration 5 computed this two-hook tower exactly: for
                  chain gap ≥ 3 the hooks decouple and b = 1/3 exactly with e = 9 = 3². The n = 10
                  extremal posets have e ∈ &#123;3, 9, 27&#125; — towers of one, two, three hooks.
                </Note>
                . And every one carries an induced 1+2 pattern seeded at its extremal pair.
              </li>
              <li>
                <strong>The extremal class is self-generating — confirmed by two independent
                computations.</strong> Growing the class one element at a time from the single 1+2
                seed reproduces the exhaustive census exactly at every level (1, 2, 3, 5, 8, 12,
                18), and <em>predicted</em> 27 extremal posets at n = 10 — which the independent
                early-exit sweep of all 8,070,524 candidates then confirmed: 27, on the nose
                <Note n={12}>
                  Two different programs, two different methods (constructive growth with
                  canonical dedup vs. exhaustive generate-and-test), same answer. On the verified
                  range, no extremal poset is an &ldquo;orphan&rdquo;: each contains an extremal
                  poset of every smaller size down to the 1+2 seed. Grown further (closure
                  assumed, awaiting exhaustive confirmation): 40 at n = 11 and 59 at n = 12, with
                  e-distributions that stay pure powers of 3 — the first four-hook tower (e = 81)
                  appears at n = 12. A characterization of the extremal class as &ldquo;hook
                  towers&rdquo; looks provable by the same slot bookkeeping as the H(k) theorem —
                  the campaign&apos;s next natural theorem.
                </Note>
                .
              </li>
            </ul>
            <p>
              The picture: 1/3 is not a small-n accident that larger posets escape — it is a
              structural floor propped up by one 3-element pattern that embeds, tower-fashion, at
              every scale. A proof of the conjecture has to explain why <em>nothing does worse</em>{" "}
              than this pattern; a disproof has to beat it — and our sweep certifies nothing does,
              anywhere below 11 elements.
            </p>
          </Chapter>

          <Chapter id="resists" n={6} title="Why It Resists Proof">
            <ul>
              <li>
                <strong>The good tools overshoot their target.</strong> The Kahn–Saks machinery
                controls balance through geometry (order polytopes, Alexandrov–Fenchel), and
                geometry doesn&apos;t know the poset is finite — which is fatal, because at the
                infinite limit the true constant really is (5−√5)/10, not 1/3 (§2). The gap between
                0.2764 and 0.3333 is exactly the gap between geometric and combinatorial control.
              </li>
              <li>
                <strong>The extremal structure is delicate.</strong> Equality demands extension
                counts in perfect 1:2 ratio — a Diophantine coincidence that the hook family
                manufactures at every size (§5). Inequality proofs hate families of exact equality
                cases: there is no slack anywhere near them to give away.
              </li>
              <li>
                <strong>Exhaustion cannot finish.</strong> Poset counts grow super-exponentially
                (A000112: 183,231 at n = 9; over 2.5 million at n = 10). Machine sweeps sharpen the
                target and kill conjectured strengthenings, but the statement quantifies over all
                finite posets — same asymmetry as every problem in this lab.
              </li>
            </ul>
          </Chapter>

          <Chapter id="reading" n={7} title="The Reading List">
            <ul className="reading">
              <li>
                <span className="cite">
                  S. S. Kislitsyn, <i>Finite partially ordered sets and their associated sets of
                  permutations</i>
                </span>
                <span className="where">Mat. Zametki 4 (1968). Where the conjecture begins.</span>
              </li>
              <li>
                <span className="cite">
                  J. Kahn &amp; M. Saks, <i>Balancing poset extensions</i>
                </span>
                <span className="where">
                  Order 1 (1984). The 3/11 breakthrough; mixed volumes enter combinatorics.
                </span>
              </li>
              <li>
                <span className="cite">
                  G. Brightwell, S. Felsner &amp; W. T. Trotter, <i>Balancing pairs and the cross
                  product conjecture</i>
                </span>
                <span className="where">
                  Order 12 (1995). The (5−√5)/10 bound, still the record.
                </span>
              </li>
              <li>
                <span className="cite">
                  G. Brightwell, <i>Balanced pairs in partial orders</i>
                </span>
                <span className="where">
                  Discrete Mathematics 201 (1999). The survey of record for the conjecture.
                </span>
              </li>
              <li>
                <span className="cite">
                  M. Peczarski, <i>The gold partition conjecture</i>
                </span>
                <span className="where">
                  Order 23 (2006). The computational frontier: every poset with ≤ 11 elements.
                </span>
              </li>
              <li>
                <span className="cite">
                  G. Brightwell &amp; P. Winkler, <i>Counting linear extensions</i>
                </span>
                <span className="where">
                  Order 8 (1991). Why exact counting is #P-complete in general — and why small
                  cases are still fully computable.
                </span>
              </li>
            </ul>
            <div className="footer">
              Campaign scripts live in <span className="mono">research/</span> (iteration1:
              exhaustive sweep; iteration2: extremal landscape; emit-data: the checked-in dataset).
              All computation on this page runs in your browser in exact BigInt arithmetic. Nothing
              here settles the conjecture; §2 has the frontier.{" "}
              <Link href="/">← back to the index</Link>
            </div>
          </Chapter>
        </main>
      </div>
    </>
  );
}
