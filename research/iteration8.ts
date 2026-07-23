// Iteration 8 — the Tower Theorem and the full extremal characterization.
//
// THEOREM (in-house; rigorous). Let P = B₁ ⊕ … ⊕ B_m be an ordinal sum
// (everything in Bᵢ below everything in Bᵢ₊₁) with every block either a
// single point or the 3-element poset 1+2, and h ≥ 1 blocks equal to 1+2.
// Then e(P) = 3^h, every incomparable pair of P has order probability
// exactly {1/3, 2/3}, and hence b(P) = 1/3.
//   Proof. A linear extension of an ordinal sum is exactly a concatenation
//   of linear extensions of its blocks, so e(P) = Π e(Bᵢ) = 3^h, and a
//   uniform extension restricts to a uniform extension of each block.
//   Incomparable pairs live only inside 1+2 blocks, where the three
//   extensions give each pair its minority order exactly once. ∎
// (The H(k) theorem of iteration 3 is the special case (1+2) ⊕ point^(k−1).)
//
// CHARACTERIZATION CONJECTURE (converse): every finite poset with b(P)
// exactly 1/3 is such an ordinal sum. This script machine-verifies it on the
// entire extremal class grown from the 1+2 seed (exhaustively confirmed
// range: n ≤ 10; growth range: n ≤ 12):
//
//   A. grow the extremal class level-by-level (as iteration 7);
//   B. ordinal-decompose each extremal poset and check every block is a
//      point or a 1+2 — the converse test;
//   C. independently GENERATE the towers from compositions of n into parts
//      {1, 3} (excluding all-1s) and check canonical set equality with the
//      grown class — the constructive bijection, and with it the census law
//      census(n) = #compositions(n; {1,3}) − 1;
//   D. re-verify the theorem's claims (e = 3^h, all pairs exactly 1/3) on
//      every generated tower by direct computation.
//
// Run: bun run research/iteration8.ts

import {
  emptyPoset,
  close,
  withRelation,
  balance,
  countExtensions,
  pairStats,
  canonical,
  upSets,
  isDownset,
  describe,
  type Poset,
} from "../lib/poset";

const NMAX = Number(process.env.NMAX ?? 12);

// ---------------------------------------------------- ordinal decomposition

/** Split P into its finest ordinal summands (bottom to top). */
function ordinalSummands(p: Poset): Poset[] {
  const up = upSets(p);
  const n = p.n;
  const all = (1 << n) - 1;
  const summands: Poset[] = [];
  let rest = all;
  while (rest) {
    // find the smallest nonempty S ⊆ rest such that every element of S is
    // below every element of rest\S — grow S from any minimal element,
    // pulling in anything not strictly above all of S
    let S = 0;
    // seed with all minimal elements of rest? No: grow a prefix greedily.
    // Start with one minimal element of the restriction.
    for (let i = 0; i < n; i++) {
      if (rest & (1 << i) && (p.lt[i] & rest) === 0) {
        S = 1 << i;
        break;
      }
    }
    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < n; j++) {
        if (!(rest & (1 << j)) || S & (1 << j)) continue;
        // j must be strictly above every element of S to stay outside S
        if ((p.lt[j] & S) !== S) {
          S |= 1 << j;
          changed = true;
        }
      }
    }
    // extract S as a sub-poset
    const ids: number[] = [];
    for (let i = 0; i < n; i++) if (S & (1 << i)) ids.push(i);
    const q = emptyPoset(ids.length);
    for (let a = 0; a < ids.length; a++)
      for (let b = 0; b < ids.length; b++)
        if (p.lt[ids[b]] & (1 << ids[a])) q.lt[b] |= 1 << a;
    summands.push(q);
    rest &= ~S;
  }
  return summands;
}

function isPoint(q: Poset): boolean {
  return q.n === 1;
}
function isOnePlusTwo(q: Poset): boolean {
  if (q.n !== 3) return false;
  // exactly one strict relation
  let rels = 0;
  for (let i = 0; i < 3; i++) {
    let m = q.lt[i];
    while (m) {
      rels++;
      m &= m - 1;
    }
  }
  return rels === 1;
}

// -------------------------------------------------------- tower generation

function compositions13(n: number): number[][] {
  const out: number[][] = [];
  const rec = (left: number, acc: number[]) => {
    if (left === 0) {
      out.push([...acc]);
      return;
    }
    if (left >= 1) {
      acc.push(1);
      rec(left - 1, acc);
      acc.pop();
    }
    if (left >= 3) {
      acc.push(3);
      rec(left - 3, acc);
      acc.pop();
    }
  };
  rec(n, []);
  return out;
}

function towerFromComposition(parts: number[]): Poset {
  const n = parts.reduce((a, b) => a + b, 0);
  let p = emptyPoset(n);
  let idx = 0;
  let prevBlock: number[] = [];
  for (const part of parts) {
    const block = part === 1 ? [idx] : [idx, idx + 1, idx + 2];
    if (part === 3) p = withRelation(p, idx, idx + 2); // 1+2 block: idx < idx+2, idx+1 free
    for (const lo of prevBlock) for (const hi of block) p = withRelation(p, lo, hi);
    prevBlock = block;
    idx += part;
  }
  return close(p);
}

// ------------------------------------------------------------------- A + B

console.log("A/B. Grow extremal class; ordinal-decompose every member");
let level: Poset[] = [close(withRelation(emptyPoset(3), 0, 2))];
const grownByN = new Map<number, Map<string, Poset>>();
grownByN.set(3, new Map([[canonical(level[0]), level[0]]]));

for (let n = 4; n <= NMAX; n++) {
  const seen = new Map<string, Poset>();
  for (const p of level) {
    const k = p.n;
    const up = upSets(p);
    const downs: number[] = [];
    for (let mask = 0; mask < 1 << k; mask++) if (isDownset(p, mask)) downs.push(mask);
    const ups: number[] = [];
    for (let mask = 0; mask < 1 << k; mask++) {
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
      if (ok) ups.push(mask);
    }
    for (const D of downs) {
      for (const U of ups) {
        if (D & U) continue;
        let consistent = true;
        let m = U;
        while (m && consistent) {
          const u = 31 - Math.clz32(m & -m);
          if ((p.lt[u] & D) !== D) consistent = false;
          m &= m - 1;
        }
        if (!consistent) continue;
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
  grownByN.set(n, seen);
  level = [...seen.values()];
}

let converseHolds = true;
for (let n = 3; n <= NMAX; n++) {
  const grown = grownByN.get(n)!;
  let good = 0;
  const bad: string[] = [];
  for (const q of grown.values()) {
    const blocks = ordinalSummands(q);
    const ok =
      blocks.every((b) => isPoint(b) || isOnePlusTwo(b)) && blocks.some((b) => isOnePlusTwo(b));
    if (ok) good++;
    else bad.push(describe(q));
  }
  if (bad.length) converseHolds = false;
  console.log(
    `   n=${n}: ${grown.size} extremal — ordinal sums of {point, 1+2}: ${good}/${grown.size}` +
      (bad.length ? `  COUNTEREXAMPLES: ${bad.join(" | ")}` : " ✓"),
  );
}

// ------------------------------------------------------------------- C + D

console.log("\nC/D. Constructive bijection: compositions {1,3} → towers, vs grown class");
let bijectionHolds = true;
let theoremHolds = true;
for (let n = 3; n <= NMAX; n++) {
  const comps = compositions13(n).filter((c) => c.some((x) => x === 3));
  const towerKeys = new Map<string, Poset>();
  for (const parts of comps) {
    const t = towerFromComposition(parts);
    // D: re-verify the theorem's claims by direct computation
    const h = parts.filter((x) => x === 3).length;
    const e = countExtensions(t);
    if (e !== 3n ** BigInt(h)) {
      theoremHolds = false;
      console.log(`   THEOREM CHECK FAILED (e): parts [${parts}] e=${e} want 3^${h}`);
    }
    const pairs = pairStats(t, e);
    for (const s of pairs) {
      const min = s.aFirst < s.bFirst ? s.aFirst : s.bFirst;
      if (3n * min !== e) {
        theoremHolds = false;
        console.log(`   THEOREM CHECK FAILED (pair): parts [${parts}] pair (${s.a},${s.b})`);
      }
    }
    towerKeys.set(canonical(t), t);
  }
  const grown = grownByN.get(n)!;
  const sameSize = towerKeys.size === grown.size && towerKeys.size === comps.length;
  let allMatch = sameSize;
  if (sameSize) for (const key of towerKeys.keys()) if (!grown.has(key)) allMatch = false;
  if (!allMatch) bijectionHolds = false;
  console.log(
    `   n=${n}: ${comps.length} compositions → ${towerKeys.size} distinct towers vs ${grown.size} grown extremal — ${allMatch ? "sets identical ✓ (census = c(n)−1)" : "MISMATCH"}`,
  );
}

console.log(
  `\nTower Theorem re-verified computationally: ${theoremHolds}` +
    `\nConverse (extremal ⇒ tower) on grown class n ≤ ${NMAX}: ${converseHolds}` +
    `\nConstructive bijection compositions ↔ extremal posets, n ≤ ${NMAX}: ${bijectionHolds}`,
);
console.log(
  "\nStanding: theorem direction is proved (rigorous, k-independent); the converse is verified on the exhaustively-confirmed range n ≤ 10 and the grown class to n ≤ 12 — beyond that it is a conjecture.",
);
