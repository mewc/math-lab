/**
 * Gallai path decomposition — streaming exhaustive check for one n
 * (default n=10) via nauty `geng -c`, without loading all graphs into RAM.
 *
 * Supports res/mod sharding: `geng -c n res/mod` for parallel slices.
 *
 * Exit 0 iff every connected graph in the stream has path_number ≤ ceil(n/2)
 * with a verified certificate (or combinatorial lb already equals bound and
 * a decomp of that size is found).
 *
 * Run:
 *   bun research/gallai-n10-stream.ts --n 10
 *   bun research/gallai-n10-stream.ts --n 10 --mod 4 --res 0
 *   bun research/gallai-n10-stream.ts --n 9   # quick sanity
 *
 * OEIS A001349 n=10: 11_716_571 unlabeled connected graphs.
 */

import {
  allPairs,
  buildAdj,
  degrees,
  edgeCount,
  gallaiBound,
  parseGraph6,
  pathLowerBound,
  pathNumberAtMost,
  exactPathNumber,
  verifyDecomposition,
} from "./gallai-lib.ts";

const args = process.argv.slice(2);
function opt(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
}
function flag(name: string): boolean {
  return args.includes(`--${name}`);
}

const N = Number(opt("n", "10"));
const RES = Number(opt("res", "0"));
const MOD = Number(opt("mod", "1"));
const PROGRESS_EVERY = Number(opt("progress", "50000"));
const MAX_GRAPHS = opt("max", "") === "" ? Infinity : Number(opt("max", "0"));
const RUN_DIR =
  opt(
    "run-dir",
    process.env.MATHSMASHER_RUN_DIR ??
      "/Users/mewc/.mathsmasher/runs/2026-07-24T01-08-34-gallai-paths-v1",
  );
const WRITE = !flag("no-artifacts");

// A001349
const EXPECTED: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 6,
  5: 21,
  6: 112,
  7: 853,
  8: 11117,
  9: 261080,
  10: 11716571,
  11: 1006700565,
};

if (!Number.isInteger(N) || N < 1 || N > 12) {
  throw new Error(`--n must be 1..12, got ${N}`);
}
if (!Number.isInteger(MOD) || MOD < 1) throw new Error("bad --mod");
if (!Number.isInteger(RES) || RES < 0 || RES >= MOD) throw new Error("bad --res");

const geng = Bun.which("geng");
if (!geng) throw new Error("geng not on PATH (brew install nauty)");

const bound = gallaiBound(N);
const pairs = allPairs(N);

console.log(`Gallai streaming check n=${N} bound=${bound} shard ${RES}/${MOD}`);
console.log(`Expected total unlabeled connected (A001349): ${EXPECTED[N] ?? "?"}`);

const gengArgs = ["-c", "-q", String(N)];
if (MOD > 1) gengArgs.push(`${RES}/${MOD}`);

const proc = Bun.spawn([geng, ...gengArgs], {
  stdout: "pipe",
  stderr: "pipe",
});

const reader = proc.stdout.getReader();
const decoder = new TextDecoder();
let buf = "";

let checked = 0;
let verified = 0;
let tightLb = 0; // lb already = bound and decomp found
let hard = 0; // needed more than greedy-at-bound path
let cex = 0;
const counterexamples: Array<{
  g6: string;
  p: number;
  edges: Array<[number, number]>;
}> = [];
const t0 = performance.now();

async function handleLine(g6: string): Promise<void> {
  if (!g6) return;
  checked++;
  if (checked > MAX_GRAPHS) return;

  const { n: gn, edgeMask, edges } = parseGraph6(g6);
  if (gn !== N) throw new Error(`n mismatch ${gn} vs ${N}: ${g6}`);

  const adj = buildAdj(N, edgeMask, pairs);
  const deg = degrees(adj);
  const m = edgeCount(edgeMask);
  const lb = pathLowerBound(deg, m, N);

  if (lb > bound) {
    cex++;
    counterexamples.push({ g6, p: lb, edges });
    return;
  }

  const within = pathNumberAtMost(N, edgeMask, pairs, bound);
  if (!within.ok) {
    hard++;
    const full = exactPathNumber(
      N,
      edgeMask,
      pairs,
      Math.max(bound + 4, lb + 4, Math.min(m, bound + 8)),
    );
    if (full.num <= bound) {
      const v = verifyDecomposition(N, edgeMask, pairs, full.paths);
      if (!v.ok) throw new Error(`bad exact cert: ${v.reason}`);
      verified++;
      if (lb === bound) tightLb++;
      return;
    }
    cex++;
    counterexamples.push({ g6, p: full.num, edges });
    return;
  }

  verified++;
  if (lb === bound) tightLb++;
}

function progress(): void {
  const ms = performance.now() - t0;
  const rate = checked / (ms / 1000);
  const expShard =
    EXPECTED[N] !== undefined ? Math.ceil(EXPECTED[N]! / MOD) : null;
  const eta =
    expShard && rate > 0
      ? ((expShard - checked) / rate / 60).toFixed(1) + "min"
      : "?";
  process.stdout.write(
    `\r  ${checked}${expShard ? "/" + expShard : ""} ok=${verified} tightLb=${tightLb} hard=${hard} cex=${cex} ${rate.toFixed(0)}/s eta=${eta}   `,
  );
}

// Stream lines
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  let idx: number;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    await handleLine(line);
    if (checked % PROGRESS_EVERY === 0) progress();
    if (checked >= MAX_GRAPHS) break;
  }
  if (checked >= MAX_GRAPHS) break;
}
if (buf.trim() && checked < MAX_GRAPHS) {
  await handleLine(buf.trim());
}

// If we set max, kill geng early
if (checked >= MAX_GRAPHS) {
  try {
    proc.kill();
  } catch {
    /* ignore */
  }
}

const errText = await new Response(proc.stderr).text();
const code = await proc.exited;
// killed → non-zero sometimes; only care if we didn't hit max and failed
if (code !== 0 && checked < MAX_GRAPHS && Number.isFinite(MAX_GRAPHS) === false) {
  // geng finished with error
  if (checked === 0) {
    throw new Error(`geng failed exit ${code}: ${errText}`);
  }
}

progress();
console.log("");

const ms = performance.now() - t0;
const summary = {
  n: N,
  bound,
  shard: { res: RES, mod: MOD },
  checked,
  verified,
  tightLb,
  hard,
  counterexamples: cex,
  cexSamples: counterexamples.slice(0, 10),
  ms: Math.round(ms),
  ratePerSec: Math.round(checked / (ms / 1000)),
  expectedTotal: EXPECTED[N] ?? null,
  complete:
    MOD === 1 &&
    EXPECTED[N] !== undefined &&
    checked === EXPECTED[N] &&
    cex === 0,
  note:
    MOD > 1
      ? `Shard ${RES}/${MOD} only — reassemble all shards for full n=${N} claim.`
      : checked === EXPECTED[N]
        ? `Full A001349 coverage for n=${N}.`
        : MAX_GRAPHS < Infinity
          ? `Partial run max=${MAX_GRAPHS}.`
          : `Count ${checked} vs expected ${EXPECTED[N]}.`,
};

console.log(JSON.stringify(summary, null, 2));

if (WRITE) {
  const tag = MOD > 1 ? `n${N}-r${RES}m${MOD}` : `n${N}`;
  const path = `${RUN_DIR}/artifacts/gallai-stream-${tag}.json`;
  await Bun.write(path, JSON.stringify(summary, null, 2));
  console.log(`Wrote ${path}`);
}

if (cex > 0) {
  console.log("COUNTEREXAMPLE(S) FOUND");
  process.exit(1);
}

if (MOD === 1 && EXPECTED[N] !== undefined && checked !== EXPECTED[N] && !Number.isFinite(MAX_GRAPHS)) {
  // only enforce count when full run without --max
  if (MAX_GRAPHS === Infinity) {
    console.log(`COUNT MISMATCH: checked=${checked} expected=${EXPECTED[N]}`);
    process.exit(1);
  }
}

if (MOD === 1 && MAX_GRAPHS === Infinity && EXPECTED[N] !== undefined && checked === EXPECTED[N]) {
  console.log(
    `Gallai bound holds for all ${checked} connected unlabeled graphs on n=${N}.`,
  );
  console.log("Finite verification, not a general proof.");
  process.exit(0);
}

if (MOD > 1) {
  console.log(`Shard ${RES}/${MOD} clean (${checked} graphs).`);
  process.exit(0);
}

if (MAX_GRAPHS < Infinity) {
  console.log(`Partial: first ${checked} graphs OK.`);
  process.exit(0);
}

console.log("Done OK.");
process.exit(0);
