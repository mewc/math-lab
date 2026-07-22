// Iteration 3 — from observation to proof, and the runner-up hunt.
//
// A. PROOF (machine cross-check of a hand proof). Claim: b(H(k)) = 1/3 for
//    every k ≥ 1, where H(k) is the k-chain c1<…<ck with feet x<c1, y<c2.
//    Argument: in any linear extension the elements {x, c1, …, ck} are forced
//    into the order x, c1, …, ck; an extension is determined by where y is
//    inserted, and y must precede c2, leaving exactly 3 slots (before x,
//    between x and c1, between c1 and c2). So e(H(k)) = 3 always. The only
//    incomparable pairs are (x,y) and (y,c1); each realizes its minority
//    order in exactly one slot, so both sit at exactly 1/3, and b = 1/3. ∎
//    This script cross-checks every claim of that argument (extension count,
//    incomparable-pair list, per-pair counts) against the DP for k = 1…12.
//
// B. Extremal anatomy, n ≤ 9. For each exactly-1/3 poset: is e(P) a power
//    of 3? Is EVERY incomparable pair at exactly 1/3 (as in H(k))?
//
// C. Runner-up posets, n ≤ 9. Iteration 1 recorded only runner-up values
//    (2/5, 4/11, 5/14, 5/14, 16/45, 6/17 — decreasing). Here we recover the
//    posets that achieve them, hunting a parametric family whose balance
//    tends to 1/3 from above.
//
// Run: bun run research/iteration3.ts

import {
  emptyPoset,
  close,
  withRelation,
  countExtensions,
  pairStats,
  balance,
  enumeratePosets,
  isChain,
  describe,
  type Poset,
} from "../lib/poset";

function gcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b];
  return a;
}
function frac(num: bigint, den: bigint): string {
  const g = gcd(num, den);
  return `${num / g}/${den / g}`;
}
function isPowerOf3(x: bigint): boolean {
  while (x % 3n === 0n) x /= 3n;
  return x === 1n;
}

// ---------------------------------------------------------------- A: proof

console.log("A. Machine cross-check of the H(k) proof");
let proofOk = true;
for (let k = 1; k <= 12; k++) {
  const n = k + 2;
  let p = emptyPoset(n);
  for (let i = 2; i < n - 1; i++) p = withRelation(p, i, i + 1);
  p = withRelation(p, 0, 2);
  if (k >= 2) p = withRelation(p, 1, 3);
  close(p);
  const e = countExtensions(p);
  const pairs = pairStats(p, e);
  const pairSet = pairs.map((s) => `${s.a},${s.b}`).sort().join(" ");
  const expectPairs = "0,1 1,2"; // (x,y) and (y,c1)
  const allThirds = pairs.every((s) => {
    const m = s.aFirst < s.bFirst ? s.aFirst : s.bFirst;
    return 3n * m === e;
  });
  const ok = e === 3n && pairSet === expectPairs && allThirds;
  if (!ok) proofOk = false;
  console.log(
    `   H(${k}): e = ${e} (want 3), pairs {${pairSet}} (want {${expectPairs}}), all at exactly 1/3: ${allThirds} ${ok ? "✓" : "✗ PROOF ARGUMENT BROKEN"}`,
  );
}
console.log(
  proofOk
    ? "   Every claim of the slot argument checks out for k ≤ 12; the argument itself is k-independent. H(k) is settled: b = 1/3 for all k ≥ 1."
    : "   MISMATCH — the hand proof mis-describes the family; do not publish it.",
);

// ------------------------------------------------- B + C: anatomy & runner-up

console.log("\nB. Extremal anatomy & C. runner-up posets (n ≤ 9)");
const NMAX = Number(process.env.NMAX ?? 9);

interface Named {
  p: Poset;
  num: bigint;
  den: bigint;
  pair: [number, number];
}

for (let n = 3; n <= NMAX; n++) {
  const t0 = performance.now();
  const posets = enumeratePosets(n);
  const extremal: Named[] = [];
  let ruNum: bigint | null = null;
  let ruDen: bigint | null = null;
  let runnerUps: Named[] = [];

  for (const p of posets) {
    if (isChain(p)) continue;
    const b = balance(p)!;
    if (3n * b.num === b.den) {
      extremal.push({ p, num: b.num, den: b.den, pair: b.pair });
      continue;
    }
    if (3n * b.num < b.den) throw new Error(`below 1/3 at n=${n}: ${describe(p)}`);
    const cmp = ruNum === null ? -1n : b.num * ruDen! - ruNum * b.den;
    if (cmp < 0n) {
      ruNum = b.num;
      ruDen = b.den;
      runnerUps = [{ p, num: b.num, den: b.den, pair: b.pair }];
    } else if (cmp === 0n) {
      runnerUps.push({ p, num: b.num, den: b.den, pair: b.pair });
    }
  }

  // anatomy of the extremal class
  let pow3 = 0;
  let allPairsThird = 0;
  for (const x of extremal) {
    const e = countExtensions(x.p);
    if (isPowerOf3(e)) pow3++;
    const pairs = pairStats(x.p, e);
    if (
      pairs.every((s) => {
        const m = s.aFirst < s.bFirst ? s.aFirst : s.bFirst;
        return 3n * m === e;
      })
    )
      allPairsThird++;
  }
  const ms = Math.round(performance.now() - t0);
  console.log(
    `\n   n=${n}: ${extremal.length} extremal — e(P) power of 3: ${pow3}/${extremal.length}, every incomparable pair exactly 1/3: ${allPairsThird}/${extremal.length} [${ms}ms]`,
  );
  if (ruNum !== null) {
    console.log(
      `   runner-up b = ${frac(ruNum, ruDen!)} ≈ ${(Number(ruNum) / Number(ruDen!)).toFixed(6)}, achieved by ${runnerUps.length} poset(s):`,
    );
    for (const r of runnerUps.slice(0, 6)) {
      console.log(`      {${describe(r.p)}} pair (${r.pair}) — e = ${countExtensions(r.p)}`);
    }
  }
}
