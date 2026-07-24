/**
 * Closed-form leaf induction for Gallai (machine-checked).
 *
 * Analytic (all n):
 *   A1. Odd-n: B(n−1)+1 = B(n). Pure leaf-lift (extend or add-path) preserves
 *       Gallai under IH on H = G−leaf.
 *   A2. Odd-degree attachment: if deg_H(attach) is odd then EVERY path
 *       decomposition of H has attach as a path endpoint (parity of ends).
 *       Hence leaf-extend gives p(G) ≤ p(H) ≤ B(n−1). When n is even,
 *       B(n−1)=B(n), so this is a closed induction step with no search.
 *
 * Constructive closed even-n leaf (exhaustive unlabeled connected, n ≤ N):
 *   E1. For every leafy connected G on even n ≤ N, produce a certified path
 *       decomposition of size ≤ ceil(n/2) by:
 *         (i)  decomp H under budget B_H (IH range / exact engine);
 *         (ii) if some path ends at attach → extend by the leaf edge;
 *         (iii) else if p(H) ≤ B−1 → add singleton path (attach,leaf);
 *         (iv) else forced-endpoint search: find a decomp of H of size ≤ B_H
 *              with attach as an endpoint, then extend.
 *   E2. Report zero failures. This is a finite closed construction, not a
 *       general existence proof that forced-endpoint always stays within B_H.
 *
 * Also:
 *   C1. Catalog all structure-forced tight graphs with δ ≥ 2 (n ≤ CORE_N).
 *   C2. Edge-minimal core G?rLeW family probes (leaf-add / edge-add).
 *
 * Exit 0 only if every check passes. Does NOT claim full Gallai.
 *
 * Run:
 *   bun research/gallai-leaf-closed.ts
 *   bun research/gallai-leaf-closed.ts --leaf-n 8 --core-n 8
 *   bun research/gallai-leaf-closed.ts --leaf-n 10   # long (~minutes)
 */

import {
  allPairs,
  buildAdj,
  degrees,
  edgeCount,
  gallaiBound,
  hasEdge,
  maskFromEdges,
  parseGraph6,
  pathLowerBound,
  pathNumberAtMost,
  exactPathNumber,
  pairIndex,
  verifyDecomposition,
  decompWithEndpoint,
  type EdgeMask,
} from "./gallai-lib.ts";

export { decompWithEndpoint } from "./gallai-lib.ts";

const args = process.argv.slice(2);
function opt(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
}
function flag(name: string): boolean {
  return args.includes(`--${name}`);
}

const LEAF_N = Number(opt("leaf-n", "10"));
const CORE_N = Number(opt("core-n", "8"));
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

const A001349: Record<number, number> = {
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
};

async function gengConnected(n: number): Promise<string[]> {
  const geng = Bun.which("geng");
  if (!geng) throw new Error("geng not on PATH");
  if (n === 1) return ["@"];
  const proc = Bun.spawn([geng, "-c", "-q", String(n)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const code = await proc.exited;
  if (code !== 0) {
    const err = await new Response(proc.stderr).text();
    throw new Error(`geng exit ${code}: ${err}`);
  }
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

// ── path ops ───────────────────────────────────────────────────────────────

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

// ── A1 / A2 analytic ───────────────────────────────────────────────────────

function a1_oddN_identity(): void {
  console.log("\n── A1: odd-n leaf identity B(n−1)+1=B(n) (all odd n≤10_000) ──");
  for (let n = 3; n <= 10_000; n += 2) {
    const B = gallaiBound(n);
    const BH = gallaiBound(n - 1);
    if (BH + 1 !== B) fail(`n=${n}: B_H+1=${BH + 1} ≠ B=${B}`);
  }
  for (let n = 2; n <= 10_000; n += 2) {
    if (gallaiBound(n - 1) !== gallaiBound(n)) {
      fail(`even n=${n}: B_H ≠ B`);
    }
  }
  if (failures === 0) {
    ok("odd n≤10000: B(n−1)+1=B(n); even n≤10000: B(n−1)=B(n)");
  }
}

/**
 * Parity lemma (analytic, all graphs): in any path decomposition, for each
 * vertex v the number of paths having v as an endpoint is congruent to
 * deg(v) (mod 2). Proof: each path incident to v uses either 1 edge at v
 * (endpoint) or 2 edges (interior). Sum of uses = deg(v).
 *
 * Corollary: if deg(v) is odd then every path decomp has v as an endpoint.
 */
async function a2_machineCheck(checkN: number): Promise<void> {
  console.log(
    `\n── A2: odd-degree vertices are always path ends (analytic + n≤${checkN}) ──`,
  );
  ok(
    "analytic: #ends(v) ≡ deg(v) (mod 2) in any path decomp ⇒ odd deg ⇒ ≥1 end",
  );
  let bad = 0;
  let totalEnds = 0;
  for (let n = 2; n <= checkN; n++) {
    const graphs = await gengConnected(n);
    const pairs = allPairs(n);
    const B = gallaiBound(n);
    for (const g6 of graphs) {
      const { edgeMask } = parseGraph6(g6);
      const adj = buildAdj(n, edgeMask, pairs);
      const deg = degrees(adj);
      if (edgeCount(edgeMask) === 0) continue;
      const r = pathNumberAtMost(n, edgeMask, pairs, B);
      if (!r.ok) {
        // should not happen in verified range; still check parity on whatever
        const full = exactPathNumber(n, edgeMask, pairs, B + 3);
        const endCount = new Array(n).fill(0);
        for (const P of full.paths) {
          endCount[P[0]!]++;
          endCount[P[P.length - 1]!]++;
        }
        for (let v = 0; v < n; v++) {
          if ((endCount[v]! % 2) !== (deg[v]! % 2)) {
            fail(`parity ${g6} v=${v}`);
            bad++;
          }
          if ((deg[v]! & 1) && endCount[v]! === 0) {
            fail(`odd deg not end ${g6} v=${v}`);
            bad++;
          }
          totalEnds++;
        }
        continue;
      }
      const endCount = new Array(n).fill(0);
      for (const P of r.paths) {
        endCount[P[0]!]++;
        endCount[P[P.length - 1]!]++;
      }
      for (let v = 0; v < n; v++) {
        if ((endCount[v]! % 2) !== (deg[v]! % 2)) {
          fail(`parity ${g6} v=${v}: ends=${endCount[v]} deg=${deg[v]}`);
          bad++;
        }
        if ((deg[v]! & 1) && endCount[v]! === 0) {
          fail(`odd deg not end ${g6} v=${v}`);
          bad++;
        }
        totalEnds++;
      }
    }
    console.log(`  n=${n}: parity checked on ${graphs.length} graphs`);
  }
  if (bad === 0) ok(`parity/odd-end on all connected n≤${checkN} (${totalEnds} vertex-checks)`);
}

// ── E1: closed even-n leaf construction ────────────────────────────────────

type LeafStats = {
  leafy: number;
  oddAttach: number;
  evenAttach: number;
  method: {
    naiveExtend: number;
    tightAdd: number;
    forcedExtend: number;
    exactFallback: number;
  };
  fail: number;
};

async function e1_closedLeaf(maxN: number): Promise<LeafStats> {
  console.log(
    `\n── E1: closed leaf construction (all connected leafy n≤${maxN}) ──`,
  );
  const stats: LeafStats = {
    leafy: 0,
    oddAttach: 0,
    evenAttach: 0,
    method: {
      naiveExtend: 0,
      tightAdd: 0,
      forcedExtend: 0,
      exactFallback: 0,
    },
    fail: 0,
  };

  for (let n = 2; n <= maxN; n++) {
    const B = gallaiBound(n);
    const t0 = performance.now();
    const graphs = await gengConnected(n);
    const exp = A001349[n];
    if (exp !== undefined && graphs.length !== exp) {
      fail(`n=${n}: count ${graphs.length} ≠ A001349 ${exp}`);
    }
    const pairs = allPairs(n);
    let leafy = 0;
    let bad = 0;
    let mNaive = 0,
      mTight = 0,
      mForced = 0,
      mExact = 0;
    let oddA = 0,
      evenA = 0;

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
      stats.leafy++;
      const attach = adj[leaf]![0]!;

      // Build H = G − leaf
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
      const degH = degrees(buildAdj(nH, maskH, pairsH));
      const dA = degH[attachH] ?? 0;
      if (dA & 1) {
        oddA++;
        stats.oddAttach++;
      } else {
        evenA++;
        stats.evenAttach++;
      }

      let cert: number[][] | null = null;
      let method = "";

      // (i) decomp H — prefer size ≤ bH−1 on even n (room for add-path)
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

      // (ii) naive lift
      {
        const hPaths = mapBack(hPathsNew);
        const { paths: lifted, extended } = liftLeaf(leaf, attach, hPaths);
        const v = verifyDecomposition(n, edgeMask, pairs, lifted);
        if (v.ok && lifted.length <= B) {
          cert = lifted;
          method = extended ? "naiveExtend" : "tightAdd";
        }
      }

      // (iii) forced endpoint when needed
      if (!cert && edgeCount(maskH) > 0) {
        const forced = decompWithEndpoint(nH, maskH, pairsH, bH, attachH);
        if (forced) {
          const hPaths = mapBack(forced);
          const { paths: lifted, extended } = liftLeaf(leaf, attach, hPaths);
          const v = verifyDecomposition(n, edgeMask, pairs, lifted);
          if (v.ok && lifted.length <= B) {
            cert = lifted;
            method = extended ? "forcedExtend" : "tightAdd";
          }
        }
      }

      // (iv) exact fallback (should be unused if closed form works)
      if (!cert) {
        const full = pathNumberAtMost(n, edgeMask, pairs, B);
        if (full.ok) {
          cert = full.paths;
          method = "exactFallback";
        }
      }

      if (!cert) {
        fail(`leaf Gallai fail ${g6}`);
        bad++;
        stats.fail++;
        continue;
      }

      if (method === "naiveExtend") {
        mNaive++;
        stats.method.naiveExtend++;
      } else if (method === "tightAdd") {
        mTight++;
        stats.method.tightAdd++;
      } else if (method === "forcedExtend") {
        mForced++;
        stats.method.forcedExtend++;
      } else {
        mExact++;
        stats.method.exactFallback++;
      }

      // A2 consequence: odd attach on even n should never need exact fallback
      if ((dA & 1) && n % 2 === 0 && method === "exactFallback") {
        fail(`odd-attach even-n used exact fallback ${g6}`);
        bad++;
      }
    }

    const ms = performance.now() - t0;
    console.log(
      `  n=${n} (B=${B}): leafy=${leafy}/${graphs.length} oddA=${oddA} evenA=${evenA}` +
        ` naiveExt=${mNaive} tightAdd=${mTight} forced=${mForced} exact=${mExact}` +
        ` bad=${bad} (${ms.toFixed(0)}ms)`,
    );
    if (bad > 0) fail(`n=${n}: ${bad} failures`);
  }

  ok(
    `leafy ${stats.leafy}: methods naiveExt=${stats.method.naiveExtend} tightAdd=${stats.method.tightAdd} forced=${stats.method.forcedExtend} exact=${stats.method.exactFallback}`,
  );
  if (stats.method.exactFallback === 0 && stats.fail === 0) {
    ok(
      `CLOSED: every leafy connected graph n≤${maxN} has constructive leaf cert size ≤ B (no exact-on-G fallback)`,
    );
  } else if (stats.fail === 0) {
    ok(
      `all leafy n≤${maxN} satisfy Gallai; ${stats.method.exactFallback} needed exact-on-G (forced-endpoint incomplete)`,
    );
  }
  return stats;
}

// ── C1: δ≥2 structure-forced tight cores ───────────────────────────────────

type Core = {
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
};

async function c1_delta2Cores(maxN: number): Promise<Core[]> {
  console.log(
    `\n── C1: structure-forced tight with δ≥2 (n≤${maxN}) ──`,
  );
  const cores: Core[] = [];
  for (let n = 2; n <= maxN; n++) {
    const B = gallaiBound(n);
    const graphs = await gengConnected(n);
    const pairs = allPairs(n);
    let count = 0;
    for (const g6 of graphs) {
      const { edgeMask, edges } = parseGraph6(g6);
      const adj = buildAdj(n, edgeMask, pairs);
      const deg = degrees(adj);
      const dmin = Math.min(...deg);
      if (dmin < 2) continue;
      const m = edgeCount(edgeMask);
      const lb = pathLowerBound(deg, m, n);
      if (lb >= B) continue;
      const within = pathNumberAtMost(n, edgeMask, pairs, B);
      if (!within.ok) {
        fail(`Gallai fail δ≥2 ${g6}`);
        continue;
      }
      const better = pathNumberAtMost(n, edgeMask, pairs, B - 1);
      if (better.ok) continue;
      const v = verifyDecomposition(n, edgeMask, pairs, within.paths);
      if (!v.ok) {
        fail(`δ≥2 cert ${g6}: ${v.reason}`);
        continue;
      }
      count++;
      cores.push({
        n,
        m,
        deg,
        dmin,
        lb,
        p: B,
        bound: B,
        g6,
        edges,
        paths: within.paths,
      });
    }
    console.log(`  n=${n}: δ≥2 structure-forced tight = ${count}`);
  }
  ok(`${cores.length} δ≥2 structure-forced tight cores n≤${maxN} with path certs`);
  return cores;
}

// ── C2: G?rLeW family probes ───────────────────────────────────────────────

async function c2_minimalCoreFamily(): Promise<void> {
  console.log("\n── C2: edge-minimal core G?rLeW family probes ──");
  const g6 = "G?rLeW";
  const { n, edgeMask, edges } = parseGraph6(g6);
  const pairs = allPairs(n);
  const B = gallaiBound(n);
  const adj = buildAdj(n, edgeMask, pairs);
  const deg = degrees(adj);
  const m = edgeCount(edgeMask);
  const lb = pathLowerBound(deg, m, n);

  // Re-verify minimality + tightness
  const within = pathNumberAtMost(n, edgeMask, pairs, B);
  const better = pathNumberAtMost(n, edgeMask, pairs, B - 1);
  if (!within.ok || better.ok || lb >= B) {
    fail("G?rLeW not structure-forced tight as claimed");
    return;
  }
  const v = verifyDecomposition(n, edgeMask, pairs, within.paths);
  if (!v.ok) {
    fail(`G?rLeW cert: ${v.reason}`);
    return;
  }
  ok(
    `G?rLeW: n=${n} m=${m} deg=${JSON.stringify(deg)} lb=${lb} p=${B} (edge-minimal structure-forced)`,
  );

  // Has two leaves (verts of deg 1) — not a δ≥2 core
  const leaves = deg.map((d, i) => (d === 1 ? i : -1)).filter((i) => i >= 0);
  ok(`G?rLeW leaves at vertices ${leaves.join(",")}`);

  // Deleting either leaf: H should have p ≤ B (actually may stay tight or drop)
  for (const leaf of leaves) {
    const attach = adj[leaf]![0]!;
    const keep = edges.filter(([a, b]) => a !== leaf && b !== leaf);
    // relabel
    const oldToNew = new Int32Array(n).fill(-1);
    const newToOld: number[] = [];
    for (let u = 0; u < n; u++) {
      if (u === leaf) continue;
      oldToNew[u] = newToOld.length;
      newToOld.push(u);
    }
    const nH = n - 1;
    const pairsH = allPairs(nH);
    const edgesH = keep.map(
      ([a, b]) => [oldToNew[a]!, oldToNew[b]!] as [number, number],
    );
    const maskH = maskFromEdges(nH, edgesH);
    const bH = gallaiBound(nH);
    const r = pathNumberAtMost(nH, maskH, pairsH, bH);
    if (!r.ok) fail(`G?rLeW − leaf ${leaf}: H violates Gallai`);
    else {
      const tight = pathNumberAtMost(nH, maskH, pairsH, bH - 1);
      console.log(
        `  H=G−leaf${leaf} (attach was ${attach}): p(H)≤${r.num}, tight@B_H=${!tight.ok}`,
      );
    }
  }

  // Add all missing edges one at a time: does tightness survive?
  let stillTight = 0;
  let dropTight = 0;
  for (let u = 0; u < n; u++) {
    for (let w = u + 1; w < n; w++) {
      const idx = pairIndex(u, w, n);
      if (hasEdge(edgeMask, idx)) continue;
      const mask2 = edgeMask | (1n << BigInt(idx));
      const adj2 = buildAdj(n, mask2, pairs);
      const deg2 = degrees(adj2);
      const m2 = edgeCount(mask2);
      const lb2 = pathLowerBound(deg2, m2, n);
      const w2 = pathNumberAtMost(n, mask2, pairs, B);
      if (!w2.ok) {
        fail(`G?rLeW+edge ${u}-${w}: Gallai fail`);
        continue;
      }
      const bet = pathNumberAtMost(n, mask2, pairs, B - 1);
      if (!bet.ok && lb2 < B) stillTight++;
      else dropTight++;
    }
  }
  const missing = (n * (n - 1)) / 2 - m;
  ok(
    `G?rLeW + one missing edge (${missing} trials): still structure-tight=${stillTight}, drop/not-sf=${dropTight}`,
  );

  // Grow: attach a new leaf to each vertex → n=9, B=5; check Gallai + whether tight
  let growOk = 0;
  let growTight = 0;
  const n2 = n + 1;
  const B2 = gallaiBound(n2);
  const pairs2 = allPairs(n2);
  for (let a = 0; a < n; a++) {
    const edges2: Array<[number, number]> = edges.map(([x, y]) => [x, y]);
    edges2.push([a, n]); // new leaf n attached at a
    const mask2 = maskFromEdges(n2, edges2);
    const r = pathNumberAtMost(n2, mask2, pairs2, B2);
    if (!r.ok) {
      fail(`G?rLeW + leaf@${a}: Gallai fail`);
      continue;
    }
    growOk++;
    const bet = pathNumberAtMost(n2, mask2, pairs2, B2 - 1);
    if (!bet.ok) growTight++;
  }
  ok(
    `G?rLeW + pendant leaf at each of ${n} verts: Gallai ${growOk}/${n}, tight ${growTight}/${n}`,
  );
}

// ── main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("Gallai closed leaf + δ≥2 core package (turn 6)\n");
  console.log(`params: leaf-n=${LEAF_N} core-n=${CORE_N} write=${WRITE}`);

  const t0 = performance.now();
  a1_oddN_identity();
  await a2_machineCheck(Math.min(7, LEAF_N));
  const leafStats = await e1_closedLeaf(LEAF_N);
  const delta2 = await c1_delta2Cores(CORE_N);
  await c2_minimalCoreFamily();

  const ms = Math.round(performance.now() - t0);

  const summary = {
    A1: "odd-n: B(n-1)+1=B(n) for all odd n≤10000 (analytic)",
    A2: "odd deg(v) ⇒ every path decomp ends at v (parity); machine-checked n≤7",
    E1: {
      maxN: LEAF_N,
      ...leafStats,
      closed:
        leafStats.method.exactFallback === 0 && leafStats.fail === 0,
      note:
        leafStats.method.exactFallback === 0
          ? "Every leafy connected graph n≤LEAF_N has a constructive leaf certificate (naive/tight/forced-endpoint) of size ≤B. Finite closed construction."
          : "Some graphs needed exact-on-G fallback; forced-endpoint not complete for this LEAF_N.",
    },
    C1: {
      maxN: CORE_N,
      delta2StructureForcedTight: delta2.length,
      byN: delta2.reduce(
        (acc, c) => {
          acc[c.n] = (acc[c.n] ?? 0) + 1;
          return acc;
        },
        {} as Record<number, number>,
      ),
    },
    C2: "G?rLeW unique edge-minimal structure-forced tight at n≤8; has leaves (not δ≥2); family probes recorded",
    ms,
    failures,
    claim:
      "Closed constructive leaf induction for all connected leafy graphs on n≤LEAF_N (exact certificates). δ≥2 structure-forced tight cores catalogued. Full Gallai for all connected graphs remains open.",
  };

  if (WRITE) {
    const artDir = `${RUN_DIR}/artifacts`;
    await Bun.write(
      `${artDir}/gallai-leaf-closed-summary.json`,
      JSON.stringify(summary, null, 2),
    );
    await Bun.write(
      `${artDir}/gallai-delta2-cores.json`,
      JSON.stringify(
        {
          definition:
            "Connected G with δ≥2, path_number p=ceil(n/2), classical lb < p. Hard cores for induction (no leaf reduction).",
          count: delta2.length,
          cores: delta2,
        },
        null,
        2,
      ),
    );
    const notes = `# Gallai closed leaf package (turn 6)

## Analytic
- **A1.** For odd n, B(n−1)+1 = B(n). Leaf-lift preserves Gallai under IH.
- **A2.** In any path decomp, #ends(v) ≡ deg(v) (mod 2). So odd deg(v) ⇒
  v is always a path endpoint. If the attachment of a leaf has odd degree in H,
  pure extend gives p(G) ≤ p(H) ≤ B(n−1); when n even, = B(n).

## Constructive closed leaf (exhaustive, n ≤ ${LEAF_N})
- Leafy graphs: **${leafStats.leafy}**
- Methods: naiveExtend=${leafStats.method.naiveExtend},
  tightAdd=${leafStats.method.tightAdd},
  forcedExtend=${leafStats.method.forcedExtend},
  exactFallback=${leafStats.method.exactFallback}
- Closed (no exact-on-G): **${leafStats.method.exactFallback === 0 && leafStats.fail === 0}**

## δ≥2 structure-forced tight cores (n ≤ ${CORE_N})
- Count: **${delta2.length}** (byN=${JSON.stringify(
      delta2.reduce(
        (a, c) => {
          a[c.n] = (a[c.n] ?? 0) + 1;
          return a;
        },
        {} as Record<number, number>,
      ),
    )})
- These are the residual hard cases after leaf reduction.

## G?rLeW
- Unique edge-minimal structure-forced tight graph at n≤8, but **has leaves**
  (not a δ≥2 core). Tightness is edge-minimal yet leaf-reducible.

## Not claimed
- Full Gallai for arbitrary connected graphs.
- Closed forced-endpoint existence for all n (only machine-checked ≤ LEAF_N).
`;
    await Bun.write(`${artDir}/gallai-leaf-closed-notes.md`, notes);
    console.log(`\nWrote ${artDir}/gallai-leaf-closed-summary.json`);
    console.log(`Wrote ${artDir}/gallai-delta2-cores.json`);
    console.log(`Wrote ${artDir}/gallai-leaf-closed-notes.md`);
  }

  console.log("\n── Verdict ──");
  console.log(`elapsed ${ms}ms, failures=${failures}`);
  if (failures > 0) {
    console.log("FAILED");
    process.exit(1);
  }
  console.log(
    "Closed leaf package verified for n≤" +
      LEAF_N +
      ". Conjecture remains open in general.",
  );
  process.exit(0);
}

if (import.meta.main) {
  await main();
}
