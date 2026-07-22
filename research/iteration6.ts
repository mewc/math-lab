// Iteration 6 — the runner-up at n = 10: how close does the spectrum creep
// toward 1/3?
//
// Iteration 3 recovered the runner-up balances for n ≤ 9. Writing each as
// b = 1/3 + 1/(3d), the denominators d = e/(3m−e) run 5, 11, 14, 15, 17
// (n = 4,5,6,8,9). If d → ∞, balance values accumulate at 1/3 from above.
// This sweep extends the sequence to n = 10.
//
// Same no-dedup candidate generation as iteration 4, but the early exit is
// SLACKED: we only skip a poset once some pair has b > 1/3 + SLACK (with
// SLACK = 1/30, covering everything down to d = 10 — comfortably below the
// trend). Posets that never clear the slack get a full scan and their exact
// balance enters the runner-up tally. Posets whose balance lands between the
// true runner-up and the slack are fully counted too, so the minimum positive
// gap found is exact as long as it is below the slack — which the n ≤ 9
// trend (d ≥ 15 → gap ≤ 1/45 < 1/30) makes essentially certain.
//
// Run: bun run research/iteration6.ts

import { enumeratePosets, downsets, canonical, describe, type Poset } from "../lib/poset";

function countExtFast(n: number, lt: number[], up: number[]): number {
  const size = 1 << n;
  const f = new Float64Array(size);
  f[0] = 1;
  for (let mask = 1; mask < size; mask++) {
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
const popcount = (x: number) => {
  let c = 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
};
function gcdN(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

const N = 10;
const t0 = performance.now();
console.log("enumerating base posets (n = 9)…");
const base = enumeratePosets(N - 1);
console.log(`${base.length} base posets [${Math.round(performance.now() - t0)}ms]`);

// runner-up tracking: smallest positive gap g = 3m − e over e, i.e. minimize m/e s.t. m/e > 1/3.
// compare fractions m1/e1 < m2/e2 by cross-multiplication in exact doubles (products < 2^53? m,e ≤ 3.6M
// so m1*e2 up to ~1.3e13 < 2^53 ✓)
let ruM = 1;
let ruE = 1;
const ruPosets = new Map<string, string>();
let candidates = 0;
let fullScans = 0;
let below = 0;
const t1 = performance.now();
let lastReport = t1;

for (let bi = 0; bi < base.length; bi++) {
  const p = base[bi];
  for (const ideal of downsets(p)) {
    const lt = [...p.lt, ideal];
    candidates++;
    const up = upSetsOf(N, lt);
    const pairs: Array<[number, number, number]> = [];
    for (let a = 0; a < N; a++) {
      for (let b = a + 1; b < N; b++) {
        if (lt[a] & (1 << b) || lt[b] & (1 << a)) continue;
        pairs.push([
          a,
          b,
          Math.abs(popcount(lt[a]) - popcount(lt[b])) + Math.abs(popcount(up[a]) - popcount(up[b])),
        ]);
      }
    }
    if (pairs.length === 0) continue; // chain
    pairs.sort((x, y) => x[2] - y[2]);

    const e = countExtFast(N, lt, up);
    let exceeded = false;
    let maxMin = 0;
    for (const [a, b] of pairs) {
      const lt2 = lt.slice();
      const add = lt2[a] | (1 << a);
      lt2[b] |= add;
      for (let j = 0; j < N; j++) if (up[b] & (1 << j)) lt2[j] |= add;
      const eab = countExtFast(N, lt2, upSetsOf(N, lt2));
      const minSide = Math.min(eab, e - eab);
      if (minSide > maxMin) maxMin = minSide;
      // slack exit: b > 1/3 + 1/30 = 11/30  ⟺  30·minSide > 11·e
      if (30 * minSide > 11 * e) {
        exceeded = true;
        break;
      }
    }
    if (exceeded) continue;
    fullScans++;
    const gap = 3 * maxMin - e;
    if (gap < 0) {
      below++;
      console.log(`!!! BELOW 1/3: {${describe({ n: N, lt })}} b = ${maxMin}/${e}`);
    } else if (gap > 0) {
      // candidate runner-up: is maxMin/e < ruM/ruE ?
      const cmp = maxMin * ruE - ruM * e;
      if (cmp < 0) {
        ruM = maxMin;
        ruE = e;
        ruPosets.clear();
      }
      if (maxMin * ruE - ruM * e === 0 || cmp < 0) {
        const q: Poset = { n: N, lt };
        const key = canonical(q);
        if (!ruPosets.has(key)) ruPosets.set(key, describe(q));
      }
    }
  }
  const now = performance.now();
  if (now - lastReport > 20000) {
    lastReport = now;
    const g = gcdN(ruM, ruE);
    console.log(
      `  …${bi + 1}/${base.length}, ${candidates} candidates, best runner-up ${ruM / g}/${ruE / g}, ${fullScans} full scans [${Math.round((now - t1) / 1000)}s]`,
    );
  }
}

const secs = ((performance.now() - t1) / 1000).toFixed(1);
const g = gcdN(ruM, ruE);
const gap = 3 * ruM - ruE;
console.log(`\nn=10 runner-up sweep complete in ${secs}s`);
console.log(`candidates: ${candidates}, full scans: ${fullScans}, below 1/3: ${below}`);
console.log(
  `runner-up balance at n=10: ${ruM}/${ruE} = ${ruM / g}/${ruE / g} ≈ ${(ruM / ruE).toFixed(7)}`,
);
console.log(`gap = ${gap}/${3 * ruE} = 1/(3·${ruE / gap})  →  d-sequence 5, 11, 14, 15, 17, ${ruE / gap}`);
console.log(`achieved by ${ruPosets.size} poset(s) up to isomorphism:`);
for (const desc of ruPosets.values()) console.log(`   {${desc}}`);
