/**
 * Gallai tight-graph structure inventory (exact, unlabeled via geng).
 *
 * For each n ≤ N: among connected graphs with path_number = ceil(n/2),
 * classify by combinatorial lower-bound source and crude structural type.
 *
 * Also certifies the classical observation:
 *   p(G) ≥ max( ceil(odd/2), max ceil(deg/2), ceil(m/(n-1)) )
 * and records which bound forces tightness.
 *
 * Run: bun research/gallai-tight-structure.ts --n 8
 * Exit 0 if inventory completes without engine failure.
 */

import {
  allPairs,
  buildAdj,
  degrees,
  edgeCount,
  gallaiBound,
  parseGraph6,
  pathNumberAtMost,
  pairIndex,
  verifyDecomposition,
} from "./gallai-lib.ts";

const args = process.argv.slice(2);
function opt(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
}
const MAX_N = Number(opt("n", "8"));
const RUN_DIR =
  opt(
    "run-dir",
    process.env.MATHSMASHER_RUN_DIR ??
      "/Users/mewc/.mathsmasher/runs/2026-07-24T01-08-34-gallai-paths-v1",
  );

async function gengConnected(n: number): Promise<string[]> {
  if (n === 1) return ["@"];
  const geng = Bun.which("geng");
  if (!geng) throw new Error("geng not on PATH");
  const proc = Bun.spawn([geng, "-c", "-q", String(n)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const code = await proc.exited;
  if (code !== 0) throw new Error(`geng failed ${code}`);
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

type LowerSource = "odd" | "maxdeg" | "edges" | "mixed" | "none";

function lowerSources(deg: number[], m: number, n: number): {
  odd: number;
  maxHalf: number;
  byEdges: number;
  total: number;
  source: LowerSource;
} {
  let odd = 0;
  let maxHalf = 0;
  for (const d of deg) {
    if (d & 1) odd++;
    const h = (d + 1) >> 1;
    if (h > maxHalf) maxHalf = h;
  }
  const byOdd = (odd + 1) >> 1;
  const byEdges = n <= 1 ? 0 : Math.ceil(m / (n - 1));
  const total = Math.max(byOdd, maxHalf, byEdges);
  const hits = [
    byOdd === total ? "odd" : null,
    maxHalf === total ? "maxdeg" : null,
    byEdges === total ? "edges" : null,
  ].filter(Boolean) as Array<"odd" | "maxdeg" | "edges">;
  let source: LowerSource;
  if (hits.length === 0) source = "none";
  else if (hits.length === 1) source = hits[0]!;
  else source = "mixed";
  return { odd: byOdd, maxHalf, byEdges, total, source };
}

function structuralTag(deg: number[], n: number): string {
  const sorted = [...deg].sort((a, b) => b - a);
  const maxd = sorted[0] ?? 0;
  const mind = sorted[sorted.length - 1] ?? 0;
  if (maxd === n - 1 && sorted.filter((d) => d === 1).length === n - 1) return "star";
  if (mind === n - 1) return "complete";
  if (maxd === n - 1) return "has_universal_vertex";
  if (mind >= n - 3) return "near_complete_min_deg";
  if (sorted.filter((d) => d === 1).length >= 3) return "many_leaves";
  return "other";
}

type Row = {
  n: number;
  tight: number;
  graphs: number;
  bySource: Record<string, number>;
  byTag: Record<string, number>;
  /** tight graphs where combinatorial lb < Gallai bound (structure forces extra paths) */
  structureForced: number;
  structureForcedSamples: Array<{
    m: number;
    deg: number[];
    lb: number;
    p: number;
    g6: string;
    tag: string;
  }>;
  mHistogram: Record<string, number>;
};

const rows: Row[] = [];

console.log("Gallai tight-structure inventory (unlabeled, exact)\n");

for (let n = 2; n <= MAX_N; n++) {
  const bound = gallaiBound(n);
  const pairs = allPairs(n);
  const graphs = await gengConnected(n);
  const bySource: Record<string, number> = {};
  const byTag: Record<string, number> = {};
  const mHistogram: Record<string, number> = {};
  let tight = 0;
  let structureForced = 0;
  const structureForcedSamples: Row["structureForcedSamples"] = [];

  for (const g6 of graphs) {
    const { edgeMask, edges } = parseGraph6(g6);
    const adj = buildAdj(n, edgeMask, pairs);
    const deg = degrees(adj);
    const m = edgeCount(edgeMask);
    const ls = lowerSources(deg, m, n);

    // need p ≤ bound first
    const within = pathNumberAtMost(n, edgeMask, pairs, bound);
    if (!within.ok) {
      console.error(`COUNTEREXAMPLE n=${n} g6=${g6}`);
      process.exit(1);
    }

    let p = within.num;
    let paths = within.paths;
    if (ls.total === bound) {
      p = bound;
    } else if (within.num === bound) {
      const better = pathNumberAtMost(n, edgeMask, pairs, bound - 1);
      if (better.ok) {
        p = better.num;
        paths = better.paths;
      } else {
        p = bound;
      }
    } else {
      p = within.num;
    }

    if (p !== bound) continue;
    tight++;
    bySource[ls.source] = (bySource[ls.source] ?? 0) + 1;
    const tag = structuralTag(deg, n);
    byTag[tag] = (byTag[tag] ?? 0) + 1;
    mHistogram[String(m)] = (mHistogram[String(m)] ?? 0) + 1;

    // certify decomp
    const v = verifyDecomposition(n, edgeMask, pairs, paths);
    if (!v.ok) throw new Error(`bad tight cert: ${v.reason}`);

    if (ls.total < bound) {
      structureForced++;
      if (structureForcedSamples.length < 15) {
        structureForcedSamples.push({
          m,
          deg,
          lb: ls.total,
          p,
          g6,
          tag,
        });
      }
    }
  }

  const row: Row = {
    n,
    tight,
    graphs: graphs.length,
    bySource,
    byTag,
    structureForced,
    structureForcedSamples,
    mHistogram,
  };
  rows.push(row);

  console.log(
    `n=${n} bound=${bound}: tight=${tight}/${graphs.length} structureForced=${structureForced}`,
  );
  console.log(`  sources: ${JSON.stringify(bySource)}`);
  console.log(`  tags:    ${JSON.stringify(byTag)}`);
  if (structureForcedSamples.length) {
    console.log(`  structure-forced samples:`);
    for (const s of structureForcedSamples.slice(0, 5)) {
      console.log(
        `    m=${s.m} deg=[${s.deg.join(",")}] lb=${s.lb} p=${s.p} tag=${s.tag} g6=${s.g6}`,
      );
    }
  }
}

// Machine lemma: for every tight G on n≤MAX_N, either
//   (A) maxdeg ≥ n-1  (universal vertex / star-like), or
//   (B) ceil(m/(n-1)) = ceil(n/2)  (edge-density forces), or
//   (C) structureForced with other reason — catalogued
// Check whether (A)∪(B) covers all tight for small n.

console.log("\n── Coverage of density/universal lemmas ──");
for (const row of rows) {
  const n = row.n;
  const bound = gallaiBound(n);
  const pairs = allPairs(n);
  const graphs = await gengConnected(n);
  let coveredAB = 0;
  let onlyStructure = 0;
  for (const g6 of graphs) {
    const { edgeMask } = parseGraph6(g6);
    const adj = buildAdj(n, edgeMask, pairs);
    const deg = degrees(adj);
    const m = edgeCount(edgeMask);
    const ls = lowerSources(deg, m, n);
    const within = pathNumberAtMost(n, edgeMask, pairs, bound);
    if (!within.ok) process.exit(1);
    let p = within.num;
    if (ls.total === bound) p = bound;
    else if (within.num === bound) {
      const better = pathNumberAtMost(n, edgeMask, pairs, bound - 1);
      if (!better.ok) p = bound;
      else p = better.num;
    }
    if (p !== bound) continue;
    const hasUniv = deg.some((d) => d === n - 1);
    const densityTight = ls.byEdges === bound;
    if (hasUniv || densityTight) coveredAB++;
    else onlyStructure++;
  }
  console.log(
    `  n=${n}: tight covered by universal∨density=${coveredAB}, other=${onlyStructure}`,
  );
}

const artDir = `${RUN_DIR}/artifacts`;
await Bun.write(
  `${artDir}/gallai-tight-structure.json`,
  JSON.stringify(
    {
      claim: "Inventory of Gallai-tight graphs (p = ceil(n/2)) for n≤N unlabeled.",
      maxN: MAX_N,
      rows,
    },
    null,
    2,
  ),
);
console.log(`\nWrote ${artDir}/gallai-tight-structure.json`);
console.log("Done (structure inventory only — not a general proof).");
process.exit(0);
