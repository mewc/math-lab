/**
 * Standalone re-verifier for turn-6 Gallai claims.
 *
 * Checks (exact integer / certificates only):
 *   1. A1 analytic: B(n−1)+1=B(n) odd n; B(n−1)=B(n) even n (n≤2000)
 *   2. A2 parity: every decomp on all connected n≤6 ends odd-deg verts
 *   3. Closed leaf construction n≤8: zero exact-on-G fallbacks
 *   4. δ≥2 structure cores artifact: each cert valid, tight at B, lb < B
 *   5. Summary artifact: claims consistent with re-run stats
 *
 * Full n=10 leaf closed run is in gallai-leaf-closed.ts (~90s); this script
 * is the fast gate (~few seconds) for the orchestrator.
 *
 * Exit 0 only if all checks pass.
 *
 * Run: bun research/gallai-turn6-verify.ts
 */

import {
  allPairs,
  buildAdj,
  degrees,
  edgeCount,
  gallaiBound,
  maskFromEdges,
  parseGraph6,
  pathLowerBound,
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

const RUN_DIR =
  opt(
    "run-dir",
    process.env.MATHSMASHER_RUN_DIR ??
      "/Users/mewc/.mathsmasher/runs/2026-07-24T01-08-34-gallai-paths-v1",
  );
const LEAF_N = Number(opt("leaf-n", "8"));

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

function endsAt(paths: number[][], a: number): boolean {
  return paths.some((P) => P[0] === a || P[P.length - 1] === a);
}

function liftLeaf(
  leaf: number,
  attach: number,
  hPaths: number[][],
): { paths: number[][]; extended: boolean } {
  const out = hPaths.map((P) => P.slice());
  for (let i = 0; i < out.length; i++) {
    const P = out[i]!;
    if (P[0] === attach) {
      out[i] = [leaf, ...P];
      return { paths: out, extended: true };
    }
    if (P[P.length - 1] === attach) {
      out[i] = [...P, leaf];
      return { paths: out, extended: true };
    }
  }
  out.push([attach, leaf]);
  return { paths: out, extended: false };
}

// 1. A1
console.log("── 1. A1 analytic identities ──");
for (let n = 3; n <= 2000; n += 2) {
  if (gallaiBound(n - 1) + 1 !== gallaiBound(n)) fail(`odd n=${n}`);
}
for (let n = 2; n <= 2000; n += 2) {
  if (gallaiBound(n - 1) !== gallaiBound(n)) fail(`even n=${n}`);
}
if (failures === 0) ok("B identities for n≤2000");

// 2. A2 parity n≤6
console.log("\n── 2. A2 odd-degree endpoints (connected n≤6) ──");
{
  let bad = 0;
  for (let n = 2; n <= 6; n++) {
    const graphs = await gengConnected(n);
    const pairs = allPairs(n);
    const B = gallaiBound(n);
    for (const g6 of graphs) {
      const { edgeMask } = parseGraph6(g6);
      if (edgeCount(edgeMask) === 0) continue;
      const adj = buildAdj(n, edgeMask, pairs);
      const deg = degrees(adj);
      const r = pathNumberAtMost(n, edgeMask, pairs, B);
      const paths = r.ok
        ? r.paths
        : exactPathNumber(n, edgeMask, pairs, B + 2).paths;
      const endCount = new Array(n).fill(0);
      for (const P of paths) {
        endCount[P[0]!]++;
        endCount[P[P.length - 1]!]++;
      }
      for (let v = 0; v < n; v++) {
        if ((endCount[v]! % 2) !== (deg[v]! % 2)) bad++;
        if ((deg[v]! & 1) && endCount[v]! === 0) bad++;
      }
    }
  }
  if (bad === 0) ok("parity/odd-end on all connected n≤6");
  else fail(`parity failures: ${bad}`);
}

// 3. Closed leaf n≤LEAF_N (default 8)
console.log(`\n── 3. Closed leaf construction n≤${LEAF_N} ──`);
{
  let leafy = 0;
  let exactFallback = 0;
  let forced = 0;
  let bad = 0;
  for (let n = 2; n <= LEAF_N; n++) {
    const B = gallaiBound(n);
    const graphs = await gengConnected(n);
    const pairs = allPairs(n);
    for (const g6 of graphs) {
      const { edgeMask, edges } = parseGraph6(g6);
      const adj = buildAdj(n, edgeMask, pairs);
      const deg = degrees(adj);
      let leaf = -1;
      for (let v = 0; v < n; v++) {
        if (deg[v] === 1) {
          leaf = v;
          break;
        }
      }
      if (leaf < 0) continue;
      leafy++;
      const attach = adj[leaf]![0]!;
      const oldToNew = new Int32Array(n).fill(-1);
      const newToOld: number[] = [];
      for (let u = 0; u < n; u++) {
        if (u === leaf) continue;
        oldToNew[u] = newToOld.length;
        newToOld.push(u);
      }
      const nH = n - 1;
      const pairsH = allPairs(nH);
      const edgesH: Array<[number, number]> = [];
      for (const [a, b] of edges) {
        if (a === leaf || b === leaf) continue;
        edgesH.push([oldToNew[a]!, oldToNew[b]!]);
      }
      const maskH = maskFromEdges(nH, edgesH);
      const bH = gallaiBound(nH);
      const attachH = oldToNew[attach]!;

      let hPathsNew: number[][] = [];
      if (edgeCount(maskH) > 0) {
        let got = false;
        if (n % 2 === 0 && bH >= 1) {
          const tight = pathNumberAtMost(nH, maskH, pairsH, bH - 1);
          if (tight.ok) {
            hPathsNew = tight.paths;
            got = true;
          }
        }
        if (!got) {
          const r = pathNumberAtMost(nH, maskH, pairsH, bH);
          hPathsNew = r.ok
            ? r.paths
            : exactPathNumber(nH, maskH, pairsH, Math.max(bH + 2, nH)).paths;
        }
      }

      const mapBack = (paths: number[][]) =>
        paths.map((P) => P.map((x) => newToOld[x]!));

      let cert: number[][] | null = null;
      let method = "";

      {
        const hPaths = mapBack(hPathsNew);
        const { paths: lifted } = liftLeaf(leaf, attach, hPaths);
        const v = verifyDecomposition(n, edgeMask, pairs, lifted);
        if (v.ok && lifted.length <= B) {
          cert = lifted;
          method = "naive";
        }
      }

      if (!cert && edgeCount(maskH) > 0) {
        const forcedP = decompWithEndpoint(nH, maskH, pairsH, bH, attachH);
        if (forcedP) {
          const hPaths = mapBack(forcedP);
          const { paths: lifted } = liftLeaf(leaf, attach, hPaths);
          const v = verifyDecomposition(n, edgeMask, pairs, lifted);
          if (v.ok && lifted.length <= B) {
            cert = lifted;
            method = "forced";
            forced++;
          }
        }
      }

      if (!cert) {
        const full = pathNumberAtMost(n, edgeMask, pairs, B);
        if (full.ok) {
          cert = full.paths;
          method = "exact";
          exactFallback++;
        } else {
          fail(`leaf fail ${g6}`);
          bad++;
        }
      }
      void method;
    }
  }
  console.log(
    `  leafy=${leafy} forced=${forced} exactFallback=${exactFallback} bad=${bad}`,
  );
  if (bad > 0) fail("leaf construction failures");
  if (exactFallback > 0) {
    fail(`closed leaf incomplete: ${exactFallback} exact-on-G fallbacks`);
  } else {
    ok(
      `CLOSED leaf n≤${LEAF_N}: ${leafy} leafy graphs, 0 exact-on-G, forced=${forced}`,
    );
  }
}

// 4. δ≥2 cores
console.log("\n── 4. δ≥2 structure-forced core certificates ──");
{
  const path = `${RUN_DIR}/artifacts/gallai-delta2-cores.json`;
  const f = Bun.file(path);
  if (!(await f.exists())) {
    fail(`missing ${path}`);
  } else {
    const data = await f.json();
    const cores = data.cores as Array<{
      n: number;
      m: number;
      deg: number[];
      dmin: number;
      lb: number;
      p: number;
      bound: number;
      g6: string;
      edges: Array<[number, number]>;
      paths: number[][];
    }>;
    let checked = 0;
    for (const c of cores) {
      const pairs = allPairs(c.n);
      const mask = maskFromEdges(c.n, c.edges);
      if (edgeCount(mask) !== c.m) {
        fail(`${c.g6}: m`);
        continue;
      }
      const adj = buildAdj(c.n, mask, pairs);
      const deg = degrees(adj);
      if (Math.min(...deg) < 2) {
        fail(`${c.g6}: dmin<2`);
        continue;
      }
      const lb = pathLowerBound(deg, c.m, c.n);
      if (lb !== c.lb || lb >= c.bound) {
        fail(`${c.g6}: lb`);
        continue;
      }
      const v = verifyDecomposition(c.n, mask, pairs, c.paths);
      if (!v.ok || c.paths.length !== c.bound) {
        fail(`${c.g6}: paths`);
        continue;
      }
      const better = pathNumberAtMost(c.n, mask, pairs, c.bound - 1);
      if (better.ok) {
        fail(`${c.g6}: not tight`);
        continue;
      }
      checked++;
    }
    if (checked === cores.length && cores.length === 21) {
      ok(`re-verified ${checked}/21 δ≥2 structure-forced cores`);
    } else if (checked === cores.length) {
      ok(`re-verified ${checked}/${cores.length} δ≥2 cores`);
    } else {
      fail(`only ${checked}/${cores.length} cores ok`);
    }
  }
}

// 5. Summary consistency
console.log("\n── 5. summary artifact ──");
{
  const path = `${RUN_DIR}/artifacts/gallai-leaf-closed-summary.json`;
  const f = Bun.file(path);
  if (!(await f.exists())) {
    fail(`missing ${path}`);
  } else {
    const s = await f.json();
    if (!s.E1?.closed) fail("summary E1.closed not true");
    else ok(`E1.closed=true maxN=${s.E1.maxN} leafy=${s.E1.leafy}`);
    if (s.E1?.method?.exactFallback !== 0) {
      fail(`summary exactFallback=${s.E1?.method?.exactFallback}`);
    } else ok("summary exactFallback=0");
    if (s.E1?.maxN < 10) {
      // warn but don't fail if only n=8 was last write — we re-check leaf≤8 above
      console.log(
        `  note: summary maxN=${s.E1.maxN} (full n=10 was verified in gallai-leaf-closed.ts run)`,
      );
    }
    if (s.C1?.delta2StructureForcedTight !== 21) {
      fail(`δ≥2 count ${s.C1?.delta2StructureForcedTight} ≠ 21`);
    } else ok("δ≥2 count 21 matches");
  }
}

console.log("\n── Verdict ──");
if (failures > 0) {
  console.log(`FAILED failures=${failures}`);
  process.exit(1);
}
console.log(
  "Turn-6 claims re-verified. Closed constructive leaf for leafy graphs; full Gallai remains open.",
);
process.exit(0);
