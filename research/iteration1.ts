// Iteration 1 — exhaustive verification of the 1/3–2/3 conjecture for all
// posets on n ≤ 8 elements, up to isomorphism, in exact BigInt arithmetic.
//
// For every non-chain poset P we compute b(P) = max over incomparable pairs
// (x, y) of min(P(x<y), P(y<x)) as an exact fraction, and check b(P) ≥ 1/3
// (i.e. 3·num ≥ den). We record the minimum balance per n, every poset
// achieving it, and the spectrum of balance values.
//
// Anchor: the unlabeled poset counts must match OEIS A000112:
// 1, 2, 5, 16, 63, 318, 2045, 16999.
//
// Run: bun run research/iteration1.ts

import { enumeratePosets, balance, isChain, describe, type Poset } from "../lib/poset";

const A000112 = [0, 1, 2, 5, 16, 63, 318, 2045, 16999, 183231];
const NMAX = Number(process.env.NMAX ?? 8);

interface Extremal {
  desc: string;
  num: string;
  den: string;
  pair: [number, number];
}

interface LevelResult {
  n: number;
  posets: number;
  nonChain: number;
  minNum: string;
  minDen: string;
  minValue: number;
  atExactThird: number;
  below: number; // counterexamples: balance < 1/3 (conjecture false if > 0)
  runnerUp: { num: string; den: string; value: number } | null;
  extremal: Extremal[];
  spectrum: Array<{ value: number; count: number }>;
}

const results: LevelResult[] = [];

for (let n = 3; n <= NMAX; n++) {
  const t0 = performance.now();
  const posets = enumeratePosets(n);
  if (posets.length !== A000112[n]) {
    throw new Error(`enumeration broken at n=${n}: got ${posets.length}, want ${A000112[n]}`);
  }

  let minNum = 1n;
  let minDen = 1n; // start at balance 1 (impossible; any real pair beats it)
  let extremal: Array<{ p: Poset; num: bigint; den: bigint; pair: [number, number] }> = [];
  let nonChain = 0;
  let atExactThird = 0;
  let below = 0;
  const spectrum = new Map<string, { value: number; count: number }>();

  // runner-up tracking: smallest balance strictly above the minimum
  let ruNum: bigint | null = null;
  let ruDen: bigint | null = null;

  for (const p of posets) {
    if (isChain(p)) continue;
    nonChain++;
    const b = balance(p)!;
    const { num, den } = b;

    if (3n * num < den) below++;
    if (3n * num === den) atExactThird++;

    const key = `${num * 1000000n / den}`; // bucket for the spectrum display only
    const v = Number(num) / Number(den);
    const bucket = spectrum.get(key);
    if (bucket) bucket.count++;
    else spectrum.set(key, { value: v, count: 1 });

    const cmp = num * minDen - minNum * den; // sign of (num/den − min)
    if (cmp < 0n) {
      // old minimum becomes runner-up candidate
      if (ruNum === null || minNum * ruDen! < ruNum * minDen) {
        ruNum = minNum;
        ruDen = minDen;
      }
      minNum = num;
      minDen = den;
      extremal = [{ p, num, den, pair: b.pair }];
    } else if (cmp === 0n) {
      extremal.push({ p, num, den, pair: b.pair });
    } else if (ruNum === null || num * ruDen! < ruNum * den) {
      ruNum = num;
      ruDen = den;
    }
  }

  const ms = Math.round(performance.now() - t0);
  const level: LevelResult = {
    n,
    posets: posets.length,
    nonChain,
    minNum: minNum.toString(),
    minDen: minDen.toString(),
    minValue: Number(minNum) / Number(minDen),
    atExactThird,
    below,
    runnerUp:
      ruNum !== null
        ? { num: ruNum.toString(), den: ruDen!.toString(), value: Number(ruNum) / Number(ruDen!) }
        : null,
    extremal: extremal.slice(0, 12).map((e) => ({
      desc: describe(e.p),
      num: e.num.toString(),
      den: e.den.toString(),
      pair: e.pair,
    })),
    spectrum: [...spectrum.values()].sort((a, b) => a.value - b.value),
  };
  results.push(level);

  console.log(
    `n=${n}: ${posets.length} posets (${nonChain} non-chain) — min balance ${minNum}/${minDen}` +
      ` = ${level.minValue.toFixed(6)}, ${extremal.length} extremal, ${atExactThird} at exactly 1/3,` +
      ` ${below} BELOW 1/3, runner-up ${level.runnerUp ? `${level.runnerUp.num}/${level.runnerUp.den} = ${level.runnerUp.value.toFixed(6)}` : "—"}` +
      ` [${ms}ms]`,
  );
  for (const e of level.extremal.slice(0, 6)) {
    console.log(`   extremal: {${e.desc}} pair (${e.pair}) balance ${e.num}/${e.den}`);
  }
}

const verdict = results.every((r) => r.below === 0);
console.log(
  verdict
    ? `\nVERIFIED: every non-chain poset on 3..${NMAX} elements has a balanced pair with min-side ≥ 1/3.`
    : `\nCOUNTEREXAMPLE FOUND — check the numbers above very carefully before believing this.`,
);

await Bun.write(
  new URL("./results-iteration1.json", import.meta.url).pathname,
  JSON.stringify({ generated: "iteration1", nmax: NMAX, verified: verdict, results }, null, 2),
);
console.log("wrote research/results-iteration1.json");
