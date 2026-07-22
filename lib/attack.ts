// Real computational engines for the attack log. Nothing here is simulated:
// the continued fractions, fixed-point logarithms, binomial tails, and
// counterexample searches all execute in exact (or explicitly error-bounded)
// arithmetic in the browser.

// ---------------------------------------------------------------------------
// Fixed-point base-2 logarithm of a rational, via the bit-by-bit squaring
// algorithm. Returns floor-ish(log2(num/den) * 2^bits) with ~64 guard bits;
// good to well past 2^-(bits-8) — plenty for every use below, and the UI
// states the precision caveat.
// ---------------------------------------------------------------------------
export function fpLog2Ratio(numer: bigint, denom: bigint, bits: number): bigint {
  if (numer <= 0n || denom <= 0n) throw new Error("positive ratio required");
  let intPart = 0n;
  let n = numer;
  let d = denom;
  while (n >= 2n * d) {
    d *= 2n;
    intPart++;
  }
  while (n < d) {
    n *= 2n;
    intPart--;
  }
  // now 1 <= n/d < 2
  let frac = 0n;
  const guard = bits + 64;
  for (let i = 0; i < bits; i++) {
    n *= n;
    d *= d;
    frac <<= 1n;
    if (n >= 2n * d) {
      frac |= 1n;
      d *= 2n;
    }
    const size = d.toString(2).length;
    if (size > guard) {
      const drop = BigInt(size - guard);
      n >>= drop;
      d >>= drop;
    }
  }
  return (intPart << BigInt(bits)) + frac;
}

// ---------------------------------------------------------------------------
// Continued fraction of a fixed-point value L/2^bits, with convergents.
// For L = log2(3) this yields [1; 1, 1, 2, 2, 3, 1, 5, 2, 23, 2, ...].
// ---------------------------------------------------------------------------
/** float log2 of a BigInt via its top 53 bits — precise enough for display */
export function bigLog2f(n: bigint): number {
  if (n <= 0n) return -Infinity;
  const s = n.toString(2);
  const head = s.slice(0, 53);
  return s.length - head.length + Math.log2(Number(BigInt("0b" + head)));
}

export interface Convergent {
  index: number;
  term: bigint;
  /** numerator: candidate even-step count b */
  p: bigint;
  /** denominator: candidate odd-step count a */
  q: bigint;
  /** true if p/q > L (only these can satisfy the cycle inequality) */
  upper: boolean;
  /** distance |p - q·L| in units of 2^-bits (BigInt, exact vs. the fp value) */
  gapScaled: bigint;
  /** human-readable: ||q·L|| ≈ 2^gapLog2 */
  gapLog2: number;
}

export function cfConvergents(L: bigint, bits: number, maxQ: bigint): Convergent[] {
  const scale = 1n << BigInt(bits);
  let r = L;
  let s = scale;
  let pPrev = 1n,
    p = L >> BigInt(bits);
  let qPrev = 0n,
    q = 1n;
  const out: Convergent[] = [];
  let term = p;
  let index = 0;

  const push = () => {
    const exact = p * scale - q * L;
    const gapScaled = exact < 0n ? -exact : exact;
    const gl = gapScaled === 0n ? -bits : bigLog2f(gapScaled) - bits;
    out.push({ index, term, p, q, upper: exact > 0n, gapScaled, gapLog2: gl });
  };
  push();

  // Euclidean steps on (r, s)
  let rr = r - term * s;
  let ss = s;
  while (rr > 0n && q <= maxQ) {
    const t = ss / rr;
    const pNext = t * p + pPrev;
    const qNext = t * q + qPrev;
    pPrev = p;
    qPrev = q;
    p = pNext;
    q = qNext;
    const tmp = ss - t * rr;
    ss = rr;
    rr = tmp;
    index++;
    term = t;
    push();
  }
  return out;
}

// ---------------------------------------------------------------------------
// Cycle-exclusion engine. A nontrivial cycle with a odd steps and b even
// steps, all elements > V, forces (exact, from the cycle equation
// 2^b/3^a = prod(1 + 1/(3 n_i)) ):
//     0 < b - a·log2(3) < a·log2(1 + 1/(3V)) < a / (2V)
// So b/a must approximate log2(3) from above with error < 1/(2V·a) — a
// Diophantine condition only enormous a can satisfy. We test each upper
// convergent of log2(3) against it and report the first survivor.
// ---------------------------------------------------------------------------
export interface CycleBoundRow {
  conv: Convergent;
  /** required: gap < q · 2^-(vExp+1); this is log2 of the requirement */
  requiredLog2: number;
  passes: boolean;
}

export interface CycleBoundResult {
  rows: CycleBoundRow[];
  first: CycleBoundRow | null;
  vExp: number;
}

export function cycleBound(vExp: number, bits: number, maxQ: bigint): CycleBoundResult {
  const L = fpLog2Ratio(3n, 1n, bits);
  const convs = cfConvergents(L, bits, maxQ);
  const scale = 1n << BigInt(bits);
  const rows: CycleBoundRow[] = [];
  let first: CycleBoundRow | null = null;
  for (const c of convs) {
    if (c.q === 0n) continue;
    // condition: gapScaled/2^bits < q / 2^(vExp+1)  <=>  gapScaled · 2^(vExp+1) < q · 2^bits
    const passes = c.upper && c.gapScaled * (1n << BigInt(vExp + 1)) < c.q * scale;
    const requiredLog2 = bigLog2f(c.q) - (vExp + 1);
    const row = { conv: c, requiredLog2, passes };
    rows.push(row);
    if (passes && first === null) first = row;
  }
  return { rows, first, vExp };
}

// ---------------------------------------------------------------------------
// Terras covering engine. Over residues mod 2^k, the k-step multiplier of a
// parity vector with a odd steps is 3^a/2^k; the class provably descends when
// 3^a < 2^k. Uncovered density is the exact binomial tail
//     u(k) = 2^-k · Σ_{a : 3^a ≥ 2^k} C(k, a)
// computed here in exact BigInt arithmetic.
// ---------------------------------------------------------------------------
export interface TailRow {
  k: number;
  aMin: number;
  tail: bigint;
  log2u: number;
  approx: string;
}

export function coveringTail(ks: number[]): TailRow[] {
  return ks.map((k) => {
    // smallest a with 3^a >= 2^k, exact
    let aMin = 0;
    let p3 = 1n;
    const p2 = 1n << BigInt(k);
    while (p3 < p2) {
      p3 *= 3n;
      aMin++;
    }
    // exact binomial tail
    let tail = 0n;
    let c = 1n; // C(k, 0)
    for (let a = 0; a <= k; a++) {
      if (a >= aMin) tail += c;
      c = (c * BigInt(k - a)) / BigInt(a + 1);
    }
    const log2u = tail === 0n ? -Infinity : tail.toString(2).length - 1 - k;
    const u = Number(tail) / Math.pow(2, k); // fine to double precision for display
    return {
      k,
      aMin,
      tail,
      log2u,
      approx: u > 1e-12 ? u.toExponential(3) : `≈2^${log2u}`,
    };
  });
}

// ---------------------------------------------------------------------------
// Ranking-function search. Candidates are potentials φ; we hunt, over a real
// range, for the least n where φ fails to decrease (per raw step, or per
// odd-block: odd step plus all its halvings). Every candidate dies; the
// engine finds exactly where.
// ---------------------------------------------------------------------------
export interface PhiCandidate {
  desc: string;
  phi: (n: bigint) => number;
  mode: "step" | "block";
}

export interface PhiDeath {
  desc: string;
  n: bigint | null;
  from?: bigint;
  to?: bigint;
  phiFrom?: number;
  phiTo?: number;
}

const popcount = (n: bigint) => {
  let c = 0;
  for (const ch of n.toString(2)) if (ch === "1") c++;
  return c;
};
const bitlen = (n: bigint) => n.toString(2).length;

export function phiCandidates(): PhiCandidate[] {
  const list: PhiCandidate[] = [
    { desc: "φ(n) = n  (raw magnitude, per step)", mode: "step", phi: (n) => Number(n) },
    { desc: "φ(n) = bitlength(n), per step", mode: "step", phi: (n) => bitlen(n) },
    { desc: "φ(n) = bitlength(n), per odd-block", mode: "block", phi: (n) => bitlen(n) },
    { desc: "φ(n) = popcount(n), per odd-block", mode: "block", phi: (n) => popcount(n) },
  ];
  for (const [al, be] of [
    [1, 1],
    [2, 1],
    [1, 2],
    [3, -1],
    [2, 3],
    [4, 1],
  ]) {
    list.push({
      desc: `φ(n) = ${al}·bitlength + ${be}·popcount, per odd-block`,
      mode: "block",
      phi: (n) => al * bitlen(n) + be * popcount(n),
    });
  }
  return list;
}

function nextStep(n: bigint): bigint {
  return n % 2n === 0n ? n / 2n : 3n * n + 1n;
}
function nextBlock(n: bigint): bigint {
  // odd n -> (3n+1) / 2^v with v maximal; even n -> strip all factors of 2
  let m = n % 2n === 0n ? n : 3n * n + 1n;
  while (m % 2n === 0n) m /= 2n;
  return m;
}

export function killCandidate(c: PhiCandidate, limit: number): PhiDeath {
  for (let i = 1; i <= limit; i++) {
    const n = BigInt(i);
    if (n === 1n) continue;
    const to = c.mode === "step" ? nextStep(n) : nextBlock(n);
    if (to === 1n || to === n) continue;
    const a = c.phi(n);
    const b = c.phi(to);
    if (b >= a) {
      return { desc: c.desc, n, from: n, to, phiFrom: a, phiTo: b };
    }
  }
  return { desc: c.desc, n: null };
}

// Stopping-time (first drop below start) records — the reason no uniform
// "descends within m steps" bound can exist.
export interface SigmaRecord {
  n: number;
  sigma: number;
}
export function stoppingTimeRecords(limit: number): SigmaRecord[] {
  const recs: SigmaRecord[] = [];
  let best = -1;
  for (let n = 2; n <= limit; n++) {
    let x = n;
    let s = 0;
    while (x >= n) {
      x = x % 2 === 0 ? x / 2 : 3 * x + 1;
      s++;
      if (s > 5000) break;
    }
    if (s > best) {
      best = s;
      recs.push({ n, sigma: s });
    }
  }
  return recs;
}

// ---------------------------------------------------------------------------
// Divergence-forcing engine, in the accelerated map T (odd n → (3n+1)/2,
// even n → n/2 — the map where odd steps can repeat). Along t T-steps with o
// odd, the value scales like n · 3^o / 2^t (up to bounded +1 corrections), so
// a divergent orbit must keep  o/t ≥ log 2 / log 3 ≈ 0.63093  at every
// horizon, forever. We measure how long any real orbit sustains that bias.
// ---------------------------------------------------------------------------
export interface BiasRecord {
  n: number;
  len: number;
}
export function sustainedBiasRecords(limit: number): { records: BiasRecord[]; threshold: number } {
  const threshold = Math.log(2) / Math.log(3);
  const recs: BiasRecord[] = [];
  let best = -1;
  for (let n = 3; n <= limit; n += 2) {
    let x = n;
    let odd = 0;
    let t = 0;
    let len = 0;
    while (x !== 1 && t < 2000) {
      if (x % 2 === 1) {
        odd++;
        x = (3 * x + 1) / 2;
      } else {
        x = x / 2;
      }
      t++;
      if (odd >= threshold * t) len = t;
      else break; // bias broken; the divergence-compatible prefix ends here
      if (x > 4e15) break;
    }
    if (len > best) {
      best = len;
      recs.push({ n, len });
    }
  }
  return { records: recs, threshold };
}
