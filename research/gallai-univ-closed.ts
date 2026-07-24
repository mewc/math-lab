/**
 * Universal-vertex merge with forced H-endpoint reoptimization.
 *
 * For connected G on n ≤ N with a universal vertex v:
 *   1. Decompose H = G−v under budget B_H (exact engine).
 *   2. Greedy star-merge: extend H-path ends with v, pair remaining star edges.
 *   3. If size > B: re-decompose H with forced endpoints to maximize star absorption,
 *      or fall back to exact on G.
 *
 * Exit 0 if every universal-vertex connected graph n≤N has a certified decomp
 * of size ≤ ceil(n/2). Documents merge-closed vs exact-fallback counts.
 *
 * Run: bun research/gallai-univ-closed.ts
 *      bun research/gallai-univ-closed.ts --univ-n 9
 */

import {
  allPairs,
  buildAdj,
  degrees,
  edgeCount,
  gallaiBound,
  maskFromEdges,
  parseGraph6,
  pathNumberAtMost,
  exactPathNumber,
  verifyDecomposition,
  decompWithEndpoint,
} from "./gallai-lib.ts";

const args = process.argv.slice(2);
function opt(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
}
function flag(name: string): boolean {
  return args.includes(`--${name}`);
}

const UNIV_N = Number(opt("univ-n", "9"));
const RUN_DIR =
  opt(
    "run-dir",
    process.env.MATHSMASHER_RUN_DIR ??
      "/Users/mewc/.mathsmasher/runs/2026-07-24T01-08-34-gallai-paths-v1",
  );
const WRITE = !flag("no-artifacts");

let failures = 0;
function ok(msg: string) {
  console.log(`  OK  ${msg}`);
}
function fail(msg: string) {
  console.log(`  FAIL ${msg}`);
  failures++;
}

async function gengConnected(n: number): Promise<string[]> {
  const geng = Bun.which("geng");
  if (!geng) throw new Error("geng not on PATH");
  if (n === 1) return ["@"];
  const proc = Bun.spawn([geng, "-c", "-q", String(n)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

/**
 * Merge star edges through universal v into H-path decomp.
 * Each H-path can absorb at most one star edge per free end.
 * Remaining star neighbors paired as (s1,v,s2) or (s,v).
 */
function universalMerge(
  n: number,
  v: number,
  hPaths: number[][],
  starNeighbors: number[],
): number[][] {
  const S = new Set(starNeighbors);
  const out: number[][] = [];

  for (const P of hPaths) {
    if (P.length < 2) continue;
    const a = P[0]!;
    const b = P[P.length - 1]!;
    if (S.has(a) && S.has(b) && a !== b) {
      // Absorb both ends: path a-...-b becomes v-a-...-b-v? That would be a trail
      // through v twice — not a simple path. Absorb only one end.
      S.delete(a);
      out.push([v, ...P]);
    } else if (S.has(a)) {
      S.delete(a);
      out.push([v, ...P]);
    } else if (S.has(b)) {
      S.delete(b);
      out.push([...P, v]);
    } else {
      out.push(P.slice());
    }
  }

  const rem = [...S];
  let i = 0;
  while (i + 1 < rem.length) {
    out.push([rem[i]!, v, rem[i + 1]!]);
    i += 2;
  }
  if (i < rem.length) out.push([rem[i]!, v]);
  return out;
}

async function main() {
  console.log(`Gallai universal-vertex closed merge (n≤${UNIV_N})\n`);
  let total = 0;
  let mergeOk = 0;
  let mergeForcedOk = 0;
  let exactFallback = 0;
  let failC = 0;

  for (let n = 2; n <= UNIV_N; n++) {
    const bound = gallaiBound(n);
    const graphs = await gengConnected(n);
    const pairs = allPairs(n);
    let univ = 0;
    let mOk = 0;
    let mForced = 0;
    let mExact = 0;
    const t0 = performance.now();

    for (const g6 of graphs) {
      const { edgeMask, edges } = parseGraph6(g6);
      const adj = buildAdj(n, edgeMask, pairs);
      const deg = degrees(adj);
      let v = -1;
      for (let u = 0; u < n; u++) {
        if (deg[u] === n - 1) {
          v = u;
          break;
        }
      }
      if (v < 0) continue;
      univ++;
      total++;

      const oldToNew = new Int32Array(n).fill(-1);
      const newToOld: number[] = [];
      for (let u = 0; u < n; u++) {
        if (u === v) continue;
        oldToNew[u] = newToOld.length;
        newToOld.push(u);
      }
      const nH = n - 1;
      const pairsH = allPairs(nH);
      const edgesH: Array<[number, number]> = [];
      for (const [a, b] of edges) {
        if (a === v || b === v) continue;
        edgesH.push([oldToNew[a]!, oldToNew[b]!]);
      }
      const maskH = maskFromEdges(nH, edgesH);
      const bH = gallaiBound(nH);
      const starNeighbors: number[] = [];
      for (let u = 0; u < n; u++) if (u !== v) starNeighbors.push(u);

      // Plain merge
      let hPathsNew: number[][] = [];
      if (edgeCount(maskH) > 0) {
        const r = pathNumberAtMost(nH, maskH, pairsH, bH);
        hPathsNew = r.ok
          ? r.paths
          : exactPathNumber(nH, maskH, pairsH, Math.max(bH + 2, nH)).paths;
      }
      const hPaths = hPathsNew.map((P) => P.map((x) => newToOld[x]!));
      let merged = universalMerge(n, v, hPaths, starNeighbors);
      let check = verifyDecomposition(n, edgeMask, pairs, merged);
      if (check.ok && merged.length <= bound) {
        mOk++;
        mergeOk++;
        continue;
      }

      // Multi forced-endpoint candidates
      let found = false;
      if (edgeCount(maskH) > 0) {
        const tryH = Array.from({ length: nH }, (_, i) => i);
        for (const h of tryH) {
          const f = decompWithEndpoint(nH, maskH, pairsH, bH, h);
          if (!f) continue;
          const mapped = f.map((P) => P.map((x) => newToOld[x]!));
          merged = universalMerge(n, v, mapped, starNeighbors);
          check = verifyDecomposition(n, edgeMask, pairs, merged);
          if (check.ok && merged.length <= bound) {
            found = true;
            break;
          }
        }
      } else {
        // H empty: pure star — classic pairing
        merged = universalMerge(n, v, [], starNeighbors);
        check = verifyDecomposition(n, edgeMask, pairs, merged);
        found = check.ok && merged.length <= bound;
      }

      if (found) {
        mForced++;
        mergeForcedOk++;
        continue;
      }

      const full = pathNumberAtMost(n, edgeMask, pairs, bound);
      if (full.ok) {
        mExact++;
        exactFallback++;
      } else {
        fail(`universal Gallai fail ${g6}`);
        failC++;
      }
    }
    const ms = performance.now() - t0;
    console.log(
      `  n=${n}: univ=${univ} merge=${mOk} forcedMerge=${mForced} exact=${mExact} (${ms.toFixed(0)}ms)`,
    );
  }

  ok(
    `universal-vertex n≤${UNIV_N}: total=${total} plainMerge=${mergeOk} forcedMerge=${mergeForcedOk} exact=${exactFallback} fail=${failC}`,
  );
  if (exactFallback === 0 && failC === 0) {
    ok("CLOSED: every universal-vertex graph has constructive merge cert ≤ B");
  } else if (failC === 0) {
    ok(
      `all satisfy Gallai; ${exactFallback} needed exact-on-G (merge not fully closed)`,
    );
  }

  if (WRITE) {
    const summary = {
      maxN: UNIV_N,
      total,
      plainMerge: mergeOk,
      forcedMerge: mergeForcedOk,
      exactFallback,
      fail: failC,
      closed: exactFallback === 0 && failC === 0,
      claim:
        exactFallback === 0
          ? "Constructive universal-vertex merge certifies Gallai for all such connected graphs n≤UNIV_N."
          : "Gallai holds for all universal-vertex graphs in range; merge heuristic incomplete.",
    };
    await Bun.write(
      `${RUN_DIR}/artifacts/gallai-univ-closed-summary.json`,
      JSON.stringify(summary, null, 2),
    );
    console.log(`Wrote ${RUN_DIR}/artifacts/gallai-univ-closed-summary.json`);
  }

  if (failures > 0 || failC > 0) process.exit(1);
  process.exit(0);
}

if (import.meta.main) {
  await main();
}
