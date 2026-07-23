// Iteration 9 — exhaustive verification at n = 11, in parallel.
//
// Same soundness argument as iteration 4, applied twice: every 11-element
// poset arises by attaching a maximal element to a 10-element poset, which
// arises by attaching a maximal element to a 9-element poset. So sweeping
// (base₉, ideal, ideal) candidates covers all A000112(11) = 46,749,427
// posets, with multiplicity. Exact double arithmetic (11! < 2^53); per-poset
// early exit at the first pair strictly above 1/3; posets with no such pair
// get a full scan and are classified exactly-1/3 (extremal) or below-1/3
// (counterexample).
//
// Predictions this run tests:
//   - zero posets below 1/3 (the conjecture at n = 11);
//   - extremal census 40 = #compositions(11; {1,3}) − 1, per iterations 7/8.
//
// Sharded across workers (default 4). Run: bun run research/iteration9.ts

import { enumeratePosets, canonical, describe, type Poset } from "../lib/poset";

const WORKERS = Number(process.env.WORKERS ?? 4);
const t0 = performance.now();
console.log("enumerating base posets (n = 9)…");
const base = enumeratePosets(9);
console.log(`${base.length} base posets [${Math.round(performance.now() - t0)}ms]`);

// shard round-robin so uneven regions of the generation order spread out
const shards: number[][][] = Array.from({ length: WORKERS }, () => []);
base.forEach((p, i) => shards[i % WORKERS].push(p.lt));

const progress = new Array(WORKERS).fill(0);
let done = 0;
let totalCandidates = 0;
let totalFullScans = 0;
const allExtremal: number[][] = [];
const allBelow: number[][] = [];
const t1 = performance.now();
let lastLog = t1;

await new Promise<void>((resolve) => {
  for (let w = 0; w < WORKERS; w++) {
    const worker = new Worker(new URL("./iteration9-worker.ts", import.meta.url).href);
    worker.onmessage = (ev: MessageEvent) => {
      const msg = ev.data;
      if (msg.type === "progress") {
        progress[w] = msg.candidates;
        const now = performance.now();
        if (now - lastLog > 30000) {
          lastLog = now;
          const sum = progress.reduce((a, b) => a + b, 0);
          console.log(`  …${(sum / 1e6).toFixed(1)}M candidates [${Math.round((now - t1) / 1000)}s]`);
        }
      } else if (msg.type === "done") {
        totalCandidates += msg.candidates;
        totalFullScans += msg.fullScans;
        allExtremal.push(...msg.extremal);
        allBelow.push(...msg.belowPosets);
        worker.terminate();
        if (++done === WORKERS) resolve();
      }
    };
    worker.postMessage({ bases: shards[w], reportEvery: 250000 });
  }
});

const secs = ((performance.now() - t1) / 1000).toFixed(1);
console.log(`\nn=11 sweep complete in ${secs}s across ${WORKERS} workers`);
console.log(`candidates (with multiplicity): ${totalCandidates} — covering all 46,749,427 posets`);
console.log(`full scans: ${totalFullScans}`);
console.log(
  `posets BELOW 1/3: ${allBelow.length}${allBelow.length ? " ← CONJECTURE FALSIFIED (verify!)" : " — conjecture verified at n = 11"}`,
);
for (const lt of allBelow) console.log(`   BELOW: {${describe({ n: 11, lt })}}`);

const extremalKeys = new Map<string, string>();
for (const lt of allExtremal) {
  const q: Poset = { n: 11, lt };
  const key = canonical(q);
  if (!extremalKeys.has(key)) extremalKeys.set(key, describe(q));
}
console.log(
  `extremal posets, deduped: ${extremalKeys.size} — prediction was 40 (compositions law): ${extremalKeys.size === 40 ? "CONFIRMED ✓" : "MISMATCH ✗"}`,
);
console.log(`extremal census sequence: 1, 2, 3, 5, 8, 12, 18, 27, ${extremalKeys.size}`);
