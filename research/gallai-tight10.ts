/**
 * THE EXACT TIGHT CENSUS AT n = 10.
 *
 * A graph is TIGHT when p(G) = B(n) = ceil(n/2) — it needs every path Gallai
 * allows. The campaign has never computed the tight population at n = 10: the
 * n = 10 stream (turn 6) counted only the graphs whose tightness a classical
 * lower bound already forces (305,585 of them), because deciding the rest
 * requires refuting a decomposition into B − 1 = 4 paths, which is strictly
 * harder than the Gallai check itself.
 *
 * That leaves the in-house sequence of STRUCTURE-forced tight graphs — tight
 * with every classical lower bound strictly below B — at
 *      n = 6 → 3,   n = 8 → 51,   n = 10 → ?
 * and the "?" is what this computes. It also matters for the Bonamy–Perrett
 * question (⌊n/2⌋ paths suffice unless G is an odd semi-clique): the leaf
 * reduction at n = 11 needs to know exactly which 10-vertex graphs are tight.
 *
 * Deciding 11,716,571 graphs at budget 4 would be brutal by search alone, so
 * three exact shortcuts carry most of the population:
 *
 *   S1. lb ≥ B  ⇒  TIGHT with no search. Gallai is verified at n = 10, so
 *       p ≤ 5; a classical lower bound of 5 pins p = 5 exactly.
 *
 *   S2. THEOREM F + the n = 9 census  ⇒  NOT TIGHT by arithmetic. If v has
 *       degree 2 with NON-ADJACENT neighbours u, w then H = (G − v) + uw is a
 *       simple connected graph on 9 vertices with m(H) = m(G) − 1, and the
 *       splice gives p(G) ≤ p(H). Turn 7 decided the n = 9 tight class
 *       exhaustively: at n = 9, tight ⟺ m ≥ 33. So if m(G) ≤ 33 then H is not
 *       tight, p(H) ≤ 4, and therefore p(G) ≤ 4 — G is not tight, established
 *       by an edge count and no search at all.
 *
 *   S3. Otherwise the budget-4 engine runs: greedy first (a hit is a verified
 *       certificate for p ≤ 4, so NOT tight), then the EXHAUSTIVE solver, whose
 *       null is a proof that p = 5, i.e. a structure-forced tight graph. Node
 *       limit reached ⇒ UNDECIDED, reported, never guessed either way.
 *
 * Every "not tight" verdict from S3 carries a verified 4-path decomposition, and
 * every tight verdict also gets a verified 5-path decomposition, so p = 5 is
 * certified from both sides.
 *
 * Run:
 *   bun research/gallai-tight10.ts --jobs 14
 *   bun research/gallai-tight10.ts --worker --res 0 --mod 14
 *   bun research/gallai-tight10.ts --jobs 4 --max 200000     # smoke test
 *   bun research/gallai-tight10.ts --n 8 --jobs 4            # reproduce 51
 */

import {
  allPairs,
  buildAdj,
  decompWithEndpointsExact,
  degrees,
  edgeCount,
  gallaiBound,
  maskFromEdges,
  parseGraph6,
  pathLowerBound,
  pathNumberAtMost,
  SearchLimitExceeded,
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
const IS_WORKER = flag("worker");
const RES = Number(opt("res", "0"));
const MOD = Number(opt("mod", "1"));
const JOBS = Number(opt("jobs", "14"));
const MAX_GRAPHS = opt("max", "") === "" ? Infinity : Number(opt("max", "0"));
const NODE_LIMIT = Number(opt("node-limit", "3000000"));
const OUT_DIR = opt("out-dir", "/tmp/gallai-tight10");

const B = gallaiBound(N);
const pairs = allPairs(N);

/**
 * Tight ⟺ m ≥ THRESH at order N−1 (odd), from the exhaustive turn-7 census:
 * n = 9 → 33 (i.e. 2m > (n−1)² = 64), n = 7 → 19, n = 5 → 9.
 * Only used for the S2 shortcut, and only at orders where it was DECIDED.
 */
const TIGHT_THRESHOLD_PREV: Record<number, number> = { 5: 9, 7: 19, 9: 33 };

const A001349: Record<number, number> = {
  8: 11117,
  9: 261080,
  10: 11716571,
};

const geng = Bun.which("geng");
if (!geng) throw new Error("geng not on PATH (brew install nauty)");

type Stats = {
  checked: number;
  lbForced: number; // S1
  spliceFree: number; // S2
  greedyFree: number; // S3 greedy
  exhaustiveFree: number; // S3 exhaustive found a 4-path decomposition
  structForced: number; // S3 exhaustive refuted 4 → tight, lb < B
  undecided: number;
  bad: number;
  structural: string[];
  undecidedList: string[];
};

function newStats(): Stats {
  return {
    checked: 0,
    lbForced: 0,
    spliceFree: 0,
    greedyFree: 0,
    exhaustiveFree: 0,
    structForced: 0,
    undecided: 0,
    bad: 0,
    structural: [],
    undecidedList: [],
  };
}

/** Does G have a degree-2 vertex whose neighbours are non-adjacent? */
function hasSpliceableDeg2(adj: number[][], deg: number[]): boolean {
  for (let v = 0; v < N; v++) {
    if (deg[v] !== 2) continue;
    const u = adj[v]![0]!;
    const w = adj[v]![1]!;
    if (!adj[u]!.includes(w)) return true;
  }
  return false;
}

function checkGraph(g6: string, st: Stats): void {
  const { edgeMask } = parseGraph6(g6);
  const adj = buildAdj(N, edgeMask, pairs);
  const deg = degrees(adj);
  const m = edgeCount(edgeMask);
  const lb = pathLowerBound(deg, m, N);

  // ── S1: a classical bound already reaches B ⇒ tight, no search.
  if (lb >= B) {
    st.lbForced++;
    return;
  }

  // ── S2: Theorem F + the decided (N−1) census ⇒ p ≤ B−1 with no search.
  const thresh = TIGHT_THRESHOLD_PREV[N - 1];
  if (thresh !== undefined && m - 1 < thresh && hasSpliceableDeg2(adj, deg)) {
    st.spliceFree++;
    return;
  }

  // ── S3: decide at budget B−1.
  const quick = pathNumberAtMost(N, edgeMask, pairs, B - 1);
  if (quick.ok) {
    const v = verifyDecomposition(N, edgeMask, pairs, quick.paths);
    if (!v.ok) {
      st.bad++;
      return;
    }
    st.greedyFree++;
    return;
  }

  let ex: { paths: number[][] | null };
  try {
    ex = decompWithEndpointsExact(N, edgeMask, pairs, B - 1, [], NODE_LIMIT);
  } catch (e) {
    if (!(e instanceof SearchLimitExceeded)) throw e;
    st.undecided++;
    if (st.undecidedList.length < 30) st.undecidedList.push(g6);
    return;
  }

  if (ex.paths) {
    const v = verifyDecomposition(N, edgeMask, pairs, ex.paths);
    if (!v.ok) {
      st.bad++;
      return;
    }
    st.exhaustiveFree++;
    return;
  }

  // p > B−1, and Gallai gives p ≤ B: structure-forced tight (lb < B).
  // Certify p = B from above as well, so tightness is pinned on both sides.
  const at = pathNumberAtMost(N, edgeMask, pairs, B);
  if (!at.ok || !verifyDecomposition(N, edgeMask, pairs, at.paths).ok) {
    st.bad++;
    if (st.structural.length < 200) st.structural.push(`${g6} NO-B-CERT`);
    return;
  }
  st.structForced++;
  if (st.structural.length < 200) st.structural.push(g6);
}

async function runWorker(): Promise<void> {
  const gengArgs = ["-c", "-q", String(N)];
  if (MOD > 1) gengArgs.push(`${RES}/${MOD}`);
  const proc = Bun.spawn([geng!, ...gengArgs], { stdout: "pipe", stderr: "pipe" });
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  const st = newStats();
  const t0 = performance.now();
  let buf = "";
  let stop = false;

  while (!stop) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;
      st.checked++;
      checkGraph(line, st);
      if (st.checked >= MAX_GRAPHS) {
        stop = true;
        break;
      }
    }
  }
  if (!stop && buf.trim()) {
    st.checked++;
    checkGraph(buf.trim(), st);
  }
  if (stop) {
    try {
      proc.kill();
    } catch {
      /* early stop on --max */
    }
  }
  await proc.exited;

  const ms = performance.now() - t0;
  await Bun.write(
    `${OUT_DIR}/tight-${RES}-of-${MOD}.json`,
    JSON.stringify({ n: N, res: RES, mod: MOD, ms, ...st }, null, 1),
  );
  console.log(
    `shard ${RES}/${MOD}: checked=${st.checked} lb=${st.lbForced} splice=${st.spliceFree} ` +
      `greedy=${st.greedyFree} exh=${st.exhaustiveFree} STRUCT=${st.structForced} ` +
      `undec=${st.undecided} bad=${st.bad} ${(st.checked / (ms / 1000)).toFixed(0)}/s`,
  );
  process.exit(st.bad === 0 ? 0 : 1);
}

async function orchestrate(): Promise<void> {
  console.log(`Exact tight census at n = ${N} (B = ${B}), ${JOBS} shards\n`);
  await Bun.spawn(["mkdir", "-p", OUT_DIR]).exited;
  const t0 = performance.now();
  const procs = [];
  for (let r = 0; r < JOBS; r++) {
    const wargs = [
      "bun",
      "research/gallai-tight10.ts",
      "--worker",
      "--n",
      String(N),
      "--res",
      String(r),
      "--mod",
      String(JOBS),
      "--out-dir",
      OUT_DIR,
      "--node-limit",
      String(NODE_LIMIT),
    ];
    if (Number.isFinite(MAX_GRAPHS)) wargs.push("--max", String(MAX_GRAPHS));
    procs.push(Bun.spawn(wargs, { stdout: "inherit", stderr: "inherit" }));
  }
  await Promise.all(procs.map((p) => p.exited));
  const wall = (performance.now() - t0) / 1000;

  const merged = newStats();
  for (let r = 0; r < JOBS; r++) {
    const f = Bun.file(`${OUT_DIR}/tight-${r}-of-${JOBS}.json`);
    if (!(await f.exists())) {
      console.log(`  FAIL shard ${r} produced no summary`);
      merged.bad++;
      continue;
    }
    const s = (await f.json()) as Stats;
    merged.checked += s.checked;
    merged.lbForced += s.lbForced;
    merged.spliceFree += s.spliceFree;
    merged.greedyFree += s.greedyFree;
    merged.exhaustiveFree += s.exhaustiveFree;
    merged.structForced += s.structForced;
    merged.undecided += s.undecided;
    merged.bad += s.bad;
    merged.structural.push(...s.structural);
    merged.undecidedList.push(...s.undecidedList);
  }

  const tight = merged.lbForced + merged.structForced;
  const notTight = merged.spliceFree + merged.greedyFree + merged.exhaustiveFree;
  console.log("");
  const expected = A001349[N];
  if (expected !== undefined && Number.isFinite(MAX_GRAPHS) === false) {
    console.log(
      merged.checked === expected
        ? `  OK   coverage: ${merged.checked.toLocaleString()} = A001349(${N})`
        : `  FAIL coverage: ${merged.checked.toLocaleString()} ≠ A001349(${N}) = ${expected.toLocaleString()}`,
    );
  }
  console.log(`  ..   not tight: ${notTight.toLocaleString()} (splice-free ${merged.spliceFree.toLocaleString()}, greedy ${merged.greedyFree.toLocaleString()}, exhaustive ${merged.exhaustiveFree.toLocaleString()})`);
  console.log(`  ..   TIGHT: ${tight.toLocaleString()} — lower-bound-forced ${merged.lbForced.toLocaleString()}, STRUCTURE-forced ${merged.structForced.toLocaleString()}`);
  if (merged.undecided > 0) {
    console.log(`  ..   UNDECIDED at the ${NODE_LIMIT.toLocaleString()}-node limit: ${merged.undecided} (no verdict claimed)`);
    for (const g of merged.undecidedList.slice(0, 10)) console.log(`         ${g}`);
  }
  if (merged.bad > 0) console.log(`  FAIL ${merged.bad} certificate failures`);
  console.log(`  ..   wall ${(wall / 60).toFixed(1)} min, ${(merged.checked / wall).toFixed(0)} graphs/s aggregate`);
  console.log(`\n  structure-forced sequence so far: n=6 → 3, n=8 → 51, n=${N} → ${merged.structForced}${merged.undecided ? " (+undecided)" : ""}`);

  await Bun.write(
    `${OUT_DIR}/merged.json`,
    JSON.stringify({ n: N, jobs: JOBS, wall, tight, notTight, ...merged }, null, 1),
  );
  const clean = merged.bad === 0 && merged.undecided === 0;
  console.log(`\n${clean ? "ALL CHECKS PASSED" : merged.bad ? `${merged.bad} FAILURES` : "COMPLETE WITH UNDECIDED CASES"}`);
  process.exit(merged.bad === 0 ? 0 : 1);
}

if (IS_WORKER) await runWorker();
else await orchestrate();
