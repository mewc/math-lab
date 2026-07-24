/**
 * Merge n=10 shard artifacts and assert full A001349 coverage with no CEX.
 * Exit 0 only if sum(checked)=11716571 and all shards have counterexamples=0.
 *
 * Run: bun research/gallai-n10-merge.ts
 */

const RUN_DIR =
  process.env.MATHSMASHER_RUN_DIR ??
  "/Users/mewc/.mathsmasher/runs/2026-07-24T01-08-34-gallai-paths-v1";

const EXPECTED = 11716571; // OEIS A001349 n=10
const MOD = 4;

const shards = [];
for (let res = 0; res < MOD; res++) {
  const path = `${RUN_DIR}/artifacts/gallai-stream-n10-r${res}m${MOD}.json`;
  const f = Bun.file(path);
  if (!(await f.exists())) {
    console.error(`Missing shard artifact: ${path}`);
    process.exit(1);
  }
  shards.push(await f.json());
}

let checked = 0;
let verified = 0;
let tightLb = 0;
let hard = 0;
let cex = 0;
let ms = 0;

for (const s of shards) {
  if (s.n !== 10) {
    console.error("bad n", s);
    process.exit(1);
  }
  if (s.counterexamples !== 0) {
    console.error("counterexample in shard", s.shard, s);
    process.exit(1);
  }
  checked += s.checked;
  verified += s.verified;
  tightLb += s.tightLb;
  hard += s.hard;
  cex += s.counterexamples;
  ms = Math.max(ms, s.ms);
}

const summary = {
  n: 10,
  bound: 5,
  checked,
  verified,
  tightLb,
  hard,
  counterexamples: cex,
  expectedTotal: EXPECTED,
  complete: checked === EXPECTED && cex === 0,
  shards: shards.map((s) => ({
    res: s.shard.res,
    checked: s.checked,
    hard: s.hard,
    cex: s.counterexamples,
    ms: s.ms,
    rate: s.ratePerSec,
  })),
  wallMsApprox: ms,
  note:
    "Exhaustive over nauty geng -c 10 res/mod shards. Counts sum to A001349. Finite verification only — not a general proof.",
};

console.log(JSON.stringify(summary, null, 2));

await Bun.write(
  `${RUN_DIR}/artifacts/gallai-stream-n10.json`,
  JSON.stringify(summary, null, 2),
);
console.log(`Wrote ${RUN_DIR}/artifacts/gallai-stream-n10.json`);

if (checked !== EXPECTED) {
  console.error(`COUNT MISMATCH ${checked} ≠ ${EXPECTED}`);
  process.exit(1);
}
if (cex !== 0) {
  console.error("COUNTEREXAMPLES");
  process.exit(1);
}
if (verified !== checked) {
  console.error("verified ≠ checked");
  process.exit(1);
}

console.log(
  `Gallai bound holds for all ${checked} connected unlabeled graphs on n=10.`,
);
console.log("Finite verification, not a general proof.");
process.exit(0);
