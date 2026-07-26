/**
 * Resolve the graphs the n = 10 tight census left undecided.
 *
 * `gallai-tight10.ts` decides 11,716,571 graphs at budget B − 1 = 4 and leaves a
 * handful undecided at its 3M-node limit. Those cluster at m = 34, 35, 36, which
 * is exactly where the question is hardest: 4 paths hold at most 4·9 = 36 edges,
 * so at m = 36 a 4-path decomposition must be four HAMILTONIAN paths with zero
 * slack, and at m = 35, 34 there is one or two edges of room. A sparse tail
 * (m = 21..33) is hard for the opposite reason — lots of room, so the search
 * space is enormous.
 *
 * Each graph is decided exhaustively with a large node budget. Verdicts:
 *   · a verified 4-path decomposition  ⇒ NOT tight;
 *   · an exhaustive null                ⇒ p = 5 with lb < 5, i.e. STRUCTURE-forced
 *     tight (a 5-path certificate is produced too, pinning p = 5 both ways);
 *   · node limit reached                ⇒ still undecided, reported as such.
 *
 * Run:
 *   bun research/gallai-tight10-resolve.ts --file undecided.txt --jobs 14
 *   bun research/gallai-tight10-resolve.ts --file u.txt --worker --res 0 --mod 14
 */

import {
  allPairs,
  buildAdj,
  decompWithEndpointsExact,
  degrees,
  edgeCount,
  gallaiBound,
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

const FILE = opt("file", "");
const JOBS = Number(opt("jobs", "14"));
const RES = Number(opt("res", "0"));
const MOD = Number(opt("mod", "1"));
const NODE_LIMIT = Number(opt("node-limit", "400000000"));
const OUT_DIR = opt("out-dir", "/tmp/gallai-tight10");
if (!FILE) throw new Error("--file required");

const lines = (await Bun.file(FILE).text()).split("\n").map((l) => l.trim()).filter(Boolean);

type Verdict = { g6: string; m: number; verdict: "not-tight" | "struct-tight" | "undecided"; nodes: number; ms: number };

async function runWorker(): Promise<void> {
  const out: Verdict[] = [];
  for (let i = RES; i < lines.length; i += MOD) {
    const g6 = lines[i]!;
    const { n, edgeMask } = parseGraph6(g6);
    const pairs = allPairs(n);
    const B = gallaiBound(n);
    const m = edgeCount(edgeMask);
    const t0 = performance.now();
    let verdict: Verdict["verdict"] = "undecided";
    let nodes = 0;
    try {
      const ex = decompWithEndpointsExact(n, edgeMask, pairs, B - 1, [], NODE_LIMIT);
      nodes = ex.nodes;
      if (ex.paths) {
        const v = verifyDecomposition(n, edgeMask, pairs, ex.paths);
        if (!v.ok) throw new Error(`bad certificate for ${g6}: ${v.reason}`);
        verdict = "not-tight";
      } else {
        const deg = degrees(buildAdj(n, edgeMask, pairs));
        if (pathLowerBound(deg, m, n) >= B) throw new Error(`${g6} should have been lb-forced`);
        const at = pathNumberAtMost(n, edgeMask, pairs, B);
        if (!at.ok || !verifyDecomposition(n, edgeMask, pairs, at.paths).ok) {
          throw new Error(`${g6}: refuted at ${B - 1} but no verified ${B}-path certificate`);
        }
        verdict = "struct-tight";
      }
    } catch (e) {
      if (!(e instanceof SearchLimitExceeded)) throw e;
      nodes = e.nodes;
    }
    const ms = performance.now() - t0;
    out.push({ g6, m, verdict, nodes, ms });
    console.log(`  ${g6} m=${m} → ${verdict} (${(nodes / 1e6).toFixed(1)}M nodes, ${(ms / 1000).toFixed(1)}s)`);
  }
  await Bun.write(`${OUT_DIR}/resolve-${RES}-of-${MOD}.json`, JSON.stringify(out, null, 1));
}

async function orchestrate(): Promise<void> {
  console.log(`Resolving ${lines.length} undecided graphs, ${JOBS} shards, node limit ${NODE_LIMIT.toLocaleString()}\n`);
  await Bun.spawn(["mkdir", "-p", OUT_DIR]).exited;
  const procs = [];
  for (let r = 0; r < JOBS; r++) {
    procs.push(
      Bun.spawn(
        [
          "bun",
          "research/gallai-tight10-resolve.ts",
          "--file",
          FILE,
          "--worker",
          "--res",
          String(r),
          "--mod",
          String(JOBS),
          "--out-dir",
          OUT_DIR,
          "--node-limit",
          String(NODE_LIMIT),
        ],
        { stdout: "inherit", stderr: "inherit" },
      ),
    );
  }
  await Promise.all(procs.map((p) => p.exited));

  const all: Verdict[] = [];
  for (let r = 0; r < JOBS; r++) {
    const f = Bun.file(`${OUT_DIR}/resolve-${r}-of-${JOBS}.json`);
    if (await f.exists()) all.push(...((await f.json()) as Verdict[]));
  }
  const notTight = all.filter((v) => v.verdict === "not-tight");
  const struct = all.filter((v) => v.verdict === "struct-tight");
  const undec = all.filter((v) => v.verdict === "undecided");
  console.log(`\n  resolved ${all.length}: not tight ${notTight.length}, structure-forced tight ${struct.length}, still undecided ${undec.length}`);
  if (struct.length) {
    console.log(`  structure-forced tight among the previously undecided:`);
    for (const v of struct) console.log(`    ${v.g6} m=${v.m}`);
  }
  if (undec.length) {
    console.log(`  STILL UNDECIDED at ${NODE_LIMIT.toLocaleString()} nodes (no verdict):`);
    for (const v of undec) console.log(`    ${v.g6} m=${v.m}`);
  }
  await Bun.write(`${OUT_DIR}/resolved.json`, JSON.stringify(all, null, 1));
  console.log(`\n${undec.length === 0 ? "ALL RESOLVED" : `${undec.length} STILL UNDECIDED`}`);
  process.exit(0);
}

if (flag("worker")) await runWorker();
else await orchestrate();
