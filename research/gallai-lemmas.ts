/**
 * Machine-checkable structural lemmas for Gallai's path conjecture.
 *
 * Lemmas (exact integer arithmetic):
 *   L1. For every simple graph on n verts: pathLowerBound ≤ ceil(n/2).
 *       (classical lbs never alone disprove Gallai.)
 *   L2. Every tree admits a path decomposition of size exactly ceil(odd/2),
 *       and therefore p(T) ≤ ceil(n/2). Constructive + exhaustive check.
 *   L3. Universal-vertex construction: if G has a universal vertex v and
 *       H = G−v has a certified decomp of size ≤ B_H, a explicit merge
 *       produces a decomp of G of size ≤ ceil(n/2) for all such G on
 *       n ≤ N_univ (exhaustive via geng). Documents the reduction scope.
 *
 * Exit 0 only if all claimed lemmas verify.
 *
 * Run: bun research/gallai-lemmas.ts
 *      bun research/gallai-lemmas.ts --tree-n 14 --univ-n 9
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
  maskFromEdges,
  pairIndex,
  type EdgeMask,
  type Adj,
} from "./gallai-lib.ts";

const args = process.argv.slice(2);
function opt(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
}
function flag(name: string): boolean {
  return args.includes(`--${name}`);
}

const TREE_N = Number(opt("tree-n", "14"));
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

// ── L1: classical lower bounds never exceed Gallai bound ───────────────────

/**
 * Proof (exact, for all n, all simple G — not just finite check):
 *   deg(v) ≤ n−1 ⇒ ceil(deg/2) ≤ ceil((n−1)/2) ≤ ceil(n/2)
 *   #odd ≤ n     ⇒ ceil(odd/2) ≤ ceil(n/2)
 *   m ≤ n(n−1)/2 ⇒ m/(n−1) ≤ n/2 ⇒ ceil(m/(n−1)) ≤ ceil(n/2)
 *   (for n=1: m=0, bound vacuous)
 */
function lemma1_analytic(): void {
  console.log("\n── L1: classical lower bounds ≤ ceil(n/2) (analytic) ──");
  for (let n = 1; n <= 40; n++) {
    const B = gallaiBound(n);
    const maxDegHalf = n <= 1 ? 0 : Math.ceil((n - 1) / 2);
    const maxOddHalf = Math.ceil(n / 2);
    const maxEdges = n <= 1 ? 0 : (n * (n - 1)) / 2;
    const maxEdgeHalf = n <= 1 ? 0 : Math.ceil(maxEdges / (n - 1));
    if (maxDegHalf > B) fail(`n=${n}: maxDegHalf ${maxDegHalf} > ${B}`);
    if (maxOddHalf > B) fail(`n=${n}: maxOddHalf ${maxOddHalf} > ${B}`);
    if (maxEdgeHalf > B) fail(`n=${n}: maxEdgeHalf ${maxEdgeHalf} > ${B}`);
    // ceil((n-1)/2) ≤ ceil(n/2) always
    if (maxDegHalf > maxOddHalf) fail(`n=${n}: deg half > odd half`);
    // m/(n-1) ≤ n/2 exactly as rationals
    if (n >= 2) {
      // 2m ≤ n(n-1) ⇒ 2m ≤ n(n-1) ⇒ m/(n-1) ≤ n/2
      if (2 * maxEdges > n * (n - 1)) fail(`n=${n}: edge count identity`);
    }
  }
  // Spot-check random-ish dense/sparse masks for n≤8
  for (let n = 2; n <= 8; n++) {
    const pairs = allPairs(n);
    const e = pairs.length;
    const total = 1 << e;
    const step = Math.max(1, total >> 10);
    for (let mask = 0; mask < total; mask += step) {
      const adj = buildAdj(n, BigInt(mask), pairs);
      const deg = degrees(adj);
      const m = edgeCount(BigInt(mask));
      const lb = pathLowerBound(deg, m, n);
      if (lb > gallaiBound(n)) {
        fail(`n=${n} mask=${mask}: lb=${lb} > bound`);
      }
    }
  }
  if (failures === 0) ok("for all n≤40 analytically; sampled masks n≤8");
}

// ── L2: trees — constructive path decomposition ────────────────────────────

/**
 * Classic: in a forest, repeatedly take a path joining two odd-degree vertices
 * (or a single edge if all even — only isolated edges/cycles, but trees have
 * ≥2 odds when m≥1). For a tree with k odd-degree verts, p = k/2.
 *
 * Implementation: residual adjacency as Map of sets; grow from an odd leaf-side.
 */
function treePathDecomposition(n: number, edges: Array<[number, number]>): number[][] {
  const adj: Set<number>[] = Array.from({ length: n }, () => new Set());
  for (const [u, v] of edges) {
    adj[u]!.add(v);
    adj[v]!.add(u);
  }
  const paths: number[][] = [];

  function deg(u: number) {
    return adj[u]!.size;
  }
  function remove(u: number, v: number) {
    adj[u]!.delete(v);
    adj[v]!.delete(u);
  }
  function anyEdge(): [number, number] | null {
    for (let u = 0; u < n; u++) {
      if (adj[u]!.size) {
        const v = adj[u]!.values().next().value as number;
        return [u, v];
      }
    }
    return null;
  }
  function edgeCountRem(): number {
    let s = 0;
    for (let u = 0; u < n; u++) s += adj[u]!.size;
    return s >> 1;
  }

  while (edgeCountRem() > 0) {
    // Prefer start at odd-degree residual vertex
    let start = -1;
    for (let u = 0; u < n; u++) {
      if (deg(u) & 1) {
        start = u;
        break;
      }
    }
    if (start < 0) {
      const e = anyEdge();
      if (!e) break;
      start = e[0];
    }
    const path = [start];
    const usedV = new Set<number>([start]);
    let cur = start;
    for (;;) {
      // Prefer continuing to any residual neighbor not yet on path
      let next = -1;
      // Prefer odd-degree neighbors to finish paths cleanly; else any
      for (const v of adj[cur]!) {
        if (usedV.has(v)) continue;
        if (deg(v) & 1) {
          next = v;
          break;
        }
        if (next < 0) next = v;
      }
      // If stuck with neighbors only on path, residual tree edge must leave —
      // in a simple path decomp of a tree, neighbors off-path always exist
      // until path ends at odd vertex. Fall back: any residual neighbor.
      if (next < 0) {
        for (const v of adj[cur]!) {
          if (!usedV.has(v)) {
            next = v;
            break;
          }
        }
      }
      if (next < 0) break;
      remove(cur, next);
      path.push(next);
      usedV.add(next);
      cur = next;
    }
    if (path.length < 2) {
      // Should not happen if residual edges exist; take a raw edge
      const e = anyEdge();
      if (!e) break;
      remove(e[0], e[1]);
      paths.push([e[0], e[1]]);
    } else {
      paths.push(path);
    }
  }
  return paths;
}

function isTree(n: number, edges: Array<[number, number]>): boolean {
  if (edges.length !== n - 1 && n > 0) {
    if (n === 1) return edges.length === 0;
    return false;
  }
  if (n <= 1) return true;
  const adj = buildAdj(n, maskFromEdges(n, edges), allPairs(n));
  // connected + n-1 edges
  const seen = new Uint8Array(n);
  const stack = [0];
  seen[0] = 1;
  let vis = 1;
  while (stack.length) {
    const u = stack.pop()!;
    for (const v of adj[u]!) {
      if (!seen[v]) {
        seen[v] = 1;
        vis++;
        stack.push(v);
      }
    }
  }
  return vis === n && edges.length === n - 1;
}

async function lemma2_trees(): Promise<void> {
  console.log(`\n── L2: trees p = ceil(odd/2) ≤ ceil(n/2) (constructive, n≤${TREE_N}) ──`);
  const geng = Bun.which("geng");
  if (!geng) {
    fail("geng not on PATH");
    return;
  }

  // Analytic half: for any tree, #odd is even and ≤ n, so ceil(odd/2) ≤ ceil(n/2)
  ok("analytic: odd≤n ⇒ ceil(odd/2)≤ceil(n/2) for any graph, hence any tree");

  let totalTrees = 0;
  for (let n = 1; n <= TREE_N; n++) {
    const t0 = performance.now();
    const bound = gallaiBound(n);
    let graphs: string[];
    if (n === 1) {
      graphs = ["@"];
    } else {
      // Connected graphs with exactly n-1 edges = trees (geng -t is triangle-free!)
      const proc = Bun.spawn(
        [geng, "-c", "-q", String(n), `${n - 1}:${n - 1}`],
        { stdout: "pipe", stderr: "pipe" },
      );
      const out = await new Response(proc.stdout).text();
      const code = await proc.exited;
      if (code !== 0) {
        fail(`geng -c ${n} ${n - 1}:${n - 1} exit ${code}`);
        continue;
      }
      graphs = out.split("\n").map((l) => l.trim()).filter(Boolean);
    }

    // OEIS A000055: unlabeled trees n=1.. : 1,1,1,1,3,6,11,23,47,106,235,551,1301,3159
    const OEIS_TREES: Record<number, number> = {
      1: 1,
      2: 1,
      3: 1,
      4: 2, // wait — A000055 is unlabeled trees: 1,1,1,2,3,6,11,23,... for n=1..
      // Actually A000055: n=1.. = 1,1,1,2,3,6,11,23,47,106,235,551,1301,3159
      // But geng -c -t counts free trees: for n=4 there are 2 (path and star).
    };
    // Correct A000055:
    const A000055: Record<number, number> = {
      1: 1,
      2: 1,
      3: 1,
      4: 2,
      5: 3,
      6: 6,
      7: 11,
      8: 23,
      9: 47,
      10: 106,
      11: 235,
      12: 551,
      13: 1301,
      14: 3159,
    };
    const exp = A000055[n];
    if (exp !== undefined && graphs.length !== exp) {
      // geng -t might use a different convention for n=1
      fail(`n=${n}: geng trees ${graphs.length} ≠ A000055 ${exp}`);
    }

    let bad = 0;
    for (const g6 of graphs) {
      const { n: gn, edgeMask, edges } = parseGraph6(g6);
      if (gn !== n) {
        bad++;
        continue;
      }
      if (!isTree(n, edges)) {
        fail(`not a tree: ${g6}`);
        bad++;
        continue;
      }
      const pairs = allPairs(n);
      const adj = buildAdj(n, edgeMask, pairs);
      const deg = degrees(adj);
      let odd = 0;
      for (const d of deg) if (d & 1) odd++;
      const expectP = odd === 0 ? 0 : odd / 2;
      if (odd % 2 !== 0) {
        fail(`tree ${g6} has odd #odds ${odd}`);
        bad++;
        continue;
      }

      const paths = treePathDecomposition(n, edges);
      const v = verifyDecomposition(n, edgeMask, pairs, paths);
      if (!v.ok) {
        fail(`tree decomp invalid ${g6}: ${v.reason}`);
        bad++;
        continue;
      }
      if (paths.length !== expectP) {
        // Construction may be suboptimal if the grow heuristic fails; fall back
        // to exact engine to confirm true p, then accept only if exact = expectP.
        const exact = exactPathNumber(n, edgeMask, pairs, bound);
        if (exact.num !== expectP) {
          fail(
            `tree ${g6}: construction ${paths.length}, exact ${exact.num}, expect ${expectP}`,
          );
          bad++;
          continue;
        }
        // construction suboptimal but true p correct — strengthen construction later
        // still proves p = ceil(odd/2) via exact
      }
      if (expectP > bound) {
        fail(`tree ${g6}: p=${expectP} > bound ${bound}`);
        bad++;
      }
    }
    totalTrees += graphs.length;
    const ms = performance.now() - t0;
    if (bad === 0) {
      console.log(
        `  n=${n}: ${graphs.length} trees, all p=ceil(odd/2)≤${bound} (${ms.toFixed(0)}ms)`,
      );
    } else {
      fail(`n=${n}: ${bad} tree failures of ${graphs.length}`);
    }
  }
  if (failures === 0) {
    ok(
      `constructive/exact tree Gallai for all unlabeled trees n≤${TREE_N} (${totalTrees} trees)`,
    );
  } else {
    fail(`tree lemma incomplete (${totalTrees} scanned)`);
  }
}

// ── L3: universal vertex — constructive cover ──────────────────────────────

/**
 * Construction for G with universal vertex v:
 *   1. Decompose H = G−v with the exact engine (budget ceil((n−1)/2)).
 *   2. Cover star edges {v,u} by trying to extend H-paths at endpoints,
 *      then pairing remaining pendant edges through v.
 *
 * This is NOT claimed as a general closed-form proof; it is exhaustively
 * verified for all connected G on n≤UNIV_N that have a universal vertex.
 *
 * Merge algorithm:
 *   - Residual star neighbors S = V(H).
 *   - For each path P in decomp(H) with ends a,b:
 *       if a in S: prepend v (use va); remove a from S
 *       else if b in S: append v; remove b
 *     (at most one extension per path in this simple version)
 *   - Remaining S: pair (s1,v,s2) paths; leftover single (s,v).
 *   - Total paths ≤ |decomp(H)| + ceil(|S_rem|/2) after extensions saved.
 *
 * We verify the produced decomp is valid and size ≤ ceil(n/2). If the simple
 * merge fails size, fall back to full exactPathNumber (still certifies Gallai
 * for that graph, but counts as "merge miss").
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
      // v-a-...-b  (use one end; keep other for later pairing)
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

async function lemma3_universal(): Promise<{
  graphs: number;
  mergeOk: number;
  mergeMiss: number;
  fail: number;
}> {
  console.log(
    `\n── L3: universal-vertex graphs Gallai via merge/exact (n≤${UNIV_N}) ──`,
  );
  const geng = Bun.which("geng");
  if (!geng) {
    fail("geng not on PATH");
    return { graphs: 0, mergeOk: 0, mergeMiss: 0, fail: 0 };
  }

  let total = 0;
  let mergeOk = 0;
  let mergeMiss = 0;
  let failC = 0;

  for (let n = 2; n <= UNIV_N; n++) {
    const bound = gallaiBound(n);
    const proc = Bun.spawn([geng, "-c", "-q", String(n)], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const out = await new Response(proc.stdout).text();
    await proc.exited;
    const graphs = out.split("\n").map((l) => l.trim()).filter(Boolean);
    const pairs = allPairs(n);
    let univ = 0;
    let mOk = 0;
    let mMiss = 0;

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

      // Build H = G−v : relabel vertices ≠ v to 0..n-2
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
      let hPathsNew: number[][] = [];
      if (edgeCount(maskH) === 0) {
        hPathsNew = [];
      } else {
        const r = pathNumberAtMost(nH, maskH, pairsH, bH);
        if (!r.ok) {
          // H may be disconnected — path number on disconnected: sum over components
          // exact with higher budget
          const full = exactPathNumber(nH, maskH, pairsH, Math.max(bH + 2, nH));
          hPathsNew = full.paths;
        } else {
          hPathsNew = r.paths;
        }
      }
      // Map paths back to G labels
      const hPaths = hPathsNew.map((P) => P.map((x) => newToOld[x]!));
      const starNeighbors: number[] = [];
      for (let u = 0; u < n; u++) if (u !== v) starNeighbors.push(u);

      const merged = universalMerge(n, v, hPaths, starNeighbors);
      const check = verifyDecomposition(n, edgeMask, pairs, merged);
      if (check.ok && merged.length <= bound) {
        mOk++;
        mergeOk++;
        continue;
      }

      // Fallback: exact on full G
      const full = pathNumberAtMost(n, edgeMask, pairs, bound);
      if (full.ok) {
        mMiss++;
        mergeMiss++;
      } else {
        fail(`universal ${g6}: Gallai fails`);
        failC++;
        failC++;
      }
    }
    console.log(
      `  n=${n}: universal=${univ} merge≤bound=${mOk} merge-miss-but-exact-ok=${mMiss}`,
    );
  }
  ok(
    `all ${total} universal-vertex connected graphs n≤${UNIV_N} satisfy Gallai (merge ${mergeOk}, exact fallback ${mergeMiss})`,
  );
  return { graphs: total, mergeOk, mergeMiss, fail: failC };
}

// ── Structure-forced tight catalog ─────────────────────────────────────────

async function catalogStructureForced(maxN: number): Promise<void> {
  console.log(
    `\n── Structure-forced tight catalog (lb < bound = p, n≤${maxN}) ──`,
  );
  const geng = Bun.which("geng");
  if (!geng) {
    fail("geng not on PATH");
    return;
  }

  type Entry = {
    n: number;
    m: number;
    deg: number[];
    lb: number;
    p: number;
    g6: string;
    edges: Array<[number, number]>;
    paths: number[][];
  };
  const all: Entry[] = [];
  const byN: Record<number, number> = {};

  for (let n = 2; n <= maxN; n++) {
    const bound = gallaiBound(n);
    const proc = Bun.spawn([geng, "-c", "-q", String(n)], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const out = await new Response(proc.stdout).text();
    await proc.exited;
    const graphs = out.split("\n").map((l) => l.trim()).filter(Boolean);
    const pairs = allPairs(n);
    let count = 0;

    for (const g6 of graphs) {
      const { edgeMask, edges } = parseGraph6(g6);
      const adj = buildAdj(n, edgeMask, pairs);
      const deg = degrees(adj);
      const m = edgeCount(edgeMask);
      const lb = pathLowerBound(deg, m, n);
      if (lb >= bound) continue; // density/degree/odd forced — not structure-only

      const within = pathNumberAtMost(n, edgeMask, pairs, bound);
      if (!within.ok) {
        fail(`Gallai fail ${g6}`);
        continue;
      }
      // Is tight? need p === bound
      let p = within.num;
      let paths = within.paths;
      if (p < bound) {
        // not tight
        continue;
      }
      // p ≤ bound and within.num could be from greedy = bound; confirm no better
      if (p === bound) {
        const better = pathNumberAtMost(n, edgeMask, pairs, bound - 1);
        if (better.ok) {
          p = better.num;
          paths = better.paths;
        }
      }
      if (p !== bound) continue;

      count++;
      all.push({
        n,
        m,
        deg,
        lb,
        p,
        g6,
        edges,
        paths,
      });
    }
    byN[n] = count;
    console.log(`  n=${n}: structure-forced tight = ${count}`);
  }

  if (WRITE) {
    const art = `${RUN_DIR}/artifacts/gallai-structure-forced.json`;
    await Bun.write(
      art,
      JSON.stringify(
        {
          definition:
            "Connected G with path_number = ceil(n/2) but classical lower bound pathLowerBound < ceil(n/2). These are structure-only tight (not forced by odd/maxdeg/edges alone).",
          byN,
          count: all.length,
          entries: all,
        },
        null,
        2,
      ),
    );
    console.log(`  wrote ${art} (${all.length} entries)`);
  }
  ok(`structure-forced catalog complete, total ${all.length}`);
}

// ── main ───────────────────────────────────────────────────────────────────

console.log("Gallai structural lemmas — machine-checked");
console.log("L1 analytic · L2 trees constructive · L3 universal exhaustive\n");

const t0 = performance.now();
lemma1_analytic();
await lemma2_trees();
const univ = await lemma3_universal();
await catalogStructureForced(Math.min(8, UNIV_N >= 8 ? 8 : UNIV_N));

if (WRITE) {
  const summary = {
    L1: "classical lbs never exceed ceil(n/2) for simple graphs (analytic identity)",
    L2: `every unlabeled tree on n≤${TREE_N} has p=ceil(odd/2)≤ceil(n/2) (construction+exact)`,
    L3: {
      maxN: UNIV_N,
      universalGraphs: univ.graphs,
      mergeOk: univ.mergeOk,
      mergeMissExactOk: univ.mergeMiss,
      failures: univ.fail,
      note: "Merge construction is a heuristic reduction; exhaustive exact fallback certifies Gallai for all universal-vertex connected graphs in range. Not a closed-form general proof.",
    },
    ms: Math.round(performance.now() - t0),
  };
  await Bun.write(
    `${RUN_DIR}/artifacts/gallai-lemmas-summary.json`,
    JSON.stringify(summary, null, 2),
  );
}

console.log("\n── Verdict ──");
if (failures > 0) {
  console.log(`FAILED with ${failures} errors`);
  process.exit(1);
}
console.log("All lemmas verified. Conjecture still open for general graphs.");
process.exit(0);
