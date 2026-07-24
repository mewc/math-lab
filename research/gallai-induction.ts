/**
 * Machine-checked induction lemmas + certificate package for Gallai.
 *
 * I1. Odd-n leaf lemma (analytic, all n): if G has a leaf and H = G−leaf
 *     satisfies p(H) ≤ ceil((n−1)/2), the leaf-lift yields p(G) ≤ ceil(n/2).
 *     Hence Gallai on order n−1 ⇒ Gallai for every leafy graph of odd order n.
 *
 * I2. Even-n leaf: pure lift may give p(H)+1 = B+1. Exhaustive classification
 *     for leafy connected graphs n ≤ LEAF_N (default 10): either lift extends
 *     an H-path (size ≤ B), or exact search still certifies p(G) ≤ B.
 *
 * I3. Density-forced upper bound: every connected G with
 *     m > (n−1)(ceil(n/2)−1) has p = ceil(n/2), checked via geng edge filter
 *     for all unlabeled connected graphs n ≤ DENS_N (default 10).
 *
 * I4. Structure-forced tight cores (lb < B = p): full edge-list + path-list
 *     certificates; edge-minimality under deletion; re-verified.
 *
 * I5. Certificate re-check of all cores: tightness proved by failing budget B−1.
 *
 * Exit 0 only if every claimed check passes. Not a general proof of Gallai.
 *
 * Run:
 *   bun research/gallai-induction.ts
 *   bun research/gallai-induction.ts --leaf-n 8 --dens-n 9 --core-n 8
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
  type EdgeMask,
} from "./gallai-lib.ts";

const args = process.argv.slice(2);
function opt(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
}
function flag(name: string): boolean {
  return args.includes(`--${name}`);
}

const LEAF_N = Number(opt("leaf-n", "10"));
const DENS_N = Number(opt("dens-n", "10"));
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

// ── helpers ────────────────────────────────────────────────────────────────

function liftLeafDecomposition(
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

async function gengConnected(n: number, mine?: number, maxe?: number): Promise<string[]> {
  const geng = Bun.which("geng");
  if (!geng) throw new Error("geng not on PATH");
  if (n === 1) return ["@"];
  const argv = [geng, "-c", "-q", String(n)];
  if (mine !== undefined && maxe !== undefined) {
    argv.push(`${mine}:${maxe}`);
  }
  const proc = Bun.spawn(argv, { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  const code = await proc.exited;
  if (code !== 0) {
    const err = await new Response(proc.stderr).text();
    throw new Error(`geng ${argv.slice(1).join(" ")} exit ${code}: ${err}`);
  }
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

function removeEdgeMask(
  n: number,
  edgeMask: EdgeMask,
  pairs: Array<[number, number]>,
  u: number,
  v: number,
): EdgeMask {
  const idx = pairIndex(u, v, n);
  return edgeMask & ~(1n << BigInt(idx));
}

// ── I1: odd-n leaf analytic ────────────────────────────────────────────────

/**
 * Analytic identity (all n ≥ 3 odd):
 *   B(n) = ceil(n/2) = (n+1)/2
 *   B(n−1) = ceil((n−1)/2) = (n−1)/2   (since n−1 even)
 *   B(n−1) + 1 = (n−1)/2 + 1 = (n+1)/2 = B(n)
 *
 * Leaf-lift: p(G) ≤ p(H) + 1 ≤ B(n−1) + 1 = B(n).
 * No search required — pure integer arithmetic.
 */
function i1_oddLeafAnalytic(): void {
  console.log("\n── I1: odd-n leaf lemma (analytic, all odd n ≤ 500) ──");
  for (let n = 3; n <= 500; n += 2) {
    const B = gallaiBound(n);
    const BH = gallaiBound(n - 1);
    if (BH + 1 !== B) {
      fail(`n=${n}: B_H+1=${BH + 1} ≠ B=${B}`);
    }
    // also: n = 2k+1 ⇒ B = k+1, nH = 2k ⇒ BH = k
    const k = (n - 1) / 2;
    if (B !== k + 1 || BH !== k) fail(`n=${n}: k-form mismatch`);
  }
  // Even n: B_H + 1 = B + 1 — pure lift may overshoot (named obstruction class)
  for (let n = 2; n <= 500; n += 2) {
    const B = gallaiBound(n);
    const BH = gallaiBound(n - 1);
    if (BH !== B) fail(`even n=${n}: expected B_H = B (${BH} vs ${B})`);
    if (BH + 1 !== B + 1) fail(`even n=${n}: B_H+1 arithmetic`);
  }
  if (failures === 0) {
    ok(
      "for all odd n≤500: B(n−1)+1 = B(n); leaf-lift preserves Gallai under IH",
    );
    ok(
      "for all even n≤500: B(n−1)=B(n), so pure add-path lift may give B+1 (I2)",
    );
  }
}

// ── I2: even/odd leaf exhaustive ───────────────────────────────────────────

async function i2_leafExhaustive(): Promise<{
  leafy: number;
  oddN: number;
  evenExtend: number;
  evenAddButOk: number;
  evenLiftMissExactOk: number;
  evenFail: number;
}> {
  console.log(
    `\n── I2: leaf reduction exhaustive (connected leafy graphs n≤${LEAF_N}) ──`,
  );
  const stats = {
    leafy: 0,
    oddN: 0,
    evenExtend: 0,
    evenAddButOk: 0,
    evenLiftMissExactOk: 0,
    evenFail: 0,
  };

  for (let n = 2; n <= LEAF_N; n++) {
    const B = gallaiBound(n);
    const t0 = performance.now();
    const graphs = await gengConnected(n);
    const exp = A001349[n];
    if (exp !== undefined && graphs.length !== exp) {
      fail(`n=${n}: count ${graphs.length} ≠ A001349 ${exp}`);
    }
    const pairs = allPairs(n);
    let leafy = 0;
    let oddOk = 0;
    let evenExt = 0;
    let evenAdd = 0;
    let evenMiss = 0;
    let bad = 0;

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

      // H = G − leaf
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

      let hPathsNew: number[][] = [];
      if (edgeCount(maskH) === 0) {
        hPathsNew = [];
      } else {
        // Prefer a decomp of H that ends at attach when possible:
        // try budget bH; if we need room to extend on even n, try bH-1 first.
        const attachH = oldToNew[attach]!;
        let chosen: number[][] | null = null;
        if (n % 2 === 0 && bH >= 1) {
          const tight = pathNumberAtMost(nH, maskH, pairsH, bH - 1);
          if (tight.ok) chosen = tight.paths;
        }
        if (!chosen) {
          const r = pathNumberAtMost(nH, maskH, pairsH, bH);
          if (r.ok) {
            chosen = r.paths;
            // rotate: if some path has attach as end, good; else try alternate
            // decomp seeds by re-running exact with same budget (already multi-seed greedy)
          } else {
            const full = exactPathNumber(nH, maskH, pairsH, Math.max(bH + 2, nH));
            chosen = full.paths;
          }
        }
        // Prefer paths that already end at attachH among equal-size options:
        // re-check whether any path ends at attach; if not and budget allows,
        // try to find any decomp of size ≤ bH with an end at attach via exact.
        const endsAt = (paths: number[][]) =>
          paths.some(
            (P) => P[0] === attachH || P[P.length - 1] === attachH,
          );
        if (!endsAt(chosen) && edgeCount(maskH) > 0) {
          // Force: take a decomp and if a residual path can be reorganized —
          // fall back: exact engine already multi-seed; accept chosen.
        }
        hPathsNew = chosen;
        void attachH;
      }

      const hPaths = hPathsNew.map((P) => P.map((x) => newToOld[x]!));
      const { paths: lifted, extended } = liftLeafDecomposition(
        leaf,
        attach,
        hPaths,
      );
      const check = verifyDecomposition(n, edgeMask, pairs, lifted);
      if (!check.ok) {
        fail(`leaf lift invalid ${g6}: ${check.reason}`);
        bad++;
        continue;
      }

      if (n % 2 === 1) {
        // Analytic: size ≤ |H-paths|+1 ≤ B always if p(H)≤B_H; verify.
        if (lifted.length > B) {
          // H may have violated Gallai (shouldn't in range) — exact on G
          const full = pathNumberAtMost(n, edgeMask, pairs, B);
          if (!full.ok) {
            fail(`odd leafy Gallai fail ${g6}`);
            bad++;
          } else {
            oddOk++;
            stats.oddN++;
          }
        } else {
          oddOk++;
          stats.oddN++;
        }
      } else {
        // Even n
        if (lifted.length <= B) {
          if (extended) {
            evenExt++;
            stats.evenExtend++;
          } else {
            evenAdd++;
            stats.evenAddButOk++;
          }
        } else {
          const full = pathNumberAtMost(n, edgeMask, pairs, B);
          if (!full.ok) {
            fail(`even leafy Gallai fail ${g6}`);
            bad++;
            stats.evenFail++;
          } else {
            evenMiss++;
            stats.evenLiftMissExactOk++;
          }
        }
      }
    }
    const ms = performance.now() - t0;
    console.log(
      `  n=${n} (B=${B}): leafy=${leafy}/${graphs.length}` +
        (n % 2 === 1
          ? ` odd-lift-ok=${oddOk}`
          : ` extend≤B=${evenExt} add≤B=${evenAdd} lift-miss-exact=${evenMiss}`) +
        ` bad=${bad} (${ms.toFixed(0)}ms)`,
    );
    if (bad > 0) fail(`n=${n}: ${bad} leaf failures`);
  }
  ok(
    `leafy total ${stats.leafy}: odd lift ${stats.oddN}; even extend ${stats.evenExtend} add ${stats.evenAddButOk} miss→exact ${stats.evenLiftMissExactOk}`,
  );
  return stats;
}

// ── I3: density-forced ─────────────────────────────────────────────────────

async function i3_densityForced(): Promise<{ total: number; byN: Record<number, number> }> {
  console.log(
    `\n── I3: density-forced graphs p = B (unlabeled connected n≤${DENS_N}) ──`,
  );
  const byN: Record<number, number> = {};
  let total = 0;

  for (let n = 2; n <= DENS_N; n++) {
    const B = gallaiBound(n);
    const thresh = (n - 1) * (B - 1);
    const maxM = (n * (n - 1)) / 2;
    const mine = thresh + 1;
    if (mine > maxM) {
      byN[n] = 0;
      console.log(`  n=${n}: no density-forced (thresh ${thresh} ≥ maxM ${maxM})`);
      continue;
    }
    const t0 = performance.now();
    const graphs = await gengConnected(n, mine, maxM);
    const pairs = allPairs(n);
    let bad = 0;
    for (const g6 of graphs) {
      const { edgeMask } = parseGraph6(g6);
      const m = edgeCount(edgeMask);
      if (m <= thresh) {
        fail(`geng range leak n=${n} m=${m}≤${thresh}`);
        bad++;
        continue;
      }
      const edgeLb = Math.ceil(m / (n - 1));
      if (edgeLb < B) {
        fail(`n=${n} m=${m}: edgeLb ${edgeLb} < B ${B}`);
        bad++;
        continue;
      }
      const r = pathNumberAtMost(n, edgeMask, pairs, B);
      if (!r.ok) {
        fail(`density CEX n=${n} g6=${g6}`);
        bad++;
        continue;
      }
      // p ≤ B and edge lb ≥ B ⇒ p = B; certificate is r.paths
      const v = verifyDecomposition(n, edgeMask, pairs, r.paths);
      if (!v.ok) {
        fail(`density cert bad ${g6}: ${v.reason}`);
        bad++;
      }
    }
    byN[n] = graphs.length;
    total += graphs.length;
    const ms = performance.now() - t0;
    console.log(
      `  n=${n}: density-forced=${graphs.length} all p=B=${B} (bad=${bad}, ${ms.toFixed(0)}ms)`,
    );
    if (bad > 0) fail(`n=${n}: ${bad} density failures`);
  }
  ok(`all ${total} density-forced connected graphs n≤${DENS_N} have certified p=B`);
  return { total, byN };
}

// ── I4/I5: structure-forced tight cores + certificates ─────────────────────

type CoreCert = {
  n: number;
  m: number;
  deg: number[];
  lb: number;
  p: number;
  bound: number;
  g6: string;
  edges: Array<[number, number]>;
  paths: number[][];
  /** every edge e: either G−e disconnected (as simple graph on n verts with isolates ok)
   *  or p(G−e) < B (certified by decomp of size ≤ B−1). */
  edgeMinimal: boolean;
  edgeDelete: Array<{
    edge: [number, number];
    pAfter: number | null;
    connected: boolean;
  }>;
};

async function i4_structureCores(): Promise<CoreCert[]> {
  console.log(
    `\n── I4: structure-forced tight cores (lb < B = p, n≤${CORE_N}) ──`,
  );
  const cores: CoreCert[] = [];

  for (let n = 2; n <= CORE_N; n++) {
    const B = gallaiBound(n);
    const t0 = performance.now();
    const graphs = await gengConnected(n);
    const exp = A001349[n];
    if (exp !== undefined && graphs.length !== exp) {
      fail(`n=${n}: count ${graphs.length} ≠ A001349 ${exp}`);
    }
    const pairs = allPairs(n);
    let sf = 0;

    for (const g6 of graphs) {
      const { edgeMask, edges } = parseGraph6(g6);
      const adj = buildAdj(n, edgeMask, pairs);
      const deg = degrees(adj);
      const m = edgeCount(edgeMask);
      const lb = pathLowerBound(deg, m, n);
      if (lb >= B) continue; // classical lower bound already forces ≥ B

      // Need p = B exactly: decomp of size ≤ B exists, none of size ≤ B−1
      const within = pathNumberAtMost(n, edgeMask, pairs, B);
      if (!within.ok) {
        fail(`Gallai fail ${g6}`);
        continue;
      }
      if (B === 0) continue;
      const better = pathNumberAtMost(n, edgeMask, pairs, B - 1);
      if (better.ok) continue; // not tight
      // tight: p = B, lb < B
      const paths = within.paths;
      const v = verifyDecomposition(n, edgeMask, pairs, paths);
      if (!v.ok) {
        fail(`core cert invalid ${g6}: ${v.reason}`);
        continue;
      }
      if (paths.length !== B) {
        // within may report num from greedy == B but paths shorter? shouldn't
        if (paths.length < B) {
          // contradicts better check
          fail(`core ${g6}: paths ${paths.length} < B but no better budget?`);
          continue;
        }
      }

      // Edge-minimality of tightness: for each edge, p drops or disconnects
      // (disconnect here = not connected on the non-isolated support)
      const edgeDelete: CoreCert["edgeDelete"] = [];
      let edgeMinimal = true;
      for (const [u, vtx] of edges) {
        const mask2 = removeEdgeMask(n, edgeMask, pairs, u, vtx);
        const adj2 = buildAdj(n, mask2, pairs);
        const connected = (() => {
          // connected ignoring isolated vertices: all verts of positive degree in one component
          const active: number[] = [];
          for (let x = 0; x < n; x++) if (adj2[x]!.length) active.push(x);
          if (active.length === 0) return true;
          const seen = new Uint8Array(n);
          const stack = [active[0]!];
          seen[active[0]!] = 1;
          let vis = 1;
          while (stack.length) {
            const x = stack.pop()!;
            for (const y of adj2[x]!) {
              if (!seen[y]) {
                seen[y] = 1;
                vis++;
                stack.push(y);
              }
            }
          }
          return vis === active.length;
        })();
        if (!connected) {
          edgeDelete.push({ edge: [u, vtx], pAfter: null, connected: false });
          continue;
        }
        const m2 = edgeCount(mask2);
        if (m2 === 0) {
          edgeDelete.push({ edge: [u, vtx], pAfter: 0, connected: true });
          continue;
        }
        const r2 = pathNumberAtMost(n, mask2, pairs, B - 1);
        if (r2.ok) {
          edgeDelete.push({
            edge: [u, vtx],
            pAfter: r2.num,
            connected: true,
          });
        } else {
          // still needs ≥ B paths — not edge-minimal for the tight property
          edgeMinimal = false;
          const full = exactPathNumber(n, mask2, pairs, B + 2);
          edgeDelete.push({
            edge: [u, vtx],
            pAfter: full.num,
            connected: true,
          });
        }
      }

      sf++;
      cores.push({
        n,
        m,
        deg,
        lb,
        p: B,
        bound: B,
        g6,
        edges,
        paths,
        edgeMinimal,
        edgeDelete,
      });
    }
    const ms = performance.now() - t0;
    console.log(
      `  n=${n}: structure-forced tight = ${sf} (${ms.toFixed(0)}ms)`,
    );
  }

  const minimal = cores.filter((c) => c.edgeMinimal).length;
  ok(
    `structure-forced tight cores: ${cores.length} total, ${minimal} edge-minimal for tightness`,
  );
  return cores;
}

function i5_recheckCertificates(cores: CoreCert[]): void {
  console.log(
    `\n── I5: re-verify every core certificate (decomp + tightness) ──`,
  );
  let checked = 0;
  for (const c of cores) {
    const pairs = allPairs(c.n);
    const mask = maskFromEdges(c.n, c.edges);
    if (edgeCount(mask) !== c.m) {
      fail(`${c.g6}: m mismatch`);
      continue;
    }
    const adj = buildAdj(c.n, mask, pairs);
    const deg = degrees(adj);
    for (let i = 0; i < c.n; i++) {
      if (deg[i] !== c.deg[i]) {
        fail(`${c.g6}: deg mismatch at ${i}`);
        break;
      }
    }
    const lb = pathLowerBound(deg, c.m, c.n);
    if (lb !== c.lb) fail(`${c.g6}: lb ${lb}≠${c.lb}`);
    if (lb >= c.bound) fail(`${c.g6}: not structure-forced (lb≥B)`);
    const v = verifyDecomposition(c.n, mask, pairs, c.paths);
    if (!v.ok) {
      fail(`${c.g6}: paths invalid: ${v.reason}`);
      continue;
    }
    if (c.paths.length !== c.bound) {
      fail(`${c.g6}: path count ${c.paths.length} ≠ B ${c.bound}`);
      continue;
    }
    // tightness: no decomp of size B-1
    const better = pathNumberAtMost(c.n, mask, pairs, c.bound - 1);
    if (better.ok) {
      fail(`${c.g6}: not tight — found decomp size ${better.num}`);
      continue;
    }
    // every path edge must be a graph edge (already in verify)
    for (const P of c.paths) {
      for (let i = 0; i < P.length - 1; i++) {
        const idx = pairIndex(P[i]!, P[i + 1]!, c.n);
        if (!hasEdge(mask, idx)) fail(`${c.g6}: missing edge in path`);
      }
    }
    checked++;
  }
  ok(`re-verified ${checked}/${cores.length} structure-forced certificates`);
  if (checked !== cores.length) fail("certificate re-check incomplete");
}

// ── main ───────────────────────────────────────────────────────────────────

console.log("Gallai induction lemmas + certificate package\n");
console.log(
  `params: leaf-n=${LEAF_N} dens-n=${DENS_N} core-n=${CORE_N} write=${WRITE}`,
);

const t0 = performance.now();
i1_oddLeafAnalytic();
const leafStats = await i2_leafExhaustive();
const dens = await i3_densityForced();
const cores = await i4_structureCores();
i5_recheckCertificates(cores);

const ms = Math.round(performance.now() - t0);
const byN: Record<number, number> = {};
const minimalByN: Record<number, number> = {};
for (const c of cores) {
  byN[c.n] = (byN[c.n] ?? 0) + 1;
  if (c.edgeMinimal) minimalByN[c.n] = (minimalByN[c.n] ?? 0) + 1;
}

const summary = {
  I1: "odd-n leaf: B(n-1)+1=B(n) for all odd n≤500 (analytic induction step)",
  I2: {
    maxN: LEAF_N,
    ...leafStats,
    note: "Even-n pure lift may overshoot; exact still certifies Gallai in range. Not a closed-form even-n leaf proof.",
  },
  I3: {
    maxN: DENS_N,
    densityForcedTotal: dens.total,
    byN: dens.byN,
    note: "Exhaustive geng edge-filter: m>(n-1)(B-1) ⇒ certified p=B for n≤DENS_N",
  },
  I4: {
    maxN: CORE_N,
    structureForcedTight: cores.length,
    byN,
    edgeMinimalByN: minimalByN,
  },
  I5: "every structure-forced core has verified path decomp of size B and no decomp of size B-1",
  ms,
  failures,
  claim:
    "Finite/special-case machine checks only. Gallai's conjecture remains open for general connected graphs.",
};

if (WRITE) {
  const artDir = `${RUN_DIR}/artifacts`;
  await Bun.write(
    `${artDir}/gallai-induction-summary.json`,
    JSON.stringify(summary, null, 2),
  );
  // Full certificates (can be large at core-n=8)
  await Bun.write(
    `${artDir}/gallai-structure-cores.json`,
    JSON.stringify(
      {
        definition:
          "Connected G with path_number p = ceil(n/2) but classical pathLowerBound < ceil(n/2). Each entry has edges, an exact path decomp of size p, and per-edge deletion analysis for tightness minimality.",
        count: cores.length,
        byN,
        edgeMinimalByN: minimalByN,
        cores,
      },
      null,
      2,
    ),
  );
  // Compact human notes
  const notes = `# Gallai induction package (turn 5)

## Analytic
- **Odd-n leaf lemma:** For odd n, B(n−1)+1 = B(n). Any leaf lift from a Gallai
  decomp of H = G−leaf yields p(G) ≤ B(n). Thus Gallai for all connected graphs
  of order n−1 implies Gallai for all *leafy* connected graphs of odd order n.

## Exhaustive (machine)
- Leaf reduction n≤${LEAF_N}: ${leafStats.leafy} leafy graphs; all satisfy Gallai.
  Even-n lift-miss→exact: ${leafStats.evenLiftMissExactOk}.
- Density-forced n≤${DENS_N}: ${dens.total} graphs, all certified p=B
  (byN=${JSON.stringify(dens.byN)}).
- Structure-forced tight n≤${CORE_N}: ${cores.length} graphs with full path
  certificates; edge-minimal for tightness byN=${JSON.stringify(minimalByN)}.

## Not claimed
- Full Gallai for all connected graphs (open).
- Closed-form even-n leaf induction without re-optimizing H.
- Universal-vertex closed-form merge (merge heuristic still has misses).
`;
  await Bun.write(`${artDir}/gallai-induction-notes.md`, notes);
  console.log(`\nWrote ${artDir}/gallai-induction-summary.json`);
  console.log(`Wrote ${artDir}/gallai-structure-cores.json`);
  console.log(`Wrote ${artDir}/gallai-induction-notes.md`);
}

console.log("\n── Verdict ──");
console.log(`elapsed ${ms}ms, failures=${failures}`);
if (failures > 0) {
  console.log("FAILED");
  process.exit(1);
}
console.log(
  "Induction package verified. Conjecture remains open in general.",
);
process.exit(0);
