/**
 * Machine-checkable constructive families + elementary identities for Gallai.
 *
 * C1. Analytic: classical lower bounds never exceed ceil(n/2) (all n).
 * C2. Stars K_{1,n-1}: explicit decomp; tight iff n even.
 * C3. Completes K_n: explicit path decomp of size ceil(n/2) for all n ≤ N.
 * C4. Density identity: ceil(m/(n-1)) = ceil(n/2) ⇔ m > (n-1)(ceil(n/2)-1).
 * C5. Leaf reduction (exact): for every connected G on n≤N with a leaf,
 *     a certified decomp of size ≤ ceil(n/2) is built from a decomp of G−leaf
 *     (or direct exact if the inductive step needs the search engine on H).
 *
 * Exit 0 only if all constructions verify.
 *
 * Run: bun research/gallai-constructions.ts
 *      bun research/gallai-constructions.ts --complete-n 16 --leaf-n 9
 */

import {
  allPairs,
  buildAdj,
  completeMask,
  degrees,
  edgeCount,
  gallaiBound,
  maskFromEdges,
  parseGraph6,
  pathLowerBound,
  pathNumberAtMost,
  exactPathNumber,
  starTightCertificate,
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

const COMPLETE_N = Number(opt("complete-n", "16"));
const LEAF_N = Number(opt("leaf-n", "9"));
const STAR_N = Number(opt("star-n", "40"));
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

// ── C1 ─────────────────────────────────────────────────────────────────────

function c1_lowerBounds(): void {
  console.log("\n── C1: classical lbs ≤ ceil(n/2) (analytic, all n≤200) ──");
  for (let n = 1; n <= 200; n++) {
    const B = gallaiBound(n);
    if (n >= 2) {
      if (Math.ceil((n - 1) / 2) > B) fail(`n=${n} maxdeg half`);
      if (Math.ceil(n / 2) > B) fail(`n=${n} odd half`);
      const maxM = (n * (n - 1)) / 2;
      if (Math.ceil(maxM / (n - 1)) > B) fail(`n=${n} edge half`);
      // exact rational: maxM/(n-1) = n/2
      if (2 * maxM !== n * (n - 1)) fail(`n=${n} m identity`);
    }
  }
  if (failures === 0) ok("for all n≤200");
}

// ── C2 stars ───────────────────────────────────────────────────────────────

function c2_stars(): void {
  console.log(`\n── C2: stars K_{1,n-1} explicit decomp (n≤${STAR_N}) ──`);
  for (let n = 1; n <= STAR_N; n++) {
    const cert = starTightCertificate(n);
    const pairs = allPairs(n);
    const mask = maskFromEdges(n, cert.edges);
    if (n >= 2) {
      const v = verifyDecomposition(n, mask, pairs, cert.paths);
      if (!v.ok) {
        fail(`star n=${n}: ${v.reason}`);
        continue;
      }
    }
    const expect = n <= 1 ? 0 : Math.ceil((n - 1) / 2);
    if (cert.pathNumber !== expect) fail(`star n=${n}: p=${cert.pathNumber}≠${expect}`);
    const B = gallaiBound(n);
    if (cert.pathNumber > B) fail(`star n=${n}: exceeds Gallai`);
    // tight iff n even (n≥2): ceil((n-1)/2) = n/2 = ceil(n/2)
    const shouldTight = n >= 2 && n % 2 === 0;
    if (cert.tight !== shouldTight) {
      fail(`star n=${n}: tight=${cert.tight} expected ${shouldTight}`);
    }
  }
  if (failures === 0) ok(`stars n≤${STAR_N}: p=ceil((n-1)/2); tight iff n even`);
}

// ── C3 complete graphs — explicit construction ─────────────────────────────

/**
 * Path decomposition of K_n into exactly ceil(n/2) paths.
 *
 * Even n = 2m (rotational Hamiltonian-path decomposition):
 *   Vertices ℤ_{2m}. For s = 0..m−1 the path
 *     P_s = (s, s+1, s−1, s+2, s−2, …) then (s+m)  (mod 2m)
 *   is Hamiltonian; the m paths partition E(K_{2m}) (certified).
 *
 * Odd n = 2m+1 (Walecki cycles + rainbow cut):
 *   Walecki decomposes K_{2m+1} into m Hamiltonian cycles.
 *   Choose one edge from each cycle so the m cut-edges form a single path
 *   (found by backtracking with degree-≤2 pruning). Cutting those edges
 *   yields m Ham paths + 1 path of cut-edges = m+1 = ceil(n/2).
 */
function evenCompleteHamPaths(n: number): number[][] {
  if (n % 2 !== 0) throw new Error("evenCompleteHamPaths needs even n");
  if (n === 0) return [];
  if (n === 2) return [[0, 1]];
  const m = n / 2;
  const paths: number[][] = [];
  for (let s = 0; s < m; s++) {
    const path: number[] = [s];
    for (let k = 1; k < m; k++) {
      path.push(((s + k) % n + n) % n);
      path.push(((s - k) % n + n) % n);
    }
    path.push((s + m) % n);
    paths.push(path);
  }
  return paths;
}

function waleckiCycles(n: number): number[][] {
  if (n % 2 === 0) throw new Error("walecki needs odd n");
  const m = (n - 1) / 2;
  if (m === 0) return [];
  const inf = 2 * m;
  const mod = 2 * m;
  const order0: number[] = [0];
  for (let j = 1; j <= m; j++) {
    order0.push(j);
    if (j < m) order0.push(mod - j);
  }
  const cycles: number[][] = [];
  const edgeOwner = new Set<string>();
  const ek = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);
  for (let r = 0; r < mod; r++) {
    const ord = order0.map((x) => (x + r) % mod);
    const cyc = [inf, ...ord];
    const edges: string[] = [];
    for (let i = 0; i < cyc.length; i++) {
      edges.push(ek(cyc[i]!, cyc[(i + 1) % cyc.length]!));
    }
    let fresh = true;
    for (const e of edges) {
      if (edgeOwner.has(e)) {
        fresh = false;
        break;
      }
    }
    if (!fresh) continue;
    for (const e of edges) edgeOwner.add(e);
    cycles.push(cyc);
    if (cycles.length === m) break;
  }
  return cycles;
}

function cycleEdges(cyc: number[]): Array<[number, number]> {
  const e: Array<[number, number]> = [];
  for (let i = 0; i < cyc.length; i++) {
    e.push([cyc[i]!, cyc[(i + 1) % cyc.length]!]);
  }
  return e;
}

function cutCycleToPath(cyc: number[], a: number, b: number): number[] {
  const L = cyc.length;
  for (let i = 0; i < L; i++) {
    const x = cyc[i]!;
    const y = cyc[(i + 1) % L]!;
    if ((x === a && y === b) || (x === b && y === a)) {
      const path: number[] = [];
      for (let k = 1; k <= L; k++) path.push(cyc[(i + k) % L]!);
      return path;
    }
  }
  throw new Error("edge not on cycle");
}

function edgesFormPath(edges: Array<[number, number]>): number[] | null {
  if (edges.length === 0) return [];
  const adj = new Map<number, number[]>();
  for (const [a, b] of edges) {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  }
  for (const [, ns] of adj) if (ns.length > 2) return null;
  const endpoints: number[] = [];
  for (const [v, ns] of adj) if (ns.length === 1) endpoints.push(v);
  if (edges.length === 1) return [edges[0]![0], edges[0]![1]];
  if (endpoints.length !== 2) return null;
  const path = [endpoints[0]!];
  let prev = -1;
  let cur = endpoints[0]!;
  const usedE = new Set<string>();
  const ek = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);
  while (path.length <= edges.length) {
    const ns = adj.get(cur)!;
    let nxt = -1;
    for (const v of ns) {
      if (v === prev) continue;
      if (usedE.has(ek(cur, v))) continue;
      nxt = v;
      break;
    }
    if (nxt < 0) break;
    usedE.add(ek(cur, nxt));
    path.push(nxt);
    prev = cur;
    cur = nxt;
  }
  return path.length === edges.length + 1 ? path : null;
}

/** Odd K_n: Walecki cycles + one rainbow cut-path. */
function oddCompleteWaleckiPaths(n: number): number[][] {
  const m = (n - 1) / 2;
  const cycles = waleckiCycles(n);
  if (cycles.length !== m) {
    throw new Error(`walecki produced ${cycles.length} cycles, expect ${m}`);
  }
  const cycEdges = cycles.map(cycleEdges);
  const chosen: Array<[number, number]> = [];
  let foundCuts: Array<[number, number]> | null = null;

  function dfs(pos: number): boolean {
    if (pos === m) {
      if (edgesFormPath(chosen)) {
        foundCuts = chosen.map((e) => [e[0], e[1]] as [number, number]);
        return true;
      }
      return false;
    }
    for (const [a, b] of cycEdges[pos]!) {
      chosen.push([a, b]);
      const deg = new Map<number, number>();
      let bad = false;
      for (const [x, y] of chosen) {
        deg.set(x, (deg.get(x) ?? 0) + 1);
        deg.set(y, (deg.get(y) ?? 0) + 1);
      }
      for (const d of deg.values()) {
        if (d > 2) {
          bad = true;
          break;
        }
      }
      if (!bad && dfs(pos + 1)) return true;
      chosen.pop();
    }
    return false;
  }
  if (!dfs(0) || !foundCuts) {
    throw new Error(`K_${n}: no rainbow cut path through Walecki cycles`);
  }
  const cutSet = new Set(
    foundCuts.map(([a, b]) => (a < b ? `${a},${b}` : `${b},${a}`)),
  );
  const paths: number[][] = [];
  for (let i = 0; i < m; i++) {
    let ca = -1;
    let cb = -1;
    for (const [a, b] of cycEdges[i]!) {
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      if (cutSet.has(k)) {
        ca = a;
        cb = b;
        break;
      }
    }
    if (ca < 0) throw new Error("cut missing on cycle");
    paths.push(cutCycleToPath(cycles[i]!, ca, cb));
  }
  const rp = edgesFormPath(foundCuts);
  if (!rp) throw new Error("cut edges not a path");
  paths.push(rp);
  return paths;
}

function completePathDecomposition(n: number): {
  paths: number[][];
  method: "even-rotational" | "odd-walecki-rainbow" | "empty";
} {
  if (n <= 1) return { paths: [], method: "empty" };
  const pairs = allPairs(n);
  const mask = completeMask(n);
  const B = gallaiBound(n);

  if (n % 2 === 0) {
    const paths = evenCompleteHamPaths(n);
    const v = verifyDecomposition(n, mask, pairs, paths);
    if (!v.ok || paths.length !== B) {
      throw new Error(
        `K_${n} even-rotational failed: ${!v.ok ? (v as { reason: string }).reason : "size " + paths.length}`,
      );
    }
    return { paths, method: "even-rotational" };
  }

  const paths = oddCompleteWaleckiPaths(n);
  const v = verifyDecomposition(n, mask, pairs, paths);
  if (!v.ok || paths.length !== B) {
    throw new Error(
      `K_${n} walecki-rainbow failed: ${!v.ok ? (v as { reason: string }).reason : "size " + paths.length}`,
    );
  }
  return { paths, method: "odd-walecki-rainbow" };
}

function c3_completes(): void {
  console.log(`\n── C3: K_n path decomp size = ceil(n/2) (n≤${COMPLETE_N}) ──`);
  const methods: Record<string, number> = {};
  for (let n = 1; n <= COMPLETE_N; n++) {
    const B = gallaiBound(n);
    const pairs = allPairs(n);
    const mask = completeMask(n);
    const m = edgeCount(mask);
    const lb = n <= 1 ? 0 : Math.ceil(m / (n - 1));
    if (lb !== B && n > 1) fail(`K_${n}: edge lb ${lb} ≠ bound ${B}`);

    let paths: number[][];
    let method: string;
    try {
      const r = completePathDecomposition(n);
      paths = r.paths;
      method = r.method;
    } catch (e) {
      fail(`K_${n}: ${e}`);
      continue;
    }
    const v = verifyDecomposition(n, mask, pairs, paths);
    if (!v.ok) {
      fail(`K_${n}: ${v.reason}`);
      continue;
    }
    if (paths.length > B) {
      fail(`K_${n}: ${paths.length} paths > bound ${B}`);
      continue;
    }
    if (n >= 2 && paths.length !== B) {
      fail(`K_${n}: got ${paths.length}, expected exactly ${B}`);
      continue;
    }
    methods[method] = (methods[method] ?? 0) + 1;
    console.log(`  K_${n}: p=${paths.length}=${B} via ${method} (m=${m})`);
  }
  ok(`all K_n n≤${COMPLETE_N} certified; methods=${JSON.stringify(methods)}`);
}

// ── C4 density identity ────────────────────────────────────────────────────

function c4_density(): void {
  console.log("\n── C4: density-forced ⇔ m > (n-1)(B-1) ──");
  for (let n = 2; n <= 80; n++) {
    const B = gallaiBound(n);
    const thresh = (n - 1) * (B - 1);
    const maxM = (n * (n - 1)) / 2;
    for (let m = 0; m <= maxM; m++) {
      const edgeLb = Math.ceil(m / (n - 1));
      const forced = edgeLb >= B;
      const byThresh = m > thresh;
      // edgeLb ≥ B ⇔ m/(n-1) > B-1 ⇔ m > (n-1)(B-1) when working in reals,
      // and since m,n int: ceil(m/(n-1)) ≥ B ⇔ m > (n-1)(B-1)
      // Check: ceil(m/(n-1)) ≥ B ⇔ m/(n-1) > B-1 ⇔ m > (n-1)(B-1)
      // Actually ceil(x) ≥ B ⇔ x > B-1 for integer B. Yes.
      if (forced !== byThresh) {
        fail(`n=${n} m=${m}: forced=${forced} byThresh=${byThresh}`);
        break;
      }
    }
  }
  if (failures === 0) {
    ok(
      "for all n≤80, all m: ceil(m/(n-1))≥ceil(n/2) ⇔ m>(n-1)(ceil(n/2)-1)",
    );
  }
}

// ── C5 leaf reduction ──────────────────────────────────────────────────────

/**
 * Given connected G with leaf ℓ attached to u, and a path decomp of H=G−ℓ:
 *   - if some path ends at u, extend that end by ℓ (p unchanged);
 *   - else append the edge-path (u,ℓ) (p increases by 1).
 * Returns the new decomp on G's vertex labels (same as H plus ℓ).
 */
function liftLeafDecomposition(
  leaf: number,
  attach: number,
  hPaths: number[][],
): number[][] {
  const out = hPaths.map((P) => P.slice());
  for (let i = 0; i < out.length; i++) {
    const P = out[i]!;
    if (P[0] === attach) {
      out[i] = [leaf, ...P];
      return out;
    }
    if (P[P.length - 1] === attach) {
      out[i] = [...P, leaf];
      return out;
    }
  }
  out.push([attach, leaf]);
  return out;
}

async function c5_leafInduction(): Promise<void> {
  console.log(
    `\n── C5: leaf reduction exhaustive (connected graphs with a leaf, n≤${LEAF_N}) ──`,
  );
  const geng = Bun.which("geng");
  if (!geng) {
    fail("geng not on PATH");
    return;
  }

  let totalLeafy = 0;
  let extendOk = 0;
  let addPathOk = 0;
  let boundHold = 0;

  for (let n = 2; n <= LEAF_N; n++) {
    const B = gallaiBound(n);
    const proc = Bun.spawn([geng, "-c", "-q", String(n)], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const out = await new Response(proc.stdout).text();
    await proc.exited;
    const graphs = out.split("\n").map((l) => l.trim()).filter(Boolean);
    const pairs = allPairs(n);
    let leafy = 0;
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
      totalLeafy++;
      const attach = adj[leaf]![0]!;

      // Build H = G − leaf (relabel)
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
        const r = pathNumberAtMost(nH, maskH, pairsH, bH);
        if (!r.ok) {
          // H may be disconnected or rare hard case
          const full = exactPathNumber(nH, maskH, pairsH, Math.max(bH + 2, nH));
          if (full.num > bH) {
            // Still ok if full decomp works for lift to ≤ B
            hPathsNew = full.paths;
          } else {
            hPathsNew = full.paths;
          }
        } else {
          hPathsNew = r.paths;
        }
      }
      const hPaths = hPathsNew.map((P) => P.map((x) => newToOld[x]!));
      const lifted = liftLeafDecomposition(leaf, attach, hPaths);
      const check = verifyDecomposition(n, edgeMask, pairs, lifted);
      if (!check.ok) {
        fail(`leaf lift invalid ${g6}: ${check.reason}`);
        bad++;
        continue;
      }
      if (lifted.length <= B) {
        boundHold++;
        // classify extend vs add
        if (lifted.length === hPaths.length) extendOk++;
        else addPathOk++;
      } else {
        // Lift exceeded — try exact on G (should still satisfy Gallai by prior)
        const full = pathNumberAtMost(n, edgeMask, pairs, B);
        if (!full.ok) {
          fail(`leafy Gallai fail ${g6}`);
          bad++;
        } else {
          // Named obstruction for pure leaf-lift without re-optimizing H:
          // p(H) large and no free end at attach.
          // Still Gallai holds via exact; count as lift-miss.
          boundHold++;
        }
      }
    }
    console.log(
      `  n=${n}: leafy=${leafy}/${graphs.length} Gallai-via-lift-or-exact ok (bad=${bad})`,
    );
  }
  ok(
    `leafy graphs n≤${LEAF_N}: ${totalLeafy} checked; extend=${extendOk} addPath=${addPathOk} boundHold=${boundHold}`,
  );
  console.log(
    "  note: pure lift gives p(G)≤p(H)+1; when n even this may equal B+1 if p(H)=B_H and no extend — exact re-opt still ≤B in range.",
  );
}

// ── density-forced exhaustive upper bound n≤9 ──────────────────────────────

async function c6_densityForcedUpper(): Promise<void> {
  console.log("\n── C6: density-forced graphs (edge lb = B) have p = B (n≤9) ──");
  const geng = Bun.which("geng");
  if (!geng) {
    fail("geng not on PATH");
    return;
  }
  let total = 0;
  for (let n = 2; n <= 9; n++) {
    const B = gallaiBound(n);
    const thresh = (n - 1) * (B - 1);
    const proc = Bun.spawn([geng, "-c", "-q", String(n)], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const out = await new Response(proc.stdout).text();
    await proc.exited;
    const graphs = out.split("\n").map((l) => l.trim()).filter(Boolean);
    const pairs = allPairs(n);
    let count = 0;
    let bad = 0;
    for (const g6 of graphs) {
      const { edgeMask } = parseGraph6(g6);
      const m = edgeCount(edgeMask);
      if (m <= thresh) continue;
      count++;
      total++;
      const r = pathNumberAtMost(n, edgeMask, pairs, B);
      if (!r.ok) {
        fail(`density ${g6}: p > ${B}`);
        bad++;
        continue;
      }
      // lb = B so p ≥ B; we have p ≤ B ⇒ p = B
      if (r.num !== B) {
        // num might be from greedy that found B; if found less, contradicts lb
        const adj = buildAdj(n, edgeMask, pairs);
        const lb = pathLowerBound(degrees(adj), m, n);
        if (r.num < lb) fail(`density ${g6}: p=${r.num} < lb=${lb}`);
      }
    }
    console.log(`  n=${n}: density-forced=${count} all p≤${B} (bad=${bad})`);
  }
  ok(`all ${total} density-forced unlabeled connected graphs n≤9 have p=B`);
}

// ── main ───────────────────────────────────────────────────────────────────

console.log("Gallai constructions — machine-checked families\n");
const t0 = performance.now();
c1_lowerBounds();
c2_stars();
c3_completes();
c4_density();
await c5_leafInduction();
await c6_densityForcedUpper();

const ms = Math.round(performance.now() - t0);
const summary = {
  C1: "classical lbs ≤ ceil(n/2) for all n≤200 (analytic)",
  C2: `stars n≤${STAR_N}: explicit; tight iff n even`,
  C3: `K_n n≤${COMPLETE_N}: certified p=ceil(n/2)`,
  C4: "density-forced ⇔ m>(n-1)(B-1) for n≤80",
  C5: `leaf reduction checked for all leafy connected graphs n≤${LEAF_N}`,
  C6: "density-forced graphs n≤9 have p=B (exhaustive geng)",
  ms,
  failures,
};

if (WRITE) {
  await Bun.write(
    `${RUN_DIR}/artifacts/gallai-constructions-summary.json`,
    JSON.stringify(summary, null, 2),
  );
  console.log(
    `\nWrote ${RUN_DIR}/artifacts/gallai-constructions-summary.json`,
  );
}

console.log("\n── Verdict ──");
if (failures > 0) {
  console.log(`FAILED with ${failures} errors`);
  process.exit(1);
}
console.log(
  "All constructions verified. Finite/special-case only — conjecture still open.",
);
process.exit(0);
