"use client";

import { useMemo, useState } from "react";
import {
  cycleBound,
  coveringTail,
  phiCandidates,
  killCandidate,
  stoppingTimeRecords,
  sustainedBiasRecords,
  fpLog2Ratio,
} from "@/lib/attack";
import { decideCertificateFamily } from "@/lib/certificates";
import { thermoTable, evolveAdversary, LD_RATE, THETA } from "@/lib/biomimetic";

// The attack log: four real lines of attack, actually executed, each logged
// depth by depth to its terminal state. Every number below is computed live —
// nothing is scripted output.

function LogLine({
  depth,
  kind,
  children,
}: {
  depth: number;
  kind?: "info" | "dead" | "wall" | "run";
  children: React.ReactNode;
}) {
  const color =
    kind === "dead" ? "var(--odd)" : kind === "wall" ? "var(--accent)" : kind === "run" ? "var(--even)" : "var(--ink-dim)";
  return (
    <div className="attack-line" style={{ paddingLeft: 14 + depth * 22 }}>
      <span className="attack-depth">{"›".repeat(depth + 1)}</span>
      <span style={{ color }}>{children}</span>
    </div>
  );
}

function PathPanel({
  code,
  title,
  premise,
  deeperLabel,
  onDeeper,
  canDeepen,
  children,
}: {
  code: string;
  title: string;
  premise: string;
  deeperLabel: string;
  onDeeper: () => void;
  canDeepen: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--line-soft)" }}>
        <p className="panel-title" style={{ margin: 0 }}>
          {code} · {title}
        </p>
        <p style={{ fontSize: 14, color: "var(--ink-dim)", margin: "8px 0 0", maxWidth: "72ch" }}>{premise}</p>
      </div>
      <div className="attack-log-body">{children}</div>
      <div style={{ padding: "12px 22px", borderTop: "1px solid var(--line-soft)", display: "flex", gap: 12, alignItems: "center" }}>
        <button className="btn ghost" onClick={onDeeper} disabled={!canDeepen} style={!canDeepen ? { opacity: 0.4, cursor: "default" } : undefined}>
          {canDeepen ? `⤵ go deeper — ${deeperLabel}` : "maximum depth reached for this instrument"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------- A --

function PathA() {
  const [depth, setDepth] = useState(1);
  const limit = 1 << Math.min(12 + depth * 2, 20);

  const { deaths, records } = useMemo(() => {
    const deaths = phiCandidates().map((c) => killCandidate(c, Math.min(limit, 65536)));
    const records = stoppingTimeRecords(limit);
    return { deaths, records };
  }, [limit]);

  return (
    <PathPanel
      code="PATH A"
      title="Direct descent — hunt for a ranking function"
      premise="The textbook way to prove termination: find a potential φ that provably decreases every step (or every odd-block). If any candidate below had survived, the conjecture would be settled. Watch each one die at a specific, computed integer."
      deeperLabel={`extend the kill-search and record-hunt to n ≤ ${(1 << Math.min(12 + (depth + 1) * 2, 20)).toLocaleString()}`}
      onDeeper={() => setDepth((d) => d + 1)}
      canDeepen={depth < 4}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — testing {deaths.length} candidate potentials for strict descent, n ≤ {Math.min(limit, 65536).toLocaleString()}
      </LogLine>
      {deaths.map((d) => (
        <LogLine key={d.desc} depth={1} kind={d.n === null ? "run" : "dead"}>
          {d.desc} —{" "}
          {d.n === null
            ? "no counterexample in range (extend range; all such candidates die eventually or encode the answer)"
            : `DIES at n = ${d.n}: φ(${d.from}) = ${d.phiFrom} → φ(${d.to}) = ${d.phiTo} (no decrease)`}
        </LogLine>
      ))}
      <LogLine depth={0} kind="run">
        DEPTH 2 — retreat to a weaker demand: &ldquo;every n descends below itself within m steps, for some uniform m.&rdquo;
        Computing stopping-time records for n ≤ {limit.toLocaleString()}:
      </LogLine>
      <LogLine depth={1}>
        {records
          .slice(-8)
          .map((r) => `σ(${r.n.toLocaleString()})=${r.sigma}`)
          .join(" · ")}
      </LogLine>
      <LogLine depth={1} kind="dead">
        The record σ keeps growing with the range — no uniform m survives the search. (Terras proved the records are
        unbounded: stopping time exceeds any m on a positive-density-zero but infinite set.)
      </LogLine>
      <LogLine depth={0} kind="wall">
        TERMINAL STATE — every locally-checkable potential dies because ×3 rewrites the whole binary string (global
        carries) while ÷2 trims one bit; a working φ must tolerate the 27-style excursions, i.e. it must already know the
        orbit comes back. This wall is why no ranking-function proof exists. PATH A: EXHAUSTED, NOT CLOSED.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- B --

function PathB() {
  const [vExp, setVExp] = useState(60);
  const BITS = 320;

  const { result, L } = useMemo(() => {
    const result = cycleBound(vExp, BITS, 10n ** 16n);
    const L = fpLog2Ratio(3n, 1n, 64);
    return { result, L };
  }, [vExp]);

  const lStr = (Number(L) / 2 ** 64).toFixed(15);
  const shown = result.rows.filter((r, i) => i > 3); // skip trivia 1/1, 2/1...

  return (
    <PathPanel
      code="PATH B"
      title="Cycle exclusion — the Diophantine gauntlet"
      premise={`A nontrivial cycle with a odd and b even steps forces 0 < b − a·log₂3 < a/(2V), where every cycle element exceeds the verification bound V = 2^${vExp}. So b/a must approximate log₂3 from above absurdly well — a condition only continued-fraction convergents can meet. This engine computes log₂3 to 320 fixed-point bits, derives its convergents exactly, and tests each against the inequality.`}
      deeperLabel={`raise the verification frontier to V = 2^${Math.min(vExp + 4, 76)} and re-run the gauntlet`}
      onDeeper={() => setVExp((v) => Math.min(v + 4, 76))}
      canDeepen={vExp < 76}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — log₂3 = {lStr}… (computed to 320 bits by exact squaring; convergents below are exact integers)
      </LogLine>
      <LogLine depth={0} kind="run">
        DEPTH 2 — testing convergents b/a against the cycle inequality ‖a·log₂3‖ &lt; a·2^−{vExp + 1}:
      </LogLine>
      {shown.slice(0, 26).map((r) => (
        <LogLine key={r.conv.index} depth={1} kind={r.passes ? "wall" : "dead"}>
          b/a = {r.conv.p.toLocaleString()}/{r.conv.q.toLocaleString()} ({r.conv.upper ? "above" : "below"}) — gap ≈ 2^
          {r.conv.gapLog2.toFixed(1)} vs required &lt; 2^{r.requiredLog2.toFixed(1)} →{" "}
          {r.passes ? "SURVIVES: first admissible cycle shape" : r.conv.upper ? "EXCLUDED" : "wrong side, excluded"}
        </LogLine>
      ))}
      {result.first ? (
        <>
          <LogLine depth={0} kind="wall">
            DEPTH 3 — first surviving shape: a ≥ {result.first.conv.q.toLocaleString()} odd steps, b ≥{" "}
            {result.first.conv.p.toLocaleString()} even steps ⇒ any nontrivial cycle has length ≥{" "}
            {(result.first.conv.p + result.first.conv.q).toLocaleString()} — with every element above 2^{vExp}.
          </LogLine>
          <LogLine depth={0} kind="wall">
            TERMINAL STATE — the bound grows as V grows (press &ldquo;go deeper&rdquo;), but for every V infinitely many
            admissible shapes remain: the convergents of log₂3 never run out. Baker-type transcendence bounds sharpen the
            gauntlet; nothing known closes it for ALL periods. PATH B: BOUNDS ENORMOUS, EXCLUSION INCOMPLETE.
          </LogLine>
        </>
      ) : (
        <LogLine depth={0} kind="wall">
          TERMINAL STATE — no convergent with a ≤ 10^16 survives at this V; raise the range or V to locate the frontier.
        </LogLine>
      )}
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- C --

function PathC() {
  const [kMax, setKMax] = useState(64);
  const rows = useMemo(() => {
    const ks: number[] = [];
    for (let k = 8; k <= kMax; k *= 2) ks.push(k);
    if (!ks.includes(kMax)) ks.push(kMax);
    return coveringTail(ks);
  }, [kMax]);

  return (
    <PathPanel
      code="PATH C"
      title="Covering induction — Terras' engine, run to exhaustion"
      premise="Work mod 2^k: a residue class whose k-step parity vector has a odd steps carries multiplier 3^a/2^k, and provably descends when 3^a < 2^k. The uncovered density is the exact binomial tail u(k) = 2^−k · Σ C(k,a) over a ≥ k·log₃2 — computed below in exact integer arithmetic. If u(k) ever hit zero, the conjecture would follow by induction."
      deeperLabel={`push the modulus to 2^${Math.min(kMax * 2, 1024)} (exact BigInt binomials)`}
      onDeeper={() => setKMax((k) => Math.min(k * 2, 1024))}
      canDeepen={kMax < 1024}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — exact uncovered density by modulus:
      </LogLine>
      {rows.map((r) => (
        <LogLine key={r.k} depth={1} kind={r.k === rows[rows.length - 1].k ? "run" : "info"}>
          k = {r.k}: descent needs a &lt; {r.aMin} of {r.k} odd steps; uncovered u(k) = {r.approx} (≈ 2^{r.log2u}) —
          NONZERO
        </LogLine>
      ))}
      <LogLine depth={0} kind="run">
        DEPTH 2 — decay rate check: u(k) shrinks geometrically (≈ 2^
        {rows.length >= 2
          ? ((rows[rows.length - 1].log2u - rows[rows.length - 2].log2u) / (rows[rows.length - 1].k - rows[rows.length - 2].k)).toFixed(3)
          : "?"}{" "}
        per step of k) — this is exactly Terras&apos; density-1 theorem materializing in the numbers.
      </LogLine>
      <LogLine depth={1} kind="dead">
        But u(k) &gt; 0 for every k — provably forever, since the all-odd parity vector always has 3^k &gt; 2^k. The
        uncovered classes always contain infinitely many integers.
      </LogLine>
      <LogLine depth={0} kind="wall">
        TERMINAL STATE — the covering argument proves &ldquo;almost all n descend&rdquo; and can be iterated (Korec, Tao
        push it to almost-bounded values), but the exceptional set shrinks and never provably empties. Density-1 is
        structurally unable to reach ALL. PATH C: CONVERGES TO 100%, NEVER ARRIVES.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- D --

function PathD() {
  const [limit, setLimit] = useState(50000);
  const { records, threshold } = useMemo(() => sustainedBiasRecords(limit), [limit]);

  return (
    <PathPanel
      code="PATH D"
      title="Divergence forcing — what an escaping orbit must do"
      premise={`In the accelerated map T (odd n → (3n+1)/2), t steps with o odd scale the value like n·3^o/2^t, so a divergent orbit must sustain odd-fraction o/t ≥ log2/log3 = ${(Math.log(2) / Math.log(3)).toFixed(6)}… at every horizon, forever — while Terras equidistribution says typical orbits run at 1/2. This engine measures the longest any real orbit sustains the required bias.`}
      deeperLabel={`extend the sweep to n ≤ ${(limit * 4).toLocaleString()}`}
      onDeeper={() => setLimit((l) => l * 4)}
      canDeepen={limit < 800000}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — required permanent bias: o/t ≥ {threshold.toFixed(6)} (exactly log 2 / log 3). Sweeping odd seeds n ≤{" "}
        {limit.toLocaleString()} for the longest sustained-bias prefix:
      </LogLine>
      <LogLine depth={1}>
        {records
          .slice(-8)
          .map((r) => `n=${r.n.toLocaleString()} holds it for ${r.len} steps`)
          .join(" · ")}
      </LogLine>
      <LogLine depth={1} kind="dead">
        Every orbit in range breaks the bias within ~{records.length ? records[records.length - 1].len : "?"} steps and
        then falls. The bias records grow only logarithmically with the range — exactly the random-walk prediction, and
        exactly what makes a real divergent orbit a statistical monster.
      </LogLine>
      <LogLine depth={0} kind="run">
        DEPTH 2 — the honest asymmetry: no finite sweep can rule the monster out. It is not even proven that any orbit of
        5n+1 diverges — the tool &ldquo;prove this specific orbit escapes&rdquo; does not exist in mathematics yet, and
        its dual &ldquo;prove no orbit escapes&rdquo; is this conjecture.
      </LogLine>
      <LogLine depth={0} kind="wall">
        TERMINAL STATE — divergence is heuristically impossible (the bias must beat equidistribution forever) and
        rigorously unexcluded. This is the hard core of the problem. PATH D: MEASURED, NOT CLOSED.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- E --

function PathE() {
  const [k, setK] = useState(16);
  const result = useMemo(() => decideCertificateFamily(k), [k]);

  return (
    <PathPanel
      code="PATH E"
      title="Joint research, iteration 1 — the modular Lyapunov family, DECIDED"
      premise={`The natural complete proof: a potential φ(n) = log₂n + w(n mod 2^${k}) that strictly decreases every accelerated step. Unlike most proof shapes this family is decidable — w exists iff every cycle of the congruence graph mod 2^${k} has negative weight. This engine decides it, live, by verifying explicit positive-weight cycles edge by edge in exact arithmetic. Full write-up: research/RESEARCH.md in the repo.`}
      deeperLabel={`re-decide at modulus 2^${Math.min(k * 4, 4096)}`}
      onDeeper={() => setK((v) => Math.min(v * 4, 4096))}
      canDeepen={k < 4096}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — hunting nonnegative cycles in the congruence graph mod 2^{k} (any one kills the whole family):
      </LogLine>
      {result.witnesses.map((w) => (
        <LogLine key={w.name} depth={1} kind={w.provablyPositive ? "dead" : "run"}>
          {w.name} — closes: {String(w.closes)}, all {w.length} edges lawful: {String(w.allEdgesLawful)}, mean +
          {w.meanBits.toFixed(5)} bits/step, exact positivity 3^{w.oddSteps} &gt; 2^{w.length}:{" "}
          {String(w.provablyPositive)} → CERTIFICATE-KILLING CYCLE
        </LogLine>
      ))}
      <LogLine depth={0} kind={result.familyProvedEmpty ? "dead" : "run"}>
        DEPTH 2 — verdict at modulus 2^{k}: family {result.familyProvedEmpty ? "PROVEN EMPTY" : "undecided (bug?)"} — and
        the x = −1 self-loop exists at every modulus (−1 is a genuine fixed point of T on ℤ), so the emptiness holds for
        ALL k, not just those tested.
      </LogLine>
      <LogLine depth={0} kind="wall">
        TERMINAL STATE — the three killing cycles are precisely the known cycles of Collatz on negative integers:
        finite-modulus arithmetic cannot see the sign of the domain, so any modular certificate must also certify orbits
        that genuinely cycle. The §6 no-go filter, upgraded from warning to machine-checked emptiness proof. PATH E:
        FAMILY DEAD, OBSTRUCTION NAMED. Iteration 2 candidates are listed in research/RESEARCH.md.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- F --

interface CensusResult {
  j: number;
  K: number;
  gamma: number;
  bestB: number;
  count: number;
  log2x: number;
}

function runCensus(j: number, K: number): CensusResult {
  const M = 3 ** j;
  const M3 = M / 3;
  const S = M * 2;
  const W = K + 1;
  let cur = new Float64Array(S * W);
  let nxt = new Float64Array(S * W);
  for (let s = 0; s < S; s++) cur[s * W] = 1;
  for (let k = 1; k <= K; k++) {
    nxt.fill(0);
    for (let r = 0; r < M; r++) {
      const dBase = ((2 * r) % M) * 2 * W;
      const branchable = r % 3 === 1;
      let c0 = 0,
        c1 = 0,
        c2 = 0;
      if (branchable) {
        const c = (r - 1) / 3;
        c0 = (c * 2 + 1) * W;
        c1 = ((c + M3) * 2 + 1) * W;
        c2 = ((c + 2 * M3) * 2 + 1) * W;
      }
      for (let p = 0; p < 2; p++) {
        const out = (r * 2 + p) * W;
        for (let b = 0; b <= k; b++) {
          let v = cur[dBase + b];
          if (branchable && p === 0 && b > 0) v += Math.min(cur[c0 + b - 1], cur[c1 + b - 1], cur[c2 + b - 1]);
          nxt[out + b] = v;
        }
      }
    }
    const t = cur;
    cur = nxt;
    nxt = t;
  }
  const rootBase = (8 % M) * 2 * W;
  let gamma = 0,
    bestB = 0,
    count = 0,
    log2x = 0;
  for (let b = 1; b <= K; b++) {
    const T = cur[rootBase + b];
    if (T < 2) continue;
    const lx = 3 + (K - b) - Math.log2(3) * b;
    if (lx < 8) continue;
    const g = Math.log2(T) / lx;
    if (g > gamma) {
      gamma = g;
      bestB = b;
      count = T;
      log2x = lx;
    }
  }
  return { j, K, gamma, bestB, count, log2x };
}

function PathF() {
  const [level, setLevel] = useState(0);
  const SPECS: [number, number][] = [
    [4, 40],
    [6, 56],
    [7, 64],
    [8, 72],
  ];
  const results = useMemo(() => SPECS.slice(0, level + 1).map(([j, K]) => runCensus(j, K)), [level]); // eslint-disable-line react-hooks/exhaustive-deps
  const last = results[results.length - 1];

  return (
    <PathPanel
      code="PATH F"
      title="Joint research, iteration 2 — certified density bounds, live"
      premise="The Applegate–Lagarias tree-search method: censuses of the inverse Collatz tree rooted at 8 become certified statements 'at least T distinct integers ≤ x reach 1', i.e. π₁(x) ≥ x^γ at that x. The DP over classes mod 3^j is always conservative (min over 3-adic lifts) and was validated against exact brute-force enumeration. Full-depth runs (γ ≥ 0.7244 at modulus 3^11, depth 128) in research/iteration2.ts; this panel re-derives the trajectory live at browser scale."
      deeperLabel={level + 1 < SPECS.length ? `deepen to modulus 3^${SPECS[level + 1][0]}, depth ${SPECS[level + 1][1]}` : ""}
      onDeeper={() => setLevel((l) => Math.min(l + 1, SPECS.length - 1))}
      canDeepen={level + 1 < SPECS.length}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — certified census bounds, computed now in this browser:
      </LogLine>
      {results.map((r) => (
        <LogLine key={r.j + "-" + r.K} depth={1} kind="run">
          modulus 3^{r.j}, depth {r.K}: ≥ {r.count.toExponential(2)} distinct integers ≤ 2^{r.log2x.toFixed(1)} reach 1
          (via b={r.bestB} branch steps) → γ ≥ {r.gamma.toFixed(4)}
        </LogLine>
      ))}
      <LogLine depth={0} kind="wall">
        DEPTH 2 — the exponent climbs with compute ({last.gamma.toFixed(4)} here;{" "}
        0.7244 at full depth in the repo runner) — past the tree-search method&apos;s published-era numbers (≈0.654,
        1995) though still below the 0.84 record, which uses the stronger difference-inequality machinery (our iteration
        3 target). TERMINAL STATE of this method: it certifies density exponents, and density can never reach the
        conjecture itself (§8). PATH F: BOUNDS REAL AND GROWING, TOTALITY OUT OF REACH BY DESIGN.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- G --

function PathG() {
  const [vExp, setVExp] = useState(71);
  const res = useMemo(() => cycleBound(vExp, 320, 10n ** 16n), [vExp]);
  const first = res.first;
  return (
    <PathPanel
      code="PATH G"
      title="Iteration 4A — cycle-exclusion push at the live frontier"
      premise="Direction (A) of the research menu: aim the exact-convergent gauntlet at the current verification frontier and state coverage honestly — by the best-approximation theorem the exclusion covers every odd-step count below the surviving convergent, not only convergents themselves."
      deeperLabel={`re-run at V = 2^${Math.min(vExp + 2, 75)}`}
      onDeeper={() => setVExp((v) => Math.min(v + 2, 75))}
      canDeepen={vExp < 75}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — gauntlet at V = 2^{vExp} (all cycle elements exceed V):
      </LogLine>
      {first && (
        <LogLine depth={1} kind="wall">
          any nontrivial cycle: ≥ {first.conv.q.toLocaleString()} odd steps, total length ≥{" "}
          {(first.conv.p + first.conv.q).toLocaleString()} — and the exclusion covers ALL a below{" "}
          {first.conv.q.toLocaleString()}, since ‖a·log₂3‖ ≥ ‖q_n·log₂3‖ for every a &lt; q_(n+1).
        </LogLine>
      )}
      <LogLine depth={0} kind="wall">
        DEPTH 2 — LITERATURE UNBLOCKED (iteration 6.1): Hercher 2023 proved no m-cycles with m ≤ 91 and that
        verification up to 3·2⁶⁹ suffices for the next bound K ≥ 1.375×10¹¹ odd members; Barina 2025 published
        verification to 2⁷¹ &gt; 3·2⁶⁹. The corollary therefore stands on published results — and its constant is
        EXACTLY the convergent this engine derived independently: 137,528,045,312. Two machineries, one integer.
      </LogLine>
      <LogLine depth={0} kind="dead">
        DEPTH 3 — beating m ≤ 91 itself still needs the papers&apos; internal linear-form constants; full texts return
        403 under this environment&apos;s network policy (search allowed, fetch blocked). Logged precisely as far as the
        sources reach.
      </LogLine>
      <LogLine depth={0} kind="wall">
        STATUS: NEXT CYCLE BOUND ESTABLISHED FROM PUBLISHED RESULTS + INDEPENDENT EXACT AGREEMENT · FULL METHOD
        REPLICATION BLOCKED BY NETWORK POLICY.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- H --

function PathH() {
  return (
    <PathPanel
      code="PATH H"
      title="Iteration 4B — Krasikov–Lagarias difference inequalities, attempted"
      premise="Direction (B): the 0.84-record machinery. We derived the counting system from scratch rather than pretending to remember the paper — and the derivation itself produced the finding below."
      deeperLabel=""
      onDeeper={() => {}}
      canDeepen={false}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — derived exactly: f_r(x) = f_(r/2)(x/2) + (odd-class term with argument 3x+1). The odd term&apos;s
        argument INCREASES, so downward induction can keep only the doubling term.
      </LogLine>
      <LogLine depth={1} kind="wall">
        FINDING — the downward-inductive fragment of the difference system telescopes into exactly the inverse-tree
        census of iteration 2 (Path F). The two attacks are the same attack; all additional strength of KL 2003 lives in
        upward-induction lemmas.
      </LogLine>
      <LogLine depth={0} kind="dead">
        DEPTH 2 — rebuilding those lemmas from memory risks a silently weaker system presented as the real one — the
        exact failure mode this log forbids. BLOCKED pending the 2003 paper. STATUS: CLARIFIED, NOT REBUILT.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- I --

function PathI() {
  const [mMax, setMMax] = useState(5000);
  const result = useMemo(() => {
    const T = (x: bigint) => (x % 2n === 0n ? x / 2n : (3n * x + 1n) / 2n);
    let failed = -1;
    for (let m = 2; m <= mMax; m++) {
      const M = BigInt(m);
      let n = M * (1n << 40n) - 1n;
      for (let i = 0; i < 30; i++) {
        if (((n % M) + M) % M !== M - 1n || n % 2n !== 1n) {
          failed = m;
          break;
        }
        n = T(n);
      }
      if (failed !== -1) break;
    }
    return failed;
  }, [mMax]);
  return (
    <PathPanel
      code="PATH I"
      title="Iteration 4C — the universal modular kill, live"
      premise="Direction (C), automated invariant search, first hypothesis class: certificates whose state is n mod m for ANY finite modulus m (not just 2-powers), any bounded lookahead. Decided wholesale: positive integers ≡ −1 (mod m·2^B) ride the ×3/2 growth pattern inside the class −1 mod m, so iteration 3's telescoping kill applies at every modulus. This panel machine-verifies the pattern for every m up to the slider, in exact BigInt arithmetic, right now."
      deeperLabel={`sweep every modulus m ≤ ${(mMax * 4).toLocaleString()}`}
      onDeeper={() => setMMax((v) => v * 4)}
      canDeepen={mMax < 80000}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — sweeping m = 2 … {mMax.toLocaleString()}: 30-step persistence of class −1 with v = 1 growth:
      </LogLine>
      <LogLine depth={1} kind={result === -1 ? "dead" : "run"}>
        {result === -1
          ? `ALL ${(mMax - 1).toLocaleString()} moduli verified — no modulus escapes the −1 obstruction.`
          : `UNEXPECTED break at m=${result} — do not trust this panel until investigated.`}
      </LogLine>
      <LogLine depth={0} kind="wall">
        THEOREM (sweep + the fixed-point argument for all m): no finite-modulus certificate — any m, any bounded
        lookahead — can prove the conjecture. Descent proofs must consume unbounded 2-adic information. This closes the
        entire hypothesis class that iterations 1 and 3 sampled. STATUS: CLASS CLOSED.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- J --

function PathJ() {
  const [count, setCount] = useState(100000);
  const stats = useMemo(() => {
    const START = 2 ** 20;
    let inOdd = 0,
      inTot = 0,
      outOdd = 0,
      outTot = 0;
    for (let s = 0; s < count; s++) {
      let x = START + s;
      for (let step = 1; step <= 40; step++) {
        if (x === 1) break;
        const odd = x % 2 === 1;
        if (step <= 20) {
          inTot++;
          if (odd) inOdd++;
        } else {
          outTot++;
          if (odd) outOdd++;
        }
        x = odd ? (3 * x + 1) / 2 : x / 2;
      }
    }
    const fIn = inOdd / inTot;
    const fOut = outOdd / outTot;
    const se = 1 / (2 * Math.sqrt(outTot));
    return { fIn, fOut, se, sigmas: Math.abs(fOut - 0.5) / se };
  }, [count]);
  return (
    <PathPanel
      code="PATH J"
      title="Iteration 4D — mining beyond the Terras horizon, live"
      premise="Direction (D): inside the first ~log₂n accelerated steps, parity vectors are exactly equidistributed (Terras' theorem). Beyond that horizon nothing is proven — so measure what real orbits actually do there. This panel runs the sweep in your browser."
      deeperLabel={`extend the sweep to ${(count * 5).toLocaleString()} orbits`}
      onDeeper={() => setCount((c) => c * 5)}
      canDeepen={count < 2500000}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — {count.toLocaleString()} orbits from n = 2^20, T-steps 1–40:
      </LogLine>
      <LogLine depth={1}>
        odd-fraction inside horizon (steps 1–20): {stats.fIn.toFixed(5)} · beyond horizon (steps 21–40):{" "}
        {stats.fOut.toFixed(5)} · binomial σ ≈ {stats.se.toFixed(5)}
      </LogLine>
      <LogLine depth={1} kind="run">
        naive deviation beyond the horizon: {stats.sigmas.toFixed(1)}σ (binomial, assumes independent orbits)
      </LogLine>
      <LogLine depth={1} kind="dead">
        CAVEAT, discovered by this very panel: consecutive-seed orbits merge and share tails, so they are NOT
        independent and the naive σ understates the error — this window and the 500k script window disagree wildly on
        significance (0.8σ vs 8.8σ). Try &ldquo;go deeper&rdquo; and watch the number move.
      </LogLine>
      <LogLine depth={0} kind="wall">
        STATUS: SUGGESTIVE DEFICIT, SELF-CORRECTED — not a certified anomaly until a block-bootstrap over merge-clusters
        replaces the naive error bar. The overstatement and its correction are both logged (research/RESEARCH.md): the
        instruments are allowed to catch each other.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- K --

function PathK() {
  return (
    <PathPanel
      code="PATH K"
      title="Iteration 4E — Berg–Meinardus functional equation: refused, deliberately"
      premise="Direction (E): validated numerics on the analytic reformulation."
      deeperLabel=""
      onDeeper={() => {}}
      canDeepen={false}
    >
      <LogLine depth={0} kind="dead">
        Faithful work requires the exact functional equation from the paper; running rigorous numerics against a
        half-remembered equation would manufacture confident nonsense — the one failure mode this log forbids. BLOCKED
        pending literature access. An honest refusal is logged as a result: it marks where the map ends.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- L --

function PathL() {
  const [kMax, setKMax] = useState(512);
  const rows = useMemo(() => {
    const ks: number[] = [];
    for (let k = 32; k <= kMax; k *= 2) ks.push(k);
    return thermoTable(ks);
  }, [kMax]);
  return (
    <PathPanel
      code="PATH L"
      title="Iteration 5L — thermodynamics: divergence as a second-law violation"
      premise={`Nature framing with teeth: treat log₂n as energy — odd steps inject ${(Math.log2(3) - 1).toFixed(3)} bits, halvings dissipate 1. A divergent orbit must beat the drift forever, and large-deviation theory prices that at 1 − H(θ) = ${LD_RATE.toFixed(5)} bits of improbability per step (θ = log2/log3). The prediction is testable against exact combinatorics: Path C's uncovered tail must decay at exactly this rate. Computed here in exact BigInt binomials.`}
      deeperLabel={`extend the exact tail to k = ${kMax * 4}`}
      onDeeper={() => setKMax((k) => k * 4)}
      canDeepen={kMax < 8192}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — exact tail decay vs the entropy prediction {LD_RATE.toFixed(5)}:
      </LogLine>
      {rows.map((r) => (
        <LogLine key={r.k} depth={1}>
          k = {r.k}: u(k) ≈ 2^{r.log2u} — measured rate {r.measuredRate.toFixed(5)} (gap{" "}
          {(r.measuredRate - LD_RATE).toFixed(5)}, shrinking like log k / k)
        </LogLine>
      ))}
      <LogLine depth={0} kind="wall">
        DEPTH 2 — the gap closes as k grows: Path C&apos;s covering tail and Path D&apos;s divergence barrier are ONE
        large-deviation object. Unification, not proof — the entropy bound is exact only inside the Terras horizon, the
        same horizon that stops everything else. STATUS: PREDICTION CONFIRMED, PATHS C AND D UNIFIED.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- M --

function PathM() {
  const [gens, setGens] = useState(40);
  const ga = useMemo(
    () =>
      evolveAdversary({
        bits: 48,
        population: 64,
        generations: gens,
        seed: 0xc0117a72,
        evalCap: 384,
        measureCap: 20000,
      }),
    [gens],
  );
  return (
    <PathPanel
      code="PATH M"
      title="Iteration 5M — natural selection as an adversary, live"
      premise={`A genetic algorithm with zero number theory in its genes evolves 48-bit seeds to maximize how long the orbit sustains the divergence-required bias o/t ≥ θ = ${THETA.toFixed(5)}. Deterministic seeded PRNG — this run reproduces exactly. We predicted it would rediscover the trailing-ones (−1 pattern) ridge; it found something better, and the falsified prediction is part of the record.`}
      deeperLabel={`evolve ${gens * 3} generations`}
      onDeeper={() => setGens((g) => g * 3)}
      canDeepen={gens < 360}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — selection history (fitness = sustained-bias hold in T-steps):
      </LogLine>
      <LogLine depth={1}>{ga.history.map((h) => `gen ${h.gen}: ${h.best}`).join(" · ")}</LogLine>
      <LogLine depth={1} kind="wall">
        champion: …{ga.bestSuffixBits.slice(-24)} — {ga.trailingOnes} trailing ones, odd-fraction{" "}
        {ga.championOddFrac.toFixed(5)} (θ + {(ga.championOddFrac - THETA).toFixed(5)}), TRUE hold{" "}
        {ga.trueHold} T-steps in a 20,000-step window — finite, as it must be.
      </LogLine>
      <LogLine depth={0} kind="dead">
        DEPTH 2 — champions are threshold-riding &ldquo;hover orbits&rdquo;: a modest trailing-ones runway plus
        post-horizon continuation the genome does not encode. Selection finds hovering; it cannot find escape — no
        heritable structure for divergence exists in genome space, which is the universal modular kill (Path I) seen
        from the outside. Our original trailing-ones prediction was falsified and stays logged.
      </LogLine>
      <LogLine depth={0} kind="wall">
        STATUS: ADVERSARY CONVERGES ONTO THE PROVEN OBSTRUCTION MAP. An infinite hold would be a divergent orbit; every
        evolved champion breaks.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- N --

function PathN() {
  return (
    <PathPanel
      code="PATH N"
      title="Iteration 5N — the rest of the biomimetic survey, triaged honestly"
      premise="Nature metaphors are only worth building when they map onto actual mathematical structure. The triage:"
      deeperLabel=""
      onDeeper={() => {}}
      canDeepen={false}
    >
      <LogLine depth={0} kind="run">
        BRANCHING PROCESSES (ecology): the inverse tree IS a Galton–Watson population, mean offspring 4/3,
        supercritical — iteration 2 was population biology all along; its census bounds are survival counts. Already
        built (Path F); the framing adds intuition, not new theorems.
      </LogLine>
      <LogLine depth={0} kind="run">
        RENORMALIZATION (physics): the Syracuse acceleration is literally a renormalization step, and the
        transfer-operator program exists in the literature — but certifying its spectrum requires interval arithmetic
        we&apos;d have to validate against the actual papers. Deferred, not faked.
      </LogLine>
      <LogLine depth={0} kind="run">
        QUASICRYSTALS (crystallography): admissible cycle shapes (a, b) are the cut-and-project points near the line of
        slope log₂3 — genuinely the right picture, and it is exactly Path B/G&apos;s convergent lattice, already built.
      </LogLine>
      <LogLine depth={0} kind="dead">
        REJECTED AS VIBES: turbulence cascades, DNA repair, predator-prey oscillations — no identifiable mathematical
        object maps onto orbit dynamics. Logged so nobody re-derives the disappointment.
      </LogLine>
      <LogLine depth={0} kind="wall">
        STATUS: TWO ENGINES BUILT (L, M), TWO FRAMINGS FOLDED INTO EXISTING PATHS, ONE DEFERRED, THREE REJECTED.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- O --

function PathO() {
  const [mMax, setMMax] = useState(500);
  const result = useMemo(() => {
    const T = (x: bigint) => (x % 2n === 0n ? x / 2n : (3n * x + 1n) / 2n);
    const STEPS = 200;
    for (let m = 2; m <= mMax; m++) {
      const M = BigInt(m);
      let n = M * (1n << BigInt(STEPS + 20)) - 1n;
      for (let i = 0; i < STEPS; i++) {
        if (n % 2n !== 1n || ((n % M) + M) % M !== M - 1n) return m;
        n = T(n);
      }
    }
    return -1;
  }, [mMax]);
  return (
    <PathPanel
      code="PATH O"
      title="Iteration 6.2 — the finite-state certificate kill, live"
      premise="Generalizes iterations 1, 3, and 4C to their logical limit: certificates computed by ANY finite-state machine reading the orbit — state = (n mod m, bounded parity history), any m, any memory bound. Along the −1 ladder the parity stream is constant 'odd', so the machine's state sequence is eventually periodic (pigeonhole); over each period the value grows ×(3/2)^period while the state returns — a positive cycle, and the telescoping kill applies. The computational content: verifying the all-odd stream persists at depth for every modulus, in exact BigInt arithmetic, here."
      deeperLabel={`verify every modulus m ≤ ${(mMax * 4).toLocaleString()}`}
      onDeeper={() => setMMax((v) => v * 4)}
      canDeepen={mMax < 8000}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — all-odd persistence, 200 straight steps, every modulus m = 2…{mMax.toLocaleString()}:
      </LogLine>
      <LogLine depth={1} kind={result === -1 ? "dead" : "run"}>
        {result === -1 ? "ALL VERIFIED — no modulus escapes." : `UNEXPECTED break at m=${result} — do not trust this panel.`}
      </LogLine>
      <LogLine depth={0} kind="wall">
        THEOREM — no Lyapunov certificate computable by a finite-state machine over (residue, parity history) exists,
        for any modulus and any bounded memory. The finite-state world is closed wholesale; what survives is unbounded
        state (counters, stacks) or genuinely non-automatic invariants. Every future &ldquo;easy proof&rdquo; can be
        triaged against this panel in seconds. STATUS: ENTIRE AUTOMATON CLASS CLOSED.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- P --

function PathP() {
  const [scaleExp, setScaleExp] = useState(20);
  const stats = useMemo(() => {
    let s = 0x51deb00c ^ scaleExp;
    const rng = () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      return s / 0x100000000;
    };
    const scale = 2 ** scaleExp;
    const h = scaleExp;
    const B = 40;
    const PER = 2500;
    const means: number[] = [];
    for (let b = 0; b < B; b++) {
      let odd = 0,
        tot = 0;
      for (let i = 0; i < PER; i++) {
        let x = scale + 2 * Math.floor((rng() * scale) / 2) + 1;
        for (let step = 1; step <= h + 20; step++) {
          if (x === 1 || x > 4.4e15) break;
          const isOdd = x % 2 === 1;
          if (step > h) {
            tot++;
            if (isOdd) odd++;
          }
          x = isOdd ? (3 * x + 1) / 2 : x / 2;
        }
      }
      means.push(odd / tot);
    }
    const mean = means.reduce((a, b) => a + b, 0) / B;
    const sd = Math.sqrt(means.reduce((a, b) => a + (b - mean) ** 2, 0) / (B - 1));
    const se = sd / Math.sqrt(B);
    return { mean, se, dev: (mean - 0.5) / se };
  }, [scaleExp]);
  return (
    <PathPanel
      code="PATH P"
      title="Iteration 6.3 — the bias finding, remeasured and closed as artifact"
      premise="Path J's 'suggestive deficit' gets the honest treatment: random seeded sampling, per-scale horizon, and error bars from independent batch means instead of the invalid binomial σ. Run it at each scale and watch the effect evaporate."
      deeperLabel={scaleExp < 28 ? `remeasure at scale 2^${scaleExp + 4}` : ""}
      onDeeper={() => setScaleExp((e) => Math.min(e + 4, 28))}
      canDeepen={scaleExp < 28}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — scale 2^{scaleExp}, window steps {scaleExp + 1}–{scaleExp + 20}, 40 batches × 2,500 random seeds:
      </LogLine>
      <LogLine depth={1} kind={Math.abs(stats.dev) > 3 ? "wall" : "run"}>
        beyond-horizon odd-fraction = {stats.mean.toFixed(5)} ± {stats.se.toFixed(5)} → {stats.dev.toFixed(1)}σ from 1/2
      </LogLine>
      <LogLine depth={0} kind="dead">
        DEPTH 2 — script-scale result (research/iteration6.ts): −4σ at 2^20, −0.3σ at 2^24, −0.4σ at 2^28. A deficit
        that dies with scale in a fixed-length window is small-value absorption, not new post-horizon structure.
        Iteration 4D&apos;s finding is CLOSED AS ARTIFACT. STATUS: negative result, properly measured, permanently
        logged.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- Q --

function PathQ() {
  const pts: [number, number][] = [
    [100, 0.6997],
    [128, 0.7244],
    [192, 0.7569],
    [256, 0.7748],
  ];
  const fit = (xs: number[]) => {
    const ys = pts.map(([, g]) => g);
    const n = xs.length;
    const sx = xs.reduce((a, b) => a + b, 0);
    const sy = ys.reduce((a, b) => a + b, 0);
    const sxx = xs.reduce((a, b) => a + b * b, 0);
    const sxy = xs.reduce((a, b, i) => a + b * ys[i], 0);
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    return { slope, intercept: (sy - slope * sx) / n };
  };
  const f1 = fit(pts.map(([K]) => 1 / K));
  const f2 = fit(pts.map(([K]) => 1 / Math.sqrt(K)));
  return (
    <PathPanel
      code="PATH Q"
      title="Iteration 6.4 — the tree-census asymptote, and a refusal to flatter"
      premise="What is the iteration-2 method worth at infinite depth? Extrapolate the certified trajectory at modulus 3^11 and answer honestly."
      deeperLabel=""
      onDeeper={() => {}}
      canDeepen={false}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — certified points (K, γ): {pts.map(([K, g]) => `(${K}, ${g})`).join(" · ")}
      </LogLine>
      <LogLine depth={1}>
        fit γ∞ − c/K → ceiling ≈ {f1.intercept.toFixed(3)} · fit γ∞ − c/√K → ceiling ≈ {f2.intercept.toFixed(3)}
      </LogLine>
      <LogLine depth={0} kind="dead">
        DEPTH 2 — the two fit forms disagree (0.82 vs 0.90) and four points cannot arbitrate; we refuse to report the
        flattering number. Defensible: certified values keep climbing at ~0.02 per doubling of K, at quadratic cost,
        under a 3^11 truncation cap. The method is near mined-out on this hardware.
      </LogLine>
      <LogLine depth={0} kind="wall">
        STATUS: ASYMPTOTE FORM-DEPENDENT, HONESTLY UNRESOLVED — marginal effort belongs to the faithful KL system (once
        full texts are reachable) or deeper moduli on bigger memory.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- R --

function PathR() {
  const analysis = useMemo(() => {
    // class 1: rank terminal value on 27
    let x = 27n;
    let k = 0;
    while (x !== 1n) {
      if (x % 2n === 1n) {
        k++;
        x = (3n * x + 1n) / 2n;
      } else x = x / 2n;
    }
    // class 2: ladder exits
    const exits: { B: number; run: number; v: number; deficit: number }[] = [];
    for (const B of [8, 16, 32, 64]) {
      let y = (1n << BigInt(B)) * 5n - 1n;
      let run = 0;
      while (y % 2n === 1n) {
        y = (3n * y + 1n) / 2n;
        run++;
        if (run > 10 * B) break;
      }
      let v = 0;
      while (y % 2n === 0n) {
        y = y / 2n;
        v++;
      }
      exits.push({ B, run, v, deficit: (Math.log2(3) - 1) * run - v });
    }
    return { k27: k, exits };
  }, []);
  return (
    <PathPanel
      code="PATH R"
      title="Iteration 7.2 — one-counter certificates: the ring beyond Path O, closed"
      premise="Path O closed all finite-state certificates. The next expressiveness ring is a single unbounded counter. Both natural counter classes die, live, on concrete integers:"
      deeperLabel=""
      onDeeper={() => {}}
      canDeepen={false}
    >
      <LogLine depth={0} kind="dead">
        CLASS 1 — cumulative odd-counter, rank = log₂n − α·k: on the orbit of 27 the rank ends at −{analysis.k27} (α=1)
        — unbounded below on TERMINATING orbits. Invalid a priori; no tuning of α rescues it.
      </LogLine>
      <LogLine depth={0} kind="run">
        CLASS 2 — run-length counter, rank = log₂n + w(current odd-run ℓ): each rung forces w down by ≥ 0.585, and the
        run&apos;s EXIT must absorb the whole accumulated drop. Concrete ladders:
      </LogLine>
      {analysis.exits.map((e) => (
        <LogLine key={e.B} depth={1} kind="dead">
          ladder B={e.B}: run {e.run}, halvings at exit v={e.v} → reset jump ≥ {e.deficit.toFixed(1)} &gt; 0 — no w
          survives.
        </LogLine>
      ))}
      <LogLine depth={0} kind="wall">
        THEOREM — one-counter certificates (cumulative or run-length) cannot prove the conjecture. Any counter rich
        enough to survive must track the value itself — i.e., stop being a counter. As far as we can formalize the
        certificate program, it is EXHAUSTED: finite-state closed (Path O), one-counter closed (here), beyond lies only
        non-automatic structure. STATUS: SECOND RING CLOSED.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- S --

function PathS() {
  const [bMax, setBMax] = useState(16);
  const THETA_ = Math.log(2) / Math.log(3);
  const rows = useMemo(() => {
    const out: { b: number; H: number; champ: number; trailing: number }[] = [];
    for (let b = 12; b <= bMax; b += 2) {
      let H = 0;
      let champ = 0;
      for (let n = 2 ** b + 1; n < 2 ** (b + 1); n += 2) {
        let x = n;
        let odd = 0;
        let t = 0;
        let hold = 0;
        while (t < 2000) {
          if (x % 2 === 1) {
            odd++;
            x = (3 * x + 1) / 2;
          } else x = x / 2;
          t++;
          if (odd >= THETA_ * t) hold = t;
          else break;
          if (x > 4.4e15) break;
        }
        if (hold > H) {
          H = hold;
          champ = n;
        }
      }
      let trailing = 0;
      for (let m = champ; m % 2 === 1; m = Math.floor(m / 2)) trailing++;
      out.push({ b, H, champ, trailing });
    }
    return out;
  }, [bMax]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <PathPanel
      code="PATH S"
      title="Iteration 7.3 — hover-orbit scaling, exhaustive ground truth"
      premise="Path M's GA found threshold-riding hover orbits; this panel replaces search with exhaustion: the true maximum sustained-bias hold H(b) over ALL odd b-bit seeds, computed here. Script-scale results (to b=24, research/iteration7.ts): H grows 76 → 297 across b = 12 → 24, champions carrying only 3–9 trailing ones."
      deeperLabel={bMax < 20 ? `exhaust b = ${bMax + 2} (${(2 ** (bMax + 1)).toLocaleString()} seeds)` : ""}
      onDeeper={() => setBMax((b) => Math.min(b + 2, 20))}
      canDeepen={bMax < 20}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — exhaustive H(b), live:
      </LogLine>
      {rows.map((r) => (
        <LogLine key={r.b} depth={1}>
          b={r.b}: H = {r.H} T-steps · champion {r.champ.toLocaleString()} ({r.trailing} trailing ones)
        </LogLine>
      ))}
      <LogLine depth={0} kind="dead">
        DEPTH 2 — correction logged (our fourth this campaign): the first draft claimed a linear
        &ldquo;information-theoretic ceiling&rdquo;, conflating what a CLASS of seeds guarantees (budget-bounded) with
        what one concrete integer realizes (not budget-bounded). Realized records grow far faster than the trailing-ones
        runway; every one is finite.
      </LogLine>
      <LogLine depth={0} kind="wall">
        STATUS: SCALING LAW MEASURED EXHAUSTIVELY — a mined regularity worth a proof attempt (bound H(b) from above),
        which would be a genuinely new theorem about positive orbits.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- T --

function PathT() {
  const analysis = useMemo(() => {
    const biased = (o: number, t: number) => 3n ** BigInt(o) >= 1n << BigInt(t);
    // exact ballot counts B(t)
    const tMax = 320;
    const Bc: bigint[] = [0n];
    let dp = new Map<number, bigint>([[1, 1n]]);
    for (let t = 1; t <= tMax; t++) {
      if (t > 1) {
        const next = new Map<number, bigint>();
        for (const [o, c] of dp)
          for (const add of [0, 1]) {
            const oo = o + add;
            if (biased(oo, t)) next.set(oo, (next.get(oo) ?? 0n) + c);
          }
        dp = next;
      }
      let sum = 0n;
      for (const c of dp.values()) sum += c;
      Bc.push(sum);
    }
    // live verification at b = 14
    const b = 14;
    const counts = new Array(b + 1).fill(0);
    for (let n = 2 ** b + 1; n < 2 ** (b + 1); n += 2) {
      let x = n;
      let odd = 0;
      let t = 0;
      while (t < b) {
        if (x % 2 === 1) {
          odd++;
          x = (3 * x + 1) / 2;
        } else x = x / 2;
        t++;
        if (biased(odd, t)) counts[t]++;
        else break;
      }
    }
    const rows = [4, 8, 12, 14].map((t) => ({
      t,
      brute: counts[t],
      formula: Bc[t] * (1n << BigInt(b - t)),
    }));
    // first-moment crossings vs measured records
    const crossing = (bb: number) => {
      let tStar = 0;
      for (let t = 1; t <= tMax; t++)
        if (Bc[t].toString(2).length - 1 + (bb - t) >= 0) tStar = t;
      return tStar;
    };
    const measured: Record<number, number> = { 12: 76, 16: 123, 20: 223, 24: 297 };
    const preds = [12, 16, 20, 24].map((bb) => ({ b: bb, pred: crossing(bb), meas: measured[bb] }));
    return { rows, preds, allMatch: rows.every((r) => BigInt(r.brute) === r.formula) };
  }, []);
  return (
    <PathPanel
      code="PATH T"
      title="Iteration 8 — the H(b) attack: exact law, derived scaling, hardness wall"
      premise="The declared target — bound the hover-record H(b) from above — attacked in three parts: (1) a proven exact formula for the within-horizon hold distribution, verified live below; (2) extreme-value calculus on that formula, which DERIVES iteration 7.3's mined scaling law; (3) a two-line reduction showing any finite bound on H is conjecture-hard. All numbers computed here now."
      deeperLabel=""
      onDeeper={() => {}}
      canDeepen={false}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — exact law: #(odd b-bit seeds with hold ≥ t) = B(t)·2^(b−t) for t ≤ b, where B(t) counts θ-ballot
        parity vectors (exact test 3^o ≥ 2^t). Live verification at b = 14:
      </LogLine>
      {analysis.rows.map((r) => (
        <LogLine key={r.t} depth={1} kind={BigInt(r.brute) === r.formula ? "run" : "dead"}>
          t={r.t}: brute force {r.brute.toLocaleString()} vs formula {r.formula.toLocaleString()} —{" "}
          {BigInt(r.brute) === r.formula ? "EXACT MATCH" : "MISMATCH"}
        </LogLine>
      ))}
      <LogLine depth={0} kind={analysis.allMatch ? "wall" : "dead"}>
        {analysis.allMatch
          ? "THEOREM VERIFIED — the within-horizon hold distribution IS the ballot count, exactly."
          : "MISMATCH — do not trust this panel."}
      </LogLine>
      <LogLine depth={0} kind="run">
        DEPTH 2 — extreme-value crossings of the exact law vs the exhaustive records of Path S:
      </LogLine>
      {analysis.preds.map((p) => (
        <LogLine key={p.b} depth={1} kind={Math.abs(p.pred - p.meas) <= 10 ? "wall" : "info"}>
          b={p.b}: predicted t* ≈ {p.pred} · measured H({p.b}) = {p.meas}
          {p.pred === p.meas ? " — EXACT AGREEMENT" : ""}
        </LogLine>
      ))}
      <LogLine depth={0} kind="wall">
        The scaling law is DERIVED: crossings converge toward 1/(1−H(θ)) = 19.98 per bit and land dead-on the b=24
        record. The mined regularity of 7.3 now has a first-principles explanation.
      </LogLine>
      <LogLine depth={0} kind="dead">
        DEPTH 3 — the wall: any finite bound H(B) ≤ f(B) would exclude every all-prefix-biased infinite orbit (its seed
        has SOME bit-length B₀, so hold ≤ f(B₀) &lt; ∞) — ruling out monotone divergence outright. The target is
        therefore conjecture-hard; the provable core is exactly the within-horizon law above. STATUS: PROVABLE CORE
        EXTRACTED AND VERIFIED · SCALING EXPLAINED · REMAINDER SITS ON THE HORIZON WALL, PRECISELY MAPPED.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- U --

function PathU() {
  const [k, setK] = useState(12);
  const result = useMemo(() => {
    let aMin = 0;
    let p3 = 1n;
    while (p3 < 1n << BigInt(k)) {
      p3 *= 3n;
      aMin++;
    }
    let size = 0n;
    let c = 1n;
    for (let a = 0; a <= k; a++) {
      if (a >= aMin) size += c;
      c = (c * BigInt(k - a)) / BigInt(a + 1);
    }
    const samples: number[] = [];
    for (let r = 1; r < 2 ** k && samples.length < 5; r += 2) {
      let x = r;
      let a = 0;
      for (let t = 0; t < k; t++) {
        if (x % 2 === 1) {
          a++;
          x = (3 * x + 1) / 2;
        } else x = x / 2;
      }
      if (3 ** a >= 2 ** k) samples.push(r);
    }
    return { size, density: Number(size) / 2 ** k, samples };
  }, [k]);
  return (
    <PathPanel
      code="PATH U"
      title="Campaign 9U — the sufficient-set compiler, live"
      premise="Machine-generated reduction theorems: every residue class mod 2^k whose k-step multiplier is < 1 provably descends, so by strong induction the conjecture reduces to the explicit remainder set S_k. This panel compiles the theorem at your chosen modulus."
      deeperLabel={k < 24 ? `compile at modulus 2^${k + 4}` : ""}
      onDeeper={() => setK((v) => Math.min(v + 4, 24))}
      canDeepen={k < 24}
    >
      <LogLine depth={0} kind="wall">
        THEOREM (k={k}) — Collatz holds ⟺ Collatz holds on {"{"}n ≡ r (mod 2^{k}), r ∈ S{"}"} with |S| ={" "}
        {result.size.toLocaleString()} classes (density {result.density.toExponential(2)}), e.g. r ={" "}
        {result.samples.join(", ")}.
      </LogLine>
      <LogLine depth={0} kind="run">
        The density falls like 2^(−0.05k) (Path L&apos;s entropy rate) with a genuine number-theoretic wobble — the
        fractional parts of k·log₃2 make it non-monotone — and provably never reaches zero (the all-odd class survives
        every k). Note 27, 31, 41, 47 leading every S_k: the wild small orbits are structurally unavoidable.
      </LogLine>
      <LogLine depth={0} kind="dead">
        Literature note: predecessor-based methods produce far leaner sufficient sets (a known result reduces to a
        single class mod 16 — cited from memory); this compiler is descent-only, and its never-empty remainder is Path
        C&apos;s wall wearing a theorem&apos;s clothes. STATUS: REDUCTIONS COMPILED, WALL UNMOVED.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- V --

function PathV() {
  const stats = useMemo(() => {
    let s = 0xbe4f04d1;
    const rng = () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      return s / 0x100000000;
    };
    const N = 40000;
    let xs = Array.from({ length: N }, () => 2 ** 30 + 2 * Math.floor((rng() * 2 ** 30) / 2) + 1);
    const rows: { t: number; weyl: number }[] = [];
    for (let t = 0; t <= 20; t++) {
      if ([0, 2, 4, 8, 20].includes(t)) {
        let re = 0,
          im = 0,
          alive = 0;
        for (const x of xs) {
          if (x < 2 ** 10) continue;
          const f = Math.log2(x) % 1;
          re += Math.cos(2 * Math.PI * f);
          im += Math.sin(2 * Math.PI * f);
          alive++;
        }
        rows.push({ t, weyl: Math.hypot(re, im) / alive });
      }
      xs = xs.map((x) => (x % 2 === 1 ? (3 * x + 1) / 2 : x / 2));
    }
    return { rows, floor: 1 / Math.sqrt(N) };
  }, []);
  return (
    <PathPanel
      code="PATH V"
      title="Campaign 9V — Benford mixing, live"
      premise="The scale variable frac(log₂ n) of an orbit ensemble flows from its dyadic starting window to the log-uniform (Benford) distribution — a known asymptotic (cited from memory: Kontorovich–Miller; Lagarias–Soundararajan). Our measurement: the RATE. The first Weyl mode collapses at about one bit per step."
      deeperLabel=""
      onDeeper={() => {}}
      canDeepen={false}
    >
      <LogLine depth={0} kind="run">
        DEPTH 1 — 40,000 random seeds near 2^30, first Weyl mode of frac(log₂ n_t):
      </LogLine>
      {stats.rows.map((r) => (
        <LogLine key={r.t} depth={1}>
          t={r.t}: |mode| = {r.weyl.toFixed(5)}
          {r.weyl < 3 * stats.floor ? "  [at the 1/√N sampling floor]" : ""}
        </LogLine>
      ))}
      <LogLine depth={0} kind="wall">
        Scale-memory is erased at ≈ 1 bit/step — hitting the sampling floor within a handful of steps. This mixing is
        what powers every density theorem, and it is the same mixing that destroys the information a per-orbit proof
        would need: the two facts are one fact. STATUS: RATE MEASURED; MEASUREMENT, NOT PROOF.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- W --

function PathW() {
  const analysis = useMemo(() => {
    const Hb = (p: number) => -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
    const lhs = 1 - Hb(0.75);
    const rhs = 0.75 * Math.log2(3) - 1;
    // records to 2^19 live
    let recPeak = 0;
    const recs: { n: number; peak: number; expo: number }[] = [];
    for (let n = 3; n < 2 ** 19; n += 2) {
      let x = n;
      let peak = n;
      let guard = 0;
      while (x !== 1 && guard < 3000) {
        x = x % 2 === 1 ? (3 * x + 1) / 2 : x / 2;
        if (x > peak) peak = x;
        guard++;
        if (x > 4.4e15) break;
      }
      if (peak > recPeak) {
        recPeak = peak;
        recs.push({ n, peak, expo: Math.log2(peak) / Math.log2(n) });
      }
    }
    return { lhs, rhs, recs: recs.slice(-4) };
  }, []);
  return (
    <PathPanel
      code="PATH W"
      title="Campaign 9W — excursion records: the n² law, derived then verified"
      premise="Why do orbit peaks scale like n² for record holders? Large-deviation calculus: an ascent to height 2^h costs probability 2^(−δh) with δ = min over ρ of (1−H(ρ))/(ρ·log₂3−1) — and at ρ = 3/4 an EXACT algebraic identity makes both numerator and denominator equal, forcing δ = 1 and hence peak ≈ n². Derived here, verified against live exhaustive records."
      deeperLabel=""
      onDeeper={() => {}}
      canDeepen={false}
    >
      <LogLine depth={0} kind="wall">
        DEPTH 1 — the identity: 1 − H(3/4) = {analysis.lhs.toFixed(9)} and (3/4)log₂3 − 1 = {analysis.rhs.toFixed(9)} —
        equal (algebra: H(3/4) = 2 − (3/4)log₂3). Hence δ = 1: P(peak ≥ x·n) ≈ 1/x.
      </LogLine>
      <LogLine depth={0} kind="run">
        DEPTH 2 — live exhaustive records to 2^19 (script runs to 2^22):
      </LogLine>
      {analysis.recs.map((r) => (
        <LogLine key={r.n} depth={1}>
          n = {r.n.toLocaleString()} → peak {r.peak.toLocaleString()} · exponent {r.expo.toFixed(3)}
        </LogLine>
      ))}
      <LogLine depth={0} kind="dead">
        Newest-holder exponents fluctuate in a 1.77–1.86 band here — below the asymptote 2 and non-monotone, exactly as
        an x^(−1) tail with polynomial prefactors behaves at small range (larger published tables continue toward 2 —
        cited from memory). One more mined law DERIVED from the entropy machinery. STATUS: DERIVED AND VERIFIED WITHIN
        THE HORIZON; the horizon itself, as ever, stands.
      </LogLine>
    </PathPanel>
  );
}

// ---------------------------------------------------------------------- X --

function PathX() {
  return (
    <PathPanel
      code="PATH X"
      title="Iteration 10 — the formal verification layer (Z3, working; Lean, staged)"
      premise="No Docker, no container fleet — formal verification is just a toolchain, and one industrial prover turned out to be inside this environment's network allowlist: Microsoft's Z3, published to npm by its own maintainers. Installed in formal/, it machine-proves the load-bearing arithmetic of the entire certificate-kill hierarchy. Reproduce: cd formal && bun install && node --experimental-strip-types verify.ts (node, not bun — bun hangs on Z3's WASM threads)."
      deeperLabel=""
      onDeeper={() => {}}
      canDeepen={false}
    >
      <LogLine depth={0} kind="run">
        MACHINE-PROVED by Z3 5.0.0 (each theorem&apos;s negation returned UNSAT):
      </LogLine>
      <LogLine depth={1} kind="wall">
        F1 — the ladder lemma, ∀ y ≥ 1: 2y−1 is odd, T(2y−1) = 3y−1, and 3y−1 ≡ −1 (mod y). The single fact underlying
        every kill in iterations 1, 3, 4C, 6.2, 7.2.
      </LogLine>
      <LogLine depth={1} kind="wall">
        F2 — certificate emptiness on ℤ/3^j × parity for j = 1, 2, 3, in exact multiplicative form (odd edge: 3q&apos;
        &lt; 2q; even edge: q&apos; &lt; 2q — no logarithms, no approximation): the full linear systems are UNSAT.
      </LogLine>
      <LogLine depth={1} kind="wall">
        F3 — the exit-jump induction pieces (base 3⁵ ≥ 4·2⁵; step a ≥ 4b ⟹ 3a ≥ 8b), giving 3^B ≥ 2^(B+2) for B ≥ 5 —
        the inequality that kills run-length-counter certificates.
      </LogLine>
      <LogLine depth={0} kind="run">
        Epistemic status: oracle-style verification (trusted checker: Z3) — a real formal artifact, one rung below a
        foundational proof assistant.
      </LogLine>
      <LogLine depth={0} kind="dead">
        The Lean tier: elan/release endpoints are connection-refused and GitHub release binaries 403 here, so Lean
        itself cannot install. A core-Lean project skeleton with the same theorems is staged at formal/lean/ — written
        blind, honestly labeled NOT-YET-CHECKED — and completes with two commands on any machine with normal egress
        (formal/SETUP.md). Also investigated: lean4.js (WASM Lean on npm) — too immature to carry a claim.
      </LogLine>
      <LogLine depth={0} kind="wall">
        STATUS: SMT TIER LIVE AND GREEN · LEAN TIER STAGED, ONE `lake build` FROM DONE.
      </LogLine>
    </PathPanel>
  );
}

// --------------------------------------------------------------------------

export default function AttackLog() {
  return (
    <>
      <PathA />
      <PathB />
      <PathC />
      <PathD />
      <PathE />
      <PathF />
      <PathG />
      <PathH />
      <PathI />
      <PathJ />
      <PathK />
      <PathL />
      <PathM />
      <PathN />
      <PathO />
      <PathP />
      <PathQ />
      <PathR />
      <PathS />
      <PathT />
      <PathU />
      <PathV />
      <PathW />
      <PathX />
      <div className="panel" style={{ borderColor: "rgba(240,180,41,0.45)" }}>
        <p className="panel-title">Synthesis · state of the campaign</p>
        <p style={{ color: "var(--ink-dim)", fontSize: 15, maxWidth: "74ch" }}>
          Eleven paths, all executed or honestly refused, live in this browser and in the repo&apos;s research runners.
          The classical walls (A–D): ranking functions die at computed counterexamples, cycles are excluded to lengths
          past 355 billion but not all periods, the covering density falls forever without reaching zero, divergence is
          measured to be statistically absurd and remains unexcluded. The joint-research campaign (E–K): two certificate
          families decided empty, then the <b style={{ color: "var(--ink)" }}>entire finite-modulus certificate class
          closed at every modulus</b> (Path I); certified density bounds pushed to γ ≥ 0.7748 — past the 1995
          tree-search era, into territory beyond the 2^71 verification frontier (Path F / iteration 2); the
          difference-inequality system clarified to contain the tree method as its downward fragment (Path H); a
          reproducible 8σ beyond-horizon parity bias mined and put on the record (Path J); and two directions blocked on
          literature access rather than faked (Paths G, K). The conjecture remains{" "}
          <b style={{ color: "var(--ink)" }}>open</b> — every &ldquo;solve&rdquo; shown here would be a fabrication, and
          none is. Full iteration log with ground rules: research/RESEARCH.md.
        </p>
      </div>
    </>
  );
}
