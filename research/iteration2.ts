// Iteration 2 — structure of the extremal landscape, beyond exhaustive range.
//
// Three experiments, all exact:
//
// A. The extremal family. Iteration 1's exactly-1/3 posets all look like a
//    chain with a pendant pair at the bottom. Define H(k) ("hook"):
//    elements x, y incomparable; chain c1 < c2 < … < ck; x < c1, y < c2.
//    (H(1) degenerates to the 3-element 2-chain-plus-point.) Compute b(H(k))
//    exactly for k = 1..12 and check whether the pair (x, y) stays at exactly
//    1/3 — a candidate explanation for why the minimum never leaves 1/3.
//
// B. Induced-pattern check. For every exactly-1/3 poset found by exhaustive
//    enumeration (n ≤ 8), test whether the extremal pair (x, y) together with
//    some third element induces the 3-element pattern {x, y, z : x < z, y
//    incomparable to both} or its dual — i.e. whether a "1+2" seed is always
//    present at the extremal pair.
//
// C. Sampling at n = 10..13. Random posets from two models (random closed
//    relations at varying density; random unit-interval/semiorder-style
//    orders), exact balance each, verify none dips below 1/3 and record the
//    smallest balance seen. Sampling is evidence, not proof — logged as such.
//
// Run: bun run research/iteration2.ts

import {
  emptyPoset,
  close,
  balance,
  countExtensions,
  withRelation,
  enumeratePosets,
  isChain,
  describe,
  type Poset,
} from "../lib/poset";

// deterministic RNG (xorshift32) for reproducibility
let seed = 0x9e3779b9;
function rnd(): number {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  seed >>>= 0;
  return seed / 0x100000000;
}

function gcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b];
  return a;
}
function frac(num: bigint, den: bigint): string {
  const g = gcd(num, den);
  return `${num / g}/${den / g}`;
}

// ---------------------------------------------------------------- A: hooks

console.log("A. The hook family H(k): x<c1, y<c2, chain c1<…<ck");
const hookResults: Array<{ k: number; n: number; balance: string; exactThird: boolean }> = [];
for (let k = 1; k <= 12; k++) {
  // elements: 0 = x, 1 = y, 2..k+1 = c1..ck
  const n = k + 2;
  let p = emptyPoset(n);
  for (let i = 2; i < n - 1; i++) p = withRelation(p, i, i + 1); // chain c1<…<ck
  p = withRelation(p, 0, 2); // x < c1
  if (k >= 2) p = withRelation(p, 1, 3); // y < c2
  close(p);
  const b = balance(p)!;
  const exactThird = 3n * b.num === b.den;
  hookResults.push({ k, n, balance: frac(b.num, b.den), exactThird });
  console.log(
    `   H(${k}) on ${n} elements: b = ${frac(b.num, b.den)} at pair (${b.pair})` +
      (exactThird ? "  — exactly 1/3" : ""),
  );
}

// ------------------------------------------------------- B: induced pattern

const BMAX = Number(process.env.BMAX ?? 8);
console.log(`\nB. Do all exactly-1/3 posets (n ≤ ${BMAX}) carry a 1+2 seed at the extremal pair?`);
let checked = 0;
let withSeed = 0;
const withoutSeed: string[] = [];
for (let n = 3; n <= BMAX; n++) {
  for (const p of enumeratePosets(n)) {
    if (isChain(p)) continue;
    const b = balance(p)!;
    if (3n * b.num !== b.den) continue;
    checked++;
    const [x, y] = b.pair;
    // seed: some z comparable to exactly one of x, y (so {x,y,z} induces 1+2)
    let found = false;
    for (let z = 0; z < p.n && !found; z++) {
      if (z === x || z === y) continue;
      const cx = (p.lt[x] & (1 << z)) !== 0 || (p.lt[z] & (1 << x)) !== 0;
      const cy = (p.lt[y] & (1 << z)) !== 0 || (p.lt[z] & (1 << y)) !== 0;
      if (cx !== cy) found = true;
    }
    if (found) withSeed++;
    else withoutSeed.push(`n=${p.n} {${describe(p)}} pair (${x},${y})`);
  }
}
console.log(`   ${checked} exactly-1/3 posets checked; ${withSeed} carry a 1+2 seed at the pair.`);
if (withoutSeed.length) {
  console.log("   WITHOUT seed:");
  for (const s of withoutSeed) console.log(`     ${s}`);
}

// ------------------------------------------------------------- C: sampling

console.log("\nC. Random sampling at n = 10..13 (exact balance per sample)");

function randomPoset(n: number, density: number): Poset {
  const p = emptyPoset(n);
  // random DAG via random linear order + density-p edges, then closure
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      if (rnd() < density) p.lt[order[b]] |= 1 << order[a];
  return close(p);
}

function randomSemiorder(n: number): Poset {
  // unit interval order: points x_i uniform in [0, n/2]; i < j iff x_i + 1 < x_j
  const xs = Array.from({ length: n }, () => rnd() * (n / 2));
  const p = emptyPoset(n);
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++) if (xs[a] + 1 < xs[b]) p.lt[b] |= 1 << a;
  return close(p);
}

const SAMPLES = Number(process.env.SAMPLES ?? 2000);
for (const n of [10, 11, 12, 13]) {
  let worstNum = 1n;
  let worstDen = 1n;
  let worstDesc = "";
  let belowThird = 0;
  let nonChain = 0;
  const t0 = performance.now();
  for (let s = 0; s < SAMPLES; s++) {
    const p =
      s % 3 === 2 ? randomSemiorder(n) : randomPoset(n, 0.08 + 0.5 * ((s % 7) / 7));
    if (isChain(p)) continue;
    nonChain++;
    const b = balance(p)!;
    if (3n * b.num < b.den) {
      belowThird++;
      console.log(`   !!! below 1/3: n=${n} {${describe(p)}} b=${frac(b.num, b.den)}`);
    }
    if (b.num * worstDen < worstNum * b.den) {
      worstNum = b.num;
      worstDen = b.den;
      worstDesc = describe(p);
    }
  }
  const ms = Math.round(performance.now() - t0);
  console.log(
    `   n=${n}: ${nonChain} non-chain samples — min balance seen ${frac(worstNum, worstDen)}` +
      ` = ${(Number(worstNum) / Number(worstDen)).toFixed(6)}, ${belowThird} below 1/3 [${ms}ms]`,
  );
  console.log(`      worst sample: {${worstDesc}}`);
}

// sanity cross-check on a known value: the 2+2 poset (two disjoint 2-chains)
// has 6 linear extensions and balance 1/2 on the cross pair.
{
  let p = emptyPoset(4);
  p = withRelation(p, 0, 1);
  p = withRelation(p, 2, 3);
  const e = countExtensions(p);
  const b = balance(p)!;
  if (e !== 6n) throw new Error(`sanity: 2+2 extensions ${e} ≠ 6`);
  console.log(`\nSanity: 2+2 poset has ${e} extensions, balance ${frac(b.num, b.den)} — ok`);
}
