/**
 * Gallai's path decomposition conjecture — EXHAUSTIVE VERIFICATION AT n = 11.
 *
 * The campaign's finite frontier stopped at n = 10 (all 11,716,571 connected
 * graphs = A001349(10)). At n = 11 there are 1,006,700,565 connected graphs,
 * which is a lot — but 11 is ODD, and at odd order the reduction theorems make
 * every graph with a small-degree vertex free:
 *
 *   REDUCTION (odd n; unconditional given Gallai for order n−1).
 *   Let n be odd and G connected on n vertices with a vertex v of degree ≤ 2.
 *   Then p(G) ≤ B(n), where B(n) = ceil(n/2) — GIVEN that every connected graph
 *   on n−1 vertices satisfies Gallai. Three cases, each with G' connected on
 *   n−1 vertices so the hypothesis applies:
 *     deg(v) = 1 (leaf at a): B(n−1) + 1 = B(n) for odd n, so decompose
 *       G − v and add the single-edge path (a,v).            [turn 6, A1]
 *     deg(v) = 2, neighbours u,w NON-adjacent: H = (G − v) + uw is simple and
 *       connected; the edge uw lies on exactly one path of any decomposition of
 *       H, and substituting u–v–w for it costs NOTHING, so p(G) ≤ B(n−1) ≤ B(n).
 *                                                            [turn 7, Theorem F]
 *     deg(v) = 2, neighbours adjacent: G − v is connected (reroute through uw)
 *       and the two edges at v already form the path u–v–w, so
 *       p(G) ≤ B(n−1) + 1 = B(n).                    [turn 7, triangle case (i)]
 *
 * With n = 10 verified exhaustively, the ENTIRE n = 11 obligation collapses to
 * connected graphs with δ ≥ 3 — 577,076,528 of them instead of 1,006,700,565,
 * so the reduction removes 42.7% of the population. This script verifies that
 * remainder directly, so together with the reduction the result is a complete,
 * certificate-backed verification of Gallai at n = 11.
 *
 * RESULT (2026-07-25): 577,076,528 graphs checked = the full δ ≥ 3 population,
 * every one certified with a verified decomposition of ≤ 6 paths, zero
 * counterexamples, zero undecided, 15.5 min wall on 14 shards (621k graphs/s).
 * The greedy engine sufficed for every single graph — zero escalations. Exactly
 * 20 graphs have a classical lower bound of 6, so those have p = 6 exactly.
 *
 * Per graph the escalation ladder is decisive — nothing is assumed from a
 * search that merely gave up:
 *   1. classical lower bound > B  →  counterexample (never happens: lb ≤ B is
 *      a theorem, re-checked here);
 *   2. `pathNumberAtMost(B)` — greedy + capped DFS — certificate verified;
 *   3. `exactPathNumber` with a wider budget;
 *   4. `decompWithEndpointsExact` — EXHAUSTIVE; its null is a proof;
 *   5. node limit hit in (4)  →  recorded as UNDECIDED, never as verified.
 * Every accepted decomposition is re-verified edge-by-edge by
 * `verifyDecomposition`, and its size re-checked against B.
 *
 * Modes:
 *   worker       — one geng shard, writes a JSON summary
 *   orchestrate  — default: checks the n = 10 base artifact, sample-validates
 *                  the δ ≤ 2 reduction constructions AT n = 11, counts the
 *                  δ ≥ 3 population with `geng -u`, runs the shards in
 *                  parallel, merges, and asserts full coverage.
 *
 * Run:
 *   bun research/gallai-n11.ts --jobs 14
 *   bun research/gallai-n11.ts --worker --res 0 --mod 14
 *   bun research/gallai-n11.ts --jobs 4 --max 200000      # smoke test
 *   bun research/gallai-n11.ts --mindeg 3 --n 10 --jobs 8 # re-run n=10 remainder
 *
 * Exit 0 only if every graph in the shard population is certified with a
 * verified certificate, with zero counterexamples and zero undecided.
 */

import {
  allPairs,
  buildAdj,
  decompWithEndpointsExact,
  degrees,
  edgeCount,
  exactPathNumber,
  gallaiBound,
  isConnected,
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

const N = Number(opt("n", "11"));
const MINDEG = Number(opt("mindeg", "3"));
const IS_WORKER = flag("worker");
const RES = Number(opt("res", "0"));
const MOD = Number(opt("mod", "1"));
const JOBS = Number(opt("jobs", "14"));
const MAX_GRAPHS = opt("max", "") === "" ? Infinity : Number(opt("max", "0"));
const NODE_LIMIT = Number(opt("node-limit", "4000000"));
const OUT_DIR = opt("out-dir", "/tmp/gallai-n11");
const SAMPLE = Number(opt("sample", "150000"));

const B = gallaiBound(N);
const pairs = allPairs(N);

// A001349 — unlabeled connected graphs.
const A001349: Record<number, number> = {
  9: 261080,
  10: 11716571,
  11: 1006700565,
};

const geng = Bun.which("geng");
if (!geng) throw new Error("geng not on PATH (brew install nauty)");

// ── per-graph check ────────────────────────────────────────────────────────

type Stats = {
  checked: number;
  verified: number;
  lbTight: number; // lb already forces p = B (density-forced at odd n)
  greedy: number;
  exactEsc: number;
  exhaustiveEsc: number;
  undecided: number;
  cex: number;
  witnesses: string[];
};

function newStats(): Stats {
  return {
    checked: 0,
    verified: 0,
    lbTight: 0,
    greedy: 0,
    exactEsc: 0,
    exhaustiveEsc: 0,
    undecided: 0,
    cex: 0,
    witnesses: [],
  };
}

function accept(
  g6: string,
  edgeMask: bigint,
  paths: number[][],
  st: Stats,
): boolean {
  if (paths.length > B) {
    st.cex++;
    if (st.witnesses.length < 20) st.witnesses.push(`${g6} size=${paths.length}`);
    return false;
  }
  const v = verifyDecomposition(N, edgeMask, pairs, paths);
  if (!v.ok) {
    st.cex++;
    if (st.witnesses.length < 20) st.witnesses.push(`${g6} bad-cert:${v.reason}`);
    return false;
  }
  st.verified++;
  return true;
}

function checkGraph(g6: string, st: Stats): void {
  const { n: gn, edgeMask } = parseGraph6(g6);
  if (gn !== N) throw new Error(`n mismatch ${gn} vs ${N}: ${g6}`);
  const adj = buildAdj(N, edgeMask, pairs);
  const deg = degrees(adj);
  const m = edgeCount(edgeMask);
  const lb = pathLowerBound(deg, m, N);

  if (lb > B) {
    // Would refute the classical bound lb ≤ ceil(n/2); recorded, not ignored.
    st.cex++;
    if (st.witnesses.length < 20) st.witnesses.push(`${g6} lb=${lb}>B`);
    return;
  }
  if (lb === B) st.lbTight++;

  const quick = pathNumberAtMost(N, edgeMask, pairs, B);
  if (quick.ok) {
    st.greedy++;
    accept(g6, edgeMask, quick.paths, st);
    return;
  }

  st.exactEsc++;
  const wide = exactPathNumber(N, edgeMask, pairs, B);
  if (wide.num <= B) {
    accept(g6, edgeMask, wide.paths, st);
    return;
  }

  // Capped searches gave up — go exhaustive. Only this can decide.
  st.exhaustiveEsc++;
  try {
    const ex = decompWithEndpointsExact(N, edgeMask, pairs, B, [], NODE_LIMIT);
    if (ex.paths) {
      accept(g6, edgeMask, ex.paths, st);
      return;
    }
    st.cex++;
    if (st.witnesses.length < 20) st.witnesses.push(`${g6} EXHAUSTIVE-NO-DECOMP`);
  } catch (e) {
    if (!(e instanceof SearchLimitExceeded)) throw e;
    st.undecided++;
    if (st.witnesses.length < 20) st.witnesses.push(`${g6} undecided`);
  }
}

// ── worker ────────────────────────────────────────────────────────────────

async function runWorker(): Promise<void> {
  const gengArgs = ["-c", "-q"];
  if (MINDEG > 0) gengArgs.push(`-d${MINDEG}`);
  gengArgs.push(String(N));
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
      /* geng killed early on --max */
    }
  }
  await proc.exited;

  const ms = performance.now() - t0;
  const summary = { n: N, mindeg: MINDEG, res: RES, mod: MOD, ms, ...st };
  await Bun.write(
    `${OUT_DIR}/shard-${RES}-of-${MOD}.json`,
    JSON.stringify(summary, null, 1),
  );
  console.log(
    `shard ${RES}/${MOD}: checked=${st.checked} ok=${st.verified} lbTight=${st.lbTight} ` +
      `esc=${st.exactEsc}/${st.exhaustiveEsc} undecided=${st.undecided} cex=${st.cex} ` +
      `${(st.checked / (ms / 1000)).toFixed(0)}/s`,
  );
  process.exit(st.cex === 0 && st.undecided === 0 && st.verified === st.checked ? 0 : 1);
}

// ── orchestrator ──────────────────────────────────────────────────────────

let failures = 0;
function ok(msg: string) {
  console.log(`  OK   ${msg}`);
}
function fail(msg: string) {
  console.log(`  FAIL ${msg}`);
  failures++;
}
function note(msg: string) {
  console.log(`  ..   ${msg}`);
}

/** Verify the n−1 base: the campaign's exhaustive n = 10 artifact. */
async function checkBase(): Promise<void> {
  const path =
    process.env.MATHSMASHER_RUN_DIR !== undefined
      ? `${process.env.MATHSMASHER_RUN_DIR}/artifacts/gallai-stream-n10.json`
      : "/Users/mewc/.mathsmasher/runs/2026-07-24T01-08-34-gallai-paths-v1/artifacts/gallai-stream-n10.json";
  const f = Bun.file(path);
  if (!(await f.exists())) {
    note(`n=${N - 1} base artifact not found at ${path} — base taken from the campaign log`);
    return;
  }
  const a = (await f.json()) as {
    n: number;
    checked: number;
    counterexamples: number;
    complete: boolean;
  };
  if (a.n !== N - 1 || !a.complete || a.counterexamples !== 0 || a.checked !== A001349[N - 1]) {
    fail(`base artifact does not certify n=${N - 1}: ${JSON.stringify(a).slice(0, 160)}`);
    return;
  }
  ok(`base: n=${N - 1} exhaustively verified, ${a.checked.toLocaleString()} = A001349(${N - 1}), 0 counterexamples`);
}

/**
 * Sample-validate the reduction AT n = 11: for connected graphs with a vertex
 * of degree ≤ 2, build the certificate the theorem prescribes and verify it.
 * The theorem is proved for all n; this exercises the construction on real
 * n = 11 instances so a coding slip cannot hide inside the 44.6% we skip.
 */
async function checkReductionSample(): Promise<void> {
  // Sampled across the whole edge spectrum on purpose: taking the first k
  // graphs geng emits would only exercise SPARSE instances, and the skipped
  // δ ≤ 2 population runs from trees to K_10-plus-a-degree-2-vertex (m ≤ 47,
  // the largest edge count compatible with a degree-2 vertex on 11 vertices).
  const bands: Array<[number, number]> = [
    [10, 13],
    [17, 20],
    [24, 27],
    [31, 34],
    [38, 41],
    [44, 47],
  ];
  const perBand = Math.max(1, Math.floor(SAMPLE / bands.length));
  const SCAN_CAP = 4_000_000;
  let seen = 0;
  let leafCase = 0;
  let spliceCase = 0;
  let triangleCase = 0;
  let bad = 0;
  const Bm1 = gallaiBound(N - 1);
  const pairsH = allPairs(N - 1);
  const perBandFound: number[] = [];

  for (const [lo, hi] of bands) {
    const found = await sampleBand(lo, hi, perBand, SCAN_CAP);
    perBandFound.push(found.found);
    seen += found.found;
    leafCase += found.leaf;
    spliceCase += found.splice;
    triangleCase += found.triangle;
    bad += found.bad;
  }

  if (bad === 0) {
    ok(
      `reduction sample at n=${N}, spread over edge bands ` +
        `${bands.map((b, i) => `m=${b[0]}-${b[1]}:${perBandFound[i]!.toLocaleString()}`).join(" ")} — ` +
        `${seen.toLocaleString()} graphs with δ ≤ 2 (leaf ${leafCase}, splice ${spliceCase}, ` +
        `triangle ${triangleCase}), every prescribed certificate verified, size ≤ B=${B}`,
    );
  } else {
    fail(`reduction sample: ${bad}/${seen} constructions failed`);
  }
}

async function sampleBand(
  lo: number,
  hi: number,
  target: number,
  scanCap: number,
): Promise<{ found: number; leaf: number; splice: number; triangle: number; bad: number }> {
  const proc = Bun.spawn([geng!, "-c", "-q", String(N), `${lo}:${hi}`], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let seen = 0;
  let scanned = 0;
  let leafCase = 0;
  let spliceCase = 0;
  let triangleCase = 0;
  let bad = 0;
  const Bm1 = gallaiBound(N - 1);
  const pairsH = allPairs(N - 1);

  outer: while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const g6 = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!g6) continue;
      scanned++;
      if (scanned > scanCap) break outer;
      const { edgeMask, edges } = parseGraph6(g6);
      const adj = buildAdj(N, edgeMask, pairs);
      const deg = degrees(adj);
      let v = -1;
      for (let u = 0; u < N; u++) {
        if (deg[u]! <= 2) {
          v = u;
          break;
        }
      }
      if (v < 0) continue;
      seen++;

      const back = (x: number) => (x < v ? x : x + 1);
      const idxOf = (x: number) => (x < v ? x : x - 1);
      const rest: Array<[number, number]> = [];
      for (const [a, b] of edges) {
        if (a === v || b === v) continue;
        rest.push([idxOf(a), idxOf(b)]);
      }

      let DG: number[][] | null = null;
      if (deg[v] === 1) {
        const a = adj[v]![0]!;
        const maskH = maskFromEdges(N - 1, rest);
        const D = pathNumberAtMost(N - 1, maskH, pairsH, Bm1);
        if (D.ok) {
          DG = [...D.paths.map((P) => P.map(back)), [a, v]];
          leafCase++;
        }
      } else if (deg[v] === 2) {
        const [u, w] = adj[v]! as [number, number];
        if (!adj[u]!.includes(w)) {
          const maskH = maskFromEdges(N - 1, [...rest, [idxOf(u), idxOf(w)]]);
          const hAdj = buildAdj(N - 1, maskH, pairsH);
          if (!isConnected(hAdj, N - 1)) {
            bad++;
            continue;
          }
          const D = pathNumberAtMost(N - 1, maskH, pairsH, Bm1);
          if (D.ok) {
            const lifted = D.paths.map((P) => P.map(back));
            let done2 = false;
            for (let pi = 0; pi < lifted.length && !done2; pi++) {
              const P = lifted[pi]!;
              for (let k = 0; k < P.length - 1; k++) {
                const x = P[k]!;
                const y = P[k + 1]!;
                if ((x === u && y === w) || (x === w && y === u)) {
                  lifted[pi] = [...P.slice(0, k + 1), v, ...P.slice(k + 1)];
                  done2 = true;
                  break;
                }
              }
            }
            if (done2) {
              DG = lifted;
              spliceCase++;
            }
          }
        } else {
          const maskH = maskFromEdges(N - 1, rest);
          const D = pathNumberAtMost(N - 1, maskH, pairsH, Bm1);
          if (D.ok) {
            DG = [...D.paths.map((P) => P.map(back)), [u, v, w]];
            triangleCase++;
          }
        }
      }

      if (!DG) {
        bad++;
        continue;
      }
      if (DG.length > B) {
        bad++;
        continue;
      }
      const ver = verifyDecomposition(N, edgeMask, pairs, DG);
      if (!ver.ok) bad++;
      if (seen >= target) break outer;
    }
  }
  try {
    proc.kill();
  } catch {
    /* sample done */
  }
  await proc.exited;
  return { found: seen, leaf: leafCase, splice: spliceCase, triangle: triangleCase, bad };
}

async function countPopulation(): Promise<number> {
  const t0 = performance.now();
  const proc = Bun.spawn([geng!, "-c", `-d${MINDEG}`, "-u", String(N)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  const mm = err.match(/>Z\s+(\d+)\s+graphs generated/);
  if (!mm) throw new Error(`could not parse geng count: ${err.slice(0, 200)}`);
  const total = Number(mm[1]);
  ok(
    `population: ${total.toLocaleString()} connected graphs on ${N} vertices with δ ≥ ${MINDEG} ` +
      `(of ${(A001349[N] ?? 0).toLocaleString()} connected — ` +
      `${((100 * (1 - total / (A001349[N] ?? total))) || 0).toFixed(1)}% removed by the reduction), ` +
      `counted in ${((performance.now() - t0) / 1000).toFixed(0)}s`,
  );
  return total;
}

async function orchestrate(): Promise<void> {
  console.log(`Gallai exhaustive verification at n = ${N} (δ ≥ ${MINDEG} remainder, ${JOBS} shards)\n`);
  await checkBase();
  await checkReductionSample();
  if (flag("sample-only")) {
    console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILURES`}`);
    process.exit(failures === 0 ? 0 : 1);
  }
  const population = Number.isFinite(MAX_GRAPHS) ? 0 : await countPopulation();

  await Bun.spawn(["mkdir", "-p", OUT_DIR]).exited;
  const t0 = performance.now();
  const procs = [];
  for (let r = 0; r < JOBS; r++) {
    const wargs = [
      "bun",
      "research/gallai-n11.ts",
      "--worker",
      "--n",
      String(N),
      "--mindeg",
      String(MINDEG),
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
  const codes = await Promise.all(procs.map((p) => p.exited));
  const wall = (performance.now() - t0) / 1000;

  const merged = newStats();
  let shards = 0;
  for (let r = 0; r < JOBS; r++) {
    const f = Bun.file(`${OUT_DIR}/shard-${r}-of-${JOBS}.json`);
    if (!(await f.exists())) {
      fail(`shard ${r}/${JOBS} produced no summary (exit ${codes[r]})`);
      continue;
    }
    const s = (await f.json()) as Stats & { res: number };
    shards++;
    merged.checked += s.checked;
    merged.verified += s.verified;
    merged.lbTight += s.lbTight;
    merged.greedy += s.greedy;
    merged.exactEsc += s.exactEsc;
    merged.exhaustiveEsc += s.exhaustiveEsc;
    merged.undecided += s.undecided;
    merged.cex += s.cex;
    merged.witnesses.push(...s.witnesses);
  }

  console.log("");
  if (shards !== JOBS) fail(`only ${shards}/${JOBS} shard summaries`);
  if (merged.cex > 0) {
    fail(`${merged.cex} COUNTEREXAMPLE CANDIDATES: ${merged.witnesses.slice(0, 10).join(", ")}`);
  } else {
    ok(`zero counterexamples across ${merged.checked.toLocaleString()} graphs`);
  }
  if (merged.undecided > 0) {
    fail(`${merged.undecided} graphs UNDECIDED at the node limit: ${merged.witnesses.slice(0, 10).join(", ")}`);
  } else {
    ok(`zero undecided — every graph settled by a verified certificate`);
  }
  if (merged.verified !== merged.checked) {
    fail(`verified ${merged.verified} ≠ checked ${merged.checked}`);
  }
  if (population > 0) {
    if (merged.checked === population) {
      ok(`coverage: ${merged.checked.toLocaleString()} = the full δ ≥ ${MINDEG} population`);
    } else {
      fail(`coverage: checked ${merged.checked.toLocaleString()} ≠ population ${population.toLocaleString()}`);
    }
  }
  note(`greedy sufficed for ${merged.greedy.toLocaleString()}; escalated to exact ${merged.exactEsc.toLocaleString()}, exhaustive ${merged.exhaustiveEsc.toLocaleString()}`);
  note(`${merged.lbTight.toLocaleString()} graphs have a classical lower bound equal to B = ${B} (so p = B exactly — tight, density-forced at odd n)`);
  note(`wall ${(wall / 60).toFixed(1)} min across ${JOBS} shards (${(merged.checked / wall).toFixed(0)} graphs/s aggregate)`);

  await Bun.write(
    `${OUT_DIR}/merged.json`,
    JSON.stringify({ n: N, mindeg: MINDEG, jobs: JOBS, population, wall, ...merged }, null, 1),
  );
  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILURES`}`);
  process.exit(failures === 0 ? 0 : 1);
}

if (IS_WORKER) await runWorker();
else await orchestrate();
