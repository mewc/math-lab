/**
 * Does the odd-order tightness characterization survive at n = 11?
 *
 * Turn 7 observed (verified n ≤ 9): at ODD order every TIGHT graph is
 * density-forced, 2m > (n−1)². At n = 11 that reads m ≥ 51, and turn 8's sweep
 * confirmed the easy half — exactly 20 graphs have a classical lower bound of 6
 * and all 20 are tight. This script attacks the HARD half in the band where it
 * is most likely to break:
 *
 *   Is there a connected graph on 11 vertices with m ≤ 50 that still needs 6
 *   paths — i.e. a STRUCTURE-forced tight graph at odd order?
 *
 * Why the top band is the danger zone: B(11) − 1 = 5 paths hold at most
 * 5·10 = 50 edges, so a graph with m = 50 fits into 5 paths only if it splits
 * into 5 HAMILTONIAN paths exactly, with no slack anywhere. m = 49 leaves one
 * spare edge, and so on. If the characterization fails at n = 11, it fails here.
 *
 * Method, decisive in both directions:
 *   · lb ≥ 6  →  density-forced tight, counted and skipped (already known).
 *   · else try `pathNumberAtMost(5)`; a hit is a verified certificate for p ≤ 5,
 *     so the graph is NOT tight.
 *   · else `decompWithEndpointsExact(budget 5)` — EXHAUSTIVE. A decomposition
 *     is verified; a null is a PROOF that p = 6, i.e. a structure-forced tight
 *     graph at odd order, which would FALSIFY the turn-7 observation.
 *   · node limit hit  →  reported as undecided, never as either verdict.
 *
 * Either outcome is a result. Falsification would be the more interesting one.
 *
 * Run:
 *   bun research/gallai-n11-census.ts                 # m = 46..50
 *   bun research/gallai-n11-census.ts --lo 41 --hi 50
 *   bun research/gallai-n11-census.ts --n 9 --lo 25 --hi 36   # replicate n=9
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

const N = Number(opt("n", "11"));
const B = gallaiBound(N);
const LO = Number(opt("lo", "46"));
const HI = Number(opt("hi", String((N * (N - 1)) / 2)));
const NODE_LIMIT = Number(opt("node-limit", "60000000"));
const pairs = allPairs(N);

const geng = Bun.which("geng");
if (!geng) throw new Error("geng not on PATH (brew install nauty)");

console.log(
  `Odd-order tightness census, n=${N}, B=${B}, edge band m=${LO}..${HI}\n` +
    `  density-forced threshold: m > (n−1)²/2 = ${((N - 1) * (N - 1)) / 2}\n` +
    `  question: any graph with lb < ${B} that still needs ${B} paths?\n`,
);

let total = 0;
let densityForced = 0;
let notTight = 0;
let structureForced = 0;
let undecided = 0;
const structural: string[] = [];
const undecidedList: string[] = [];
const perEdge = new Map<number, { n: number; dens: number; loose: number; struct: number }>();

const t0 = performance.now();

for (let m = LO; m <= HI; m++) {
  const proc = Bun.spawn([geng, "-c", "-q", String(N), `${m}:${m}`], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  const graphs = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const row = { n: graphs.length, dens: 0, loose: 0, struct: 0 };

  for (const g6 of graphs) {
    total++;
    const { edgeMask } = parseGraph6(g6);
    const deg = degrees(buildAdj(N, edgeMask, pairs));
    const lb = pathLowerBound(deg, edgeCount(edgeMask), N);
    if (lb >= B) {
      densityForced++;
      row.dens++;
      continue;
    }

    const quick = pathNumberAtMost(N, edgeMask, pairs, B - 1);
    if (quick.ok) {
      const v = verifyDecomposition(N, edgeMask, pairs, quick.paths);
      if (!v.ok) throw new Error(`bad cert for ${g6}: ${v.reason}`);
      notTight++;
      row.loose++;
      continue;
    }

    try {
      const ex = decompWithEndpointsExact(N, edgeMask, pairs, B - 1, [], NODE_LIMIT);
      if (ex.paths) {
        const v = verifyDecomposition(N, edgeMask, pairs, ex.paths);
        if (!v.ok) throw new Error(`bad exhaustive cert for ${g6}: ${v.reason}`);
        notTight++;
        row.loose++;
      } else {
        // p = B with lb < B: structure-forced tight at odd order.
        structureForced++;
        row.struct++;
        if (structural.length < 25) structural.push(`m=${m} ${g6} lb=${lb}`);
      }
    } catch (e) {
      if (!(e instanceof SearchLimitExceeded)) throw e;
      undecided++;
      if (undecidedList.length < 25) undecidedList.push(`m=${m} ${g6}`);
    }
  }

  perEdge.set(m, row);
  console.log(
    `  m=${String(m).padStart(2)}: ${String(graphs.length).padStart(7)} graphs  ` +
      `density-forced=${String(row.dens).padStart(6)}  p≤${B - 1}=${String(row.loose).padStart(7)}  ` +
      `structure-forced tight=${row.struct}`,
  );
}

const secs = (performance.now() - t0) / 1000;
console.log(
  `\n${total.toLocaleString()} graphs in band; ${densityForced.toLocaleString()} density-forced tight, ` +
    `${notTight.toLocaleString()} certified p ≤ ${B - 1}, ${structureForced} structure-forced tight, ` +
    `${undecided} undecided — ${secs.toFixed(1)}s`,
);

if (undecided > 0) {
  console.log(`\n  ..   UNDECIDED at the ${NODE_LIMIT.toLocaleString()}-node limit (no verdict claimed):`);
  for (const u of undecidedList) console.log(`         ${u}`);
}

if (structureForced > 0) {
  console.log(
    `\n  !!   FALSIFIED: ${structureForced} graph(s) on ${N} vertices with m ≤ ${HI} need ${B} paths ` +
      `despite a classical lower bound below ${B}. The turn-7 observation ` +
      `"odd-order tight ⇒ density-forced" is FALSE at n = ${N}:`,
  );
  for (const s of structural) console.log(`         ${s}`);
} else if (undecided === 0) {
  console.log(
    `\n  OK   no structure-forced tight graph in m=${LO}..${HI}: every graph there with a ` +
      `lower bound below ${B} was certified into ${B - 1} paths, so the characterization ` +
      `survives the hardest band at n = ${N}`,
  );
}

process.exit(undecided > 0 ? 1 : 0);
