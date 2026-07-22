// Iteration 7 — is the extremal class self-generating?
//
// Hypothesis: every exactly-1/3 poset on n+1 elements contains an exactly-1/3
// poset on n elements as an induced subposet — equivalently, the extremal
// class grows level-by-level from the single seed 1+2 by adding one element
// at a time.
//
// Test: starting from the 1+2 poset, extend each known extremal poset by one
// new element z in every consistent way (z gets a downset D and an upset U
// with every d ∈ D strictly below every u ∈ U; D a downset, U an upset),
// keep the extensions whose balance is exactly 1/3, dedup canonically, and
// compare the census against the exhaustive counts 1, 2, 3, 5, 8, 12, 18
// (n = 3…9, iteration 1).
//
//   - If the counts match: closure holds on the verified range, AND the
//     n = 10 level produced here is a PREDICTION of the exhaustive n = 10
//     extremal census — falsifiable by iteration 4, which computes it
//     independently by sweeping all ~5M candidates.
//   - If the grown counts fall short: some extremal poset is an "orphan"
//     (not an extension of a smaller extremal one) — worth a dossier note.
//
// Run: bun run research/iteration7.ts

import {
  emptyPoset,
  close,
  withRelation,
  balance,
  countExtensions,
  canonical,
  describe,
  isDownset,
  upSets,
  type Poset,
} from "../lib/poset";

const EXPECTED = new Map<number, number>([
  [3, 1],
  [4, 2],
  [5, 3],
  [6, 5],
  [7, 8],
  [8, 12],
  [9, 18],
]);

// seed: 1+2 (x < c, y isolated)
let level: Poset[] = [close(withRelation(emptyPoset(3), 0, 2))];
console.log(`n=3: ${level.length} extremal (seed) — expected ${EXPECTED.get(3)}`);

const NMAX = Number(process.env.NMAX ?? 10);
for (let n = 4; n <= NMAX; n++) {
  const seen = new Map<string, Poset>();
  for (const p of level) {
    const k = p.n;
    const up = upSets(p);
    // enumerate upsets of p (complements of downsets)
    const downsetList: number[] = [];
    for (let mask = 0; mask < 1 << k; mask++) if (isDownset(p, mask)) downsetList.push(mask);
    const upsetList: number[] = [];
    for (let mask = 0; mask < 1 << k; mask++) {
      // U is an upset iff for every i ∈ U, up[i] ⊆ U
      let ok = true;
      let m = mask;
      while (m) {
        const i = 31 - Math.clz32(m & -m);
        if ((up[i] & mask) !== up[i]) {
          ok = false;
          break;
        }
        m &= m - 1;
      }
      if (ok) upsetList.push(mask);
    }
    for (const D of downsetList) {
      for (const U of upsetList) {
        if (D & U) continue;
        // require every d ∈ D strictly below every u ∈ U
        let consistent = true;
        let m = U;
        while (m && consistent) {
          const u = 31 - Math.clz32(m & -m);
          if ((p.lt[u] & D) !== D) consistent = false;
          m &= m - 1;
        }
        if (!consistent) continue;
        // new element z = k with downset D; members of U gain z below them
        const lt = [...p.lt, D];
        m = U;
        while (m) {
          const u = 31 - Math.clz32(m & -m);
          lt[u] |= 1 << k;
          m &= m - 1;
        }
        const q: Poset = { n: k + 1, lt };
        close(q);
        const b = balance(q);
        if (!b || 3n * b.num !== b.den) continue;
        const key = canonical(q);
        if (!seen.has(key)) seen.set(key, q);
      }
    }
  }
  level = [...seen.values()];
  const exp = EXPECTED.get(n);
  const verdict =
    exp === undefined
      ? "— PREDICTION (check against iteration 4)"
      : exp === level.length
        ? "— matches exhaustive census ✓"
        : `— MISMATCH: exhaustive census says ${exp} (orphan extremal posets exist!)`;
  console.log(`n=${n}: ${level.length} extremal grown ${verdict}`);
  if (n === 10 && NMAX === 10) {
    for (const q of level) console.log(`   {${describe(q)}} e=${countExtensions(q)}`);
  }
  if (n >= 11) {
    const eCounts = new Map<string, number>();
    for (const q of level) {
      const e = countExtensions(q).toString();
      eCounts.set(e, (eCounts.get(e) ?? 0) + 1);
    }
    console.log(
      `   e-distribution: ${[...eCounts.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([e, c]) => `${e}×${c}`).join(", ")}`,
    );
  }
}
