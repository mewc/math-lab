// Iteration 4 — exhaustive verification at n = 10, redesigned for scale.
//
// A000112(10) = 2,567,284 posets — canonicalizing all of them is the
// bottleneck, and verification doesn't need it: every 10-element poset arises
// (at least once) by attaching a maximal element over an order ideal of some
// 9-element poset, because peeling any maximal element of a 10-element poset
// leaves a 9-element poset. So we enumerate all such candidates WITH
// MULTIPLICITY, and verify each:
//
//   - extension counts fit in a double exactly (max 10! = 3,628,800 < 2^53),
//     so the DP runs on plain numbers — still exact integer arithmetic;
//   - per poset, scan incomparable pairs (structurally-similar pairs first)
//     and stop at the first pair with min-side strictly above 1/3 — that
//     poset satisfies the conjecture with room;
//   - posets where NO pair exceeds 1/3 get a full scan: balance exactly 1/3
//     → extremal candidate (canonicalized, deduped, censused); balance below
//     1/3 → counterexample (conjecture false), logged loudly.
//
// What this run cannot see: the runner-up spectrum (early exit discards it).
// That trade is deliberate; the goal here is the verdict + extremal census.
//
// Run: bun run research/iteration4.ts

import {
  enumeratePosets,
  downsets,
  canonical,
  describe,
  type Poset,
} from "../lib/poset";

// exact extension counting on plain numbers (valid while e ≤ 2^53; n=10 max is 10!)
function countExtFast(n: number, lt: number[], up: number[]): number {
  const size = 1 << n;
  const f = new Float64Array(size);
  f[0] = 1;
  for (let mask = 1; mask < size; mask++) {
    // downset check
    let ok = true;
    let m = mask;
    while (m) {
      const i = 31 - Math.clz32(m & -m);
      if ((lt[i] & mask) !== lt[i]) {
        ok = false;
        break;
      }
      m &= m - 1;
    }
    if (!ok) continue;
    let acc = 0;
    m = mask;
    while (m) {
      const i = 31 - Math.clz32(m & -m);
      if ((up[i] & mask) === 0) acc += f[mask ^ (1 << i)];
      m &= m - 1;
    }
    f[mask] = acc;
  }
  return f[size - 1];
}

function upSetsOf(n: number, lt: number[]): number[] {
  const up = new Array(n).fill(0);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) if (lt[j] & (1 << i)) up[i] |= 1 << j;
  return up;
}

const N = 10;
const t0 = performance.now();
console.log("enumerating base posets (n = 9)…");
const base = enumeratePosets(N - 1);
console.log(`${base.length} base posets [${Math.round(performance.now() - t0)}ms]`);

let candidates = 0;
let chains = 0;
let fullScans = 0;
let below: string[] = [];
const extremalKeys = new Map<string, string>(); // canonical -> desc
const popcount = (x: number) => {
  let c = 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
};

const t1 = performance.now();
let lastReport = t1;

for (let bi = 0; bi < base.length; bi++) {
  const p = base[bi];
  for (const ideal of downsets(p)) {
    const lt = [...p.lt, ideal];
    candidates++;

    // incomparable pairs
    const up = upSetsOf(N, lt);
    const pairs: Array<[number, number, number]> = []; // a, b, similarity key
    for (let a = 0; a < N; a++) {
      for (let b = a + 1; b < N; b++) {
        if (lt[a] & (1 << b) || lt[b] & (1 << a)) continue;
        const key =
          Math.abs(popcount(lt[a]) - popcount(lt[b])) + Math.abs(popcount(up[a]) - popcount(up[b]));
        pairs.push([a, b, key]);
      }
    }
    if (pairs.length === 0) {
      chains++;
      continue;
    }
    pairs.sort((x, y) => x[2] - y[2]); // similar elements first — likely balanced

    const e = countExtFast(N, lt, up);
    let exceeded = false;
    let maxMinNum = 0; // track max over pairs of min-side count (denominator e shared)
    for (const [a, b] of pairs) {
      // count extensions with a < b: augment and close (closure: add lt[a]∪{a} to b and to everything above b)
      const lt2 = lt.slice();
      const add = lt2[a] | (1 << a);
      lt2[b] |= add;
      for (let j = 0; j < N; j++) if (up[b] & (1 << j)) lt2[j] |= add;
      const eab = countExtFast(N, lt2, upSetsOf(N, lt2));
      const minSide = Math.min(eab, e - eab);
      if (minSide > maxMinNum) maxMinNum = minSide;
      if (3 * minSide > e) {
        exceeded = true;
        break;
      }
    }
    if (!exceeded) {
      fullScans++;
      if (3 * maxMinNum === e) {
        const q: Poset = { n: N, lt };
        const key = canonical(q);
        if (!extremalKeys.has(key)) extremalKeys.set(key, `${describe(q)} (e=${e})`);
      } else {
        const q: Poset = { n: N, lt };
        below.push(`{${describe(q)}} b = ${maxMinNum}/${e}`);
        console.log(`!!! BELOW 1/3: {${describe(q)}} b = ${maxMinNum}/${e}`);
      }
    }
  }
  const now = performance.now();
  if (now - lastReport > 15000) {
    lastReport = now;
    console.log(
      `  …${bi + 1}/${base.length} base posets, ${candidates} candidates, ${extremalKeys.size} extremal, ${below.length} below [${Math.round((now - t1) / 1000)}s]`,
    );
  }
}

const secs = ((performance.now() - t1) / 1000).toFixed(1);
console.log(`\nn=10 sweep complete in ${secs}s`);
console.log(`candidates (with multiplicity): ${candidates} — every 10-element poset covered ≥ once`);
console.log(`chains skipped: ${chains}; full scans (no pair above 1/3): ${fullScans}`);
console.log(`posets BELOW 1/3: ${below.length}${below.length ? "  ← CONJECTURE FALSIFIED (verify!)" : " — conjecture verified at n = 10"}`);
console.log(`extremal (exactly-1/3) posets, deduped canonically: ${extremalKeys.size}`);
for (const desc of extremalKeys.values()) console.log(`   {${desc}}`);
console.log(`\nextremal census sequence now: 1, 2, 3, 5, 8, 12, 18, ${extremalKeys.size}`);
