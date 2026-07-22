// Iteration 5 — the accumulation question: is inf{ b(P) : b(P) > 1/3 } = 1/3?
//
// Iteration 3's runner-up data suggests yes: the gaps b − 1/3 are 1/15, 1/33,
// 1/42, 1/45, 1/51 for n = 4,5,6,8,9 — i.e. 3·minSide − e(P) stays tiny (1 or
// a small constant) while e(P) grows. If some explicit family keeps the
// numerator slack bounded while e → ∞, balance → 1/3 strictly from above and
// the accumulation is proved (for that family, hence for the inf).
//
// Families probed (all exact, BigInt):
//
// A. TWOHOOK(g): bottom hook (feet x < c1, y < c2) + chain c1<…<cg + dual
//    hook on top (heads u > c_g, v > c_{g−1}). At infinite separation the two
//    hooks decouple and the poset is extremal (b = 1/3 exactly, e = 9);
//    the question is the finite-g interaction.
//
// B. NTOP(k): the N poset (x<a, x<b, y<b) with a chain grown on top of b.
//    N itself is the n=4 runner-up (b = 2/5); does growth drive b down to
//    1/3, and from which side?
//
// C. NLADDER(k): reverse-engineered from the n=8,9 runner-up posets — an N
//    core continued by two parallel chains from a and b, capped by a dual
//    hook. The runner-ups at n=8,9 are members-up-to-details of this shape;
//    we grow the two chains in lockstep.
//
// Run: bun run research/iteration5.ts

import {
  emptyPoset,
  close,
  withRelation,
  balance,
  countExtensions,
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
function report(name: string, p: Poset) {
  const b = balance(p)!;
  const e = countExtensions(p);
  const gapNum = 3n * b.num - b.den; // (b − 1/3) = gapNum / (3·den)
  const side = gapNum > 0n ? "above" : gapNum === 0n ? "EXACTLY 1/3" : "BELOW 1/3 (!!)";
  console.log(
    `   ${name} (n=${p.n}): b = ${frac(b.num, b.den)} ≈ ${(Number(b.num) / Number(b.den)).toFixed(7)}` +
      `  gap = ${gapNum > 0n ? `${frac(gapNum, 3n * b.den)}` : "0"} (${side})  e = ${e}  pair (${b.pair})`,
  );
}

function chainOn(p: Poset, from: number, ids: number[]): Poset {
  let q = p;
  let prev = from;
  for (const id of ids) {
    q = withRelation(q, prev, id);
    prev = id;
  }
  return q;
}

console.log("A. TWOHOOK(g) — two hooks separated by a g-chain");
for (let g = 2; g <= 11; g++) {
  // 0=x, 1=y, 2..g+1 = c1..cg, g+2=u, g+3=v
  const n = g + 4;
  let p = emptyPoset(n);
  p = chainOn(p, 2, Array.from({ length: g - 1 }, (_, i) => 3 + i)); // c1<…<cg
  p = withRelation(p, 0, 2); // x < c1
  p = withRelation(p, 1, 3); // y < c2
  p = withRelation(p, g + 1, g + 2); // c_g < u
  p = withRelation(p, g, g + 3); // c_{g-1} < v
  close(p);
  report(`TWOHOOK(${g})`, p);
}

console.log("\nB. NTOP(k) — N poset with a k-chain on top of b");
for (let k = 0; k <= 11; k++) {
  // 0=x, 1=y, 2=a, 3=b, 4..k+3 = chain on b
  const n = k + 4;
  let p = emptyPoset(n);
  p = withRelation(p, 0, 2);
  p = withRelation(p, 0, 3);
  p = withRelation(p, 1, 3);
  p = chainOn(p, 3, Array.from({ length: k }, (_, i) => 4 + i));
  close(p);
  report(`NTOP(${k})`, p);
}

console.log("\nC. NLADDER(k) — N core, two parallel k-chains, dual-hook cap");
for (let k = 0; k <= 5; k++) {
  // 0=x, 1=y, 2=a, 3=b; chains: a-side 4,6,8,… ; b-side 5,7,9,… ; cap = last two ids
  const n = 6 + 2 * k;
  let p = emptyPoset(n);
  p = withRelation(p, 0, 2);
  p = withRelation(p, 0, 3);
  p = withRelation(p, 1, 3);
  const aChain = Array.from({ length: k }, (_, i) => 4 + 2 * i);
  const bChain = Array.from({ length: k }, (_, i) => 5 + 2 * i);
  p = chainOn(p, 2, aChain);
  p = chainOn(p, 3, bChain);
  const aTop = k > 0 ? aChain[k - 1] : 2;
  const bTop = k > 0 ? bChain[k - 1] : 3;
  const u = n - 2;
  const v = n - 1;
  // dual hook: u above the a-side top, v above both tops (mirrors the n=9 runner-up cap)
  p = withRelation(p, bTop, u);
  p = withRelation(p, aTop, v);
  p = withRelation(p, bTop, v);
  close(p);
  report(`NLADDER(${k})`, p);
}
