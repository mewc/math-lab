/**
 * LOCAL LOWER BOUNDS — can they explain the structure-forced tight graphs?
 *
 * The campaign has always used three lower bounds on the path number, and all
 * three are GLOBAL:
 *     ceil(q/2),   max_v ceil(deg(v)/2),   ceil(m/(n−1)).
 * A graph is called STRUCTURE-forced tight when p(G) = B(n) = ceil(n/2) but all
 * three bounds are strictly below B — tight for reasons nothing in the toolkit
 * accounts for. Turn 11 counted them exactly: 3 at n = 6, 51 at n = 8, 1,681 at
 * n = 10. This asks whether they are really unexplained, or merely unexplained
 * by GLOBAL bounds.
 *
 * Three local bounds, each valid for every vertex subset S (proofs below). Write
 * e(S) for the edges inside S and odd_S for the number of vertices of odd degree
 * in the induced subgraph G[S]. Fix any decomposition of G into k paths; each
 * path P meets S in c_P subpaths covering |V(P) ∩ S| − c_P edges of G[S].
 *
 *   L1 (density / arboricity).  A path is a forest, so a path decomposition is a
 *   forest decomposition and Nash-Williams applies:
 *          k ≥ ceil( e(S) / (|S| − 1) )        for every S with |S| ≥ 2.
 *   Directly: each path covers at most |S| − 1 edges inside S, since its
 *   subpaths in S span at most |S| vertices in at least one piece.
 *
 *   L2 (local parity).  Summing e(S) = Σ_P (|V(P) ∩ S| − c_P) ≤ k|S| − Σ_P c_P.
 *   Within G[S] each vertex of odd degree must be the END of some subpath, and
 *   each subpath has two ends, so Σ_P c_P ≥ ceil(odd_S / 2). Hence
 *          k ≥ ( e(S) + ceil(odd_S / 2) ) / |S|.
 *
 *   L3 (both at once).  Σ_P c_P is also at least the number of paths carrying an
 *   edge of G[S], which is at least ceil(e(S)/(|S|−1)). So
 *          k ≥ ( e(S) + max(ceil(odd_S/2), ceil(e(S)/(|S|−1))) ) / |S|.
 *
 * Taking S = V recovers the classical edge bound from L1 and (with c_P ≥ 1) the
 * classical odd bound from L2, so these are genuine local generalisations rather
 * than new inequalities pulled from nowhere.
 *
 * Checks:
 *   V1. VALIDATION FIRST. For every connected graph on n ≤ VAL_N, compute p(G)
 *       exactly and assert every local bound is ≤ p(G). A bound that ever
 *       exceeded the true path number would make every conclusion below false,
 *       so this runs before anything else and a single violation aborts.
 *   V2. Do the local bounds reach B on the structure-forced tight catalogs?
 *       Reports, per n, how many of the previously unexplained graphs each bound
 *       explains, and how many remain unexplained by all of them.
 *   V3. The residue: graphs tight with every bound — global and local — strictly
 *       below B. That set is the real mystery, and its size is the result.
 *
 * Run:
 *   bun research/gallai-localbounds.ts --catalog struct10.txt --n 10
 *   bun research/gallai-localbounds.ts --val-n 8            # validation only
 */

import {
  allPairs,
  maskFromEdges,
  buildAdj,
  decompWithEndpointsExact,
  degrees,
  edgeCount,
  gallaiBound,
  hasEdge,
  parseGraph6,
  pathLowerBound,
  pathNumberAtMost,
  SearchLimitExceeded,
} from "./gallai-lib.ts";

const args = process.argv.slice(2);
function opt(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
}

const VAL_N = Number(opt("val-n", "8"));
const CATALOG = opt("catalog", "");
const CAT_N = Number(opt("n", "10"));
const NODE_LIMIT = Number(opt("node-limit", "20000000"));
/** Test "p(G) = best bound" on all connected graphs of this order (0 = skip). */
const EQUAL_N = Number(opt("equal-n", "0"));

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

const geng = Bun.which("geng");
if (!geng) throw new Error("geng not on PATH");

async function gengConnected(n: number): Promise<string[]> {
  const proc = Bun.spawn([geng!, "-c", "-q", String(n)], { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

type Bounds = { classical: number; L1: number; L2: number; L3: number; L5: number; best: number };

/**
 * L5 — the BOUNDARY (block) bound. New here, and the only one of these that
 * sees a cut.
 *
 * Fix a decomposition of G into k paths and a set S ⊆ V, and let b be the number
 * of edges between S and V∖S. The subpaths lying inside S form a path
 * decomposition of G[S], so their number is at least p(G[S]); each of their
 * 2·p(G[S]) or more ends is either a genuine end of a path of the decomposition
 * (lying in S) or a point where a path steps out of S along one of the b boundary
 * edges. Writing E_S for the number of path-ends inside S:
 *          2·p(G[S]) ≤ E_S + b,   so   E_S ≥ 2·p(G[S]) − b.
 * Parity gives a second, independent floor: every vertex of odd degree in G ends
 * at least one path, so E_S ≥ odd_S. The same holds for V∖S with the same b, and
 * the ends of all k paths split between the two sides:
 *          2k = E_S + E_{V∖S} ≥ max(2p(G[S]) − b, odd_S)
 *                              + max(2p(G[V∖S]) − b, odd_{V∖S}).
 * S = ∅ recovers the classical odd bound. Unlike L1–L3 this is not a counting
 * argument — it is why a triangle hanging off a bridge forces an extra path,
 * which is exactly the shape of the smallest structure-forced tight graphs
 * (ECYW: a triangle joined to a vertex with two leaves; EQjO: two triangles
 * joined by a bridge).
 */
function boundaryBound(
  n: number,
  edgeMask: bigint,
  pairs: Array<[number, number]>,
  pOfSubset: (S: number) => number,
): number {
  const adjMask = new Int32Array(n);
  const deg = new Int32Array(n);
  for (let i = 0; i < pairs.length; i++) {
    if (!hasEdge(edgeMask, i)) continue;
    const [u, v] = pairs[i]!;
    adjMask[u]! |= 1 << v;
    adjMask[v]! |= 1 << u;
    deg[u]!++;
    deg[v]!++;
  }
  const full = (1 << n) - 1;
  let best = 0;
  // Only half the subsets are needed: S and its complement give the same bound.
  for (let S = 0; S <= full; S++) {
    const T = full & ~S;
    if (T < S) continue;
    let b = 0;
    let oddS = 0;
    let oddT = 0;
    for (let v = 0; v < n; v++) {
      const inS = (S >> v) & 1;
      if (deg[v]! & 1) {
        if (inS) oddS++;
        else oddT++;
      }
      if (inS) b += popcount(adjMask[v]! & T);
    }
    const A = Math.max(2 * pOfSubset(S) - b, oddS);
    const C = Math.max(2 * pOfSubset(T) - b, oddT);
    const val = Math.ceil((A + C) / 2);
    if (val > best) best = val;
  }
  return best;
}

/** All three local bounds, maximised over every vertex subset. */
function localBounds(n: number, edgeMask: bigint, pairs: Array<[number, number]>): Bounds {
  const adjMask = new Int32Array(n);
  for (let i = 0; i < pairs.length; i++) {
    if (!hasEdge(edgeMask, i)) continue;
    const [u, v] = pairs[i]!;
    adjMask[u]! |= 1 << v;
    adjMask[v]! |= 1 << u;
  }
  const deg = degrees(buildAdj(n, edgeMask, pairs));
  const m = edgeCount(edgeMask);
  const classical = pathLowerBound(deg, m, n);

  let L1 = 0;
  let L2 = 0;
  let L3 = 0;
  const full = 1 << n;
  for (let S = 1; S < full; S++) {
    const size = popcount(S);
    if (size < 2) continue;
    let twoE = 0;
    let odd = 0;
    let bits = S;
    while (bits) {
      const lsb = bits & -bits;
      const v = 31 - Math.clz32(lsb);
      bits ^= lsb;
      const d = popcount(adjMask[v]! & S);
      twoE += d;
      if (d & 1) odd++;
    }
    const eS = twoE >> 1;
    if (eS === 0) continue;
    const dens = Math.ceil(eS / (size - 1));
    if (dens > L1) L1 = dens;
    const par = Math.ceil((eS + Math.ceil(odd / 2)) / size);
    if (par > L2) L2 = par;
    const both = Math.ceil((eS + Math.max(Math.ceil(odd / 2), dens)) / size);
    if (both > L3) L3 = both;
  }
  return { classical, L1, L2, L3, L5: 0, best: Math.max(classical, L1, L2, L3) };
}

/** Exact path number of every induced subgraph, memoised by vertex mask. */
function subsetPathNumbers(
  n: number,
  edgeMask: bigint,
  pairs: Array<[number, number]>,
): (S: number) => number {
  const memo = new Map<number, number>();
  return (S: number): number => {
    const hit = memo.get(S);
    if (hit !== undefined) return hit;
    const verts: number[] = [];
    for (let v = 0; v < n; v++) if ((S >> v) & 1) verts.push(v);
    const k = verts.length;
    if (k < 2) {
      memo.set(S, 0);
      return 0;
    }
    const idx = new Map(verts.map((v, i) => [v, i]));
    const sub: Array<[number, number]> = [];
    for (let i = 0; i < pairs.length; i++) {
      if (!hasEdge(edgeMask, i)) continue;
      const [u, v] = pairs[i]!;
      if (!idx.has(u) || !idx.has(v)) continue;
      sub.push([idx.get(u)!, idx.get(v)!]);
    }
    if (sub.length === 0) {
      memo.set(S, 0);
      return 0;
    }
    const subPairs = allPairs(k);
    const mask = maskFromEdges(k, sub);
    // Start the escalation at the classical lower bound of the subgraph rather
    // than at 1 — the skipped budgets are provably infeasible.
    const subDeg = degrees(buildAdj(k, mask, subPairs));
    const lo = Math.max(1, pathLowerBound(subDeg, sub.length, k));
    let val = lo;
    for (let b = lo; b <= sub.length; b++) {
      try {
        const r = decompWithEndpointsExact(k, mask, subPairs, b, [], NODE_LIMIT);
        if (r.paths) {
          val = r.paths.length;
          break;
        }
      } catch (e) {
        if (!(e instanceof SearchLimitExceeded)) throw e;
        // Could not decide p(G[S]) within the budget. L5 is monotone in
        // p(G[S]), so substituting a valid LOWER bound keeps L5 sound — it just
        // makes it weaker. Never substitute a guess.
        val = b;
        break;
      }
    }
    memo.set(S, val);
    return val;
  };
}

function popcount(x: number): number {
  let c = 0;
  let m = x >>> 0;
  while (m) {
    m &= m - 1;
    c++;
  }
  return c;
}

/** Exact path number by escalating budget with the complete solver. */
function exactPathNumber(n: number, edgeMask: bigint, pairs: Array<[number, number]>): number | null {
  const m = edgeCount(edgeMask);
  for (let b = 1; b <= m; b++) {
    try {
      const r = decompWithEndpointsExact(n, edgeMask, pairs, b, [], NODE_LIMIT);
      if (r.paths) return r.paths.length;
    } catch (e) {
      if (!(e instanceof SearchLimitExceeded)) throw e;
      return null;
    }
  }
  return m;
}

console.log(`Local lower bounds for the path number\n`);

// ── V1: validate the bounds against exact path numbers ────────────────────
console.log(`V1. validation: every local bound ≤ p(G), all connected graphs n ≤ ${VAL_N}`);
{
  let checked = 0;
  let violations = 0;
  let sharper = 0;
  let exactMatch = 0;
  const gapHist = new Map<number, number>();
  const gapWitness: string[] = [];
  for (let n = 2; n <= VAL_N; n++) {
    const pairs = allPairs(n);
    for (const g6 of await gengConnected(n)) {
      const { edgeMask } = parseGraph6(g6);
      const b = localBounds(n, edgeMask, pairs);
      b.L5 = boundaryBound(n, edgeMask, pairs, subsetPathNumbers(n, edgeMask, pairs));
      b.best = Math.max(b.best, b.L5);
      const p = exactPathNumber(n, edgeMask, pairs);
      if (p === null) continue;
      checked++;
      if (b.L5 > p) {
        violations++;
        if (violations <= 5) fail(`n=${n} ${g6}: p=${p} but L5=${b.L5} — the boundary bound EXCEEDS the path number`);
      }
      if (b.L1 > p || b.L2 > p || b.L3 > p) {
        violations++;
        if (violations <= 5) {
          fail(`n=${n} ${g6}: p=${p} but L1=${b.L1} L2=${b.L2} L3=${b.L3} — a local bound EXCEEDS the path number`);
        }
      }
      if (b.best > b.classical) sharper++;
      if (b.best === p) exactMatch++;
      else {
        gapHist.set(p - b.best, (gapHist.get(p - b.best) ?? 0) + 1);
        if (p - b.best >= 1 && gapWitness.length < 6) gapWitness.push(`n=${n} ${g6} p=${p} best-bound=${b.best}`);
      }
    }
  }
  if (violations === 0) {
    ok(`${checked.toLocaleString()} graphs: no local bound ever exceeds p(G) — the inequalities hold`);
    note(`the local bounds beat the classical maximum on ${sharper.toLocaleString()} of them`);
    // Is the path number ALWAYS equal to the best of these bounds?
    note(
      `p(G) equals the best bound on ${exactMatch.toLocaleString()}/${checked.toLocaleString()} graphs` +
        (gapHist.size
          ? `; gaps p − bound: ${[...gapHist.entries()].sort((a, b) => a[0] - b[0]).map(([g, c]) => `+${g}:${c}`).join(" ")}`
          : ` — NO GAPS: the bounds determine p exactly on this range`),
    );
    for (const w of gapWitness) note(`    gap witness: ${w}`);
  }
}

if (failures > 0) {
  console.log(`\n${failures} FAILURES — bounds invalid, nothing below is trustworthy`);
  process.exit(1);
}

// ── V2/V3: do they explain the structure-forced tight graphs? ──────────────
async function explainCatalog(n: number, g6s: string[], label: string): Promise<void> {
  const pairs = allPairs(n);
  const B = gallaiBound(n);
  let byL1 = 0;
  let byL2 = 0;
  let byL3 = 0;
  let byL5 = 0;
  let explained = 0;
  const residue: string[] = [];
  for (const g6 of g6s) {
    const { edgeMask } = parseGraph6(g6);
    const b = localBounds(n, edgeMask, pairs);
    if (b.classical >= B) {
      fail(`${g6}: classical bound already ${b.classical} ≥ B — not structure-forced`);
      continue;
    }
    b.L5 = boundaryBound(n, edgeMask, pairs, subsetPathNumbers(n, edgeMask, pairs));
    b.best = Math.max(b.best, b.L5);
    if (b.L1 >= B) byL1++;
    if (b.L2 >= B) byL2++;
    if (b.L3 >= B) byL3++;
    if (b.L5 >= B) byL5++;
    if (b.best >= B) explained++;
    else residue.push(g6);
  }
  console.log(
    `  n=${n} ${label}: ${g6s.length} graphs, B=${B} — explained by a LOCAL bound: ${explained} ` +
      `(L1 density ${byL1}, L2 parity ${byL2}, L3 combined ${byL3}, L5 BOUNDARY ${byL5}); unexplained residue ${residue.length}`,
  );
  if (residue.length && residue.length <= 12) {
    for (const g of residue) note(`    residue: ${g}`);
  }
}

console.log(`\nV2. do local bounds reach B on the structure-forced tight graphs?`);

// n = 6 and n = 8 catalogs are cheap to regenerate exactly.
for (const n of [6, 8]) {
  const pairs = allPairs(n);
  const B = gallaiBound(n);
  const cat: string[] = [];
  for (const g6 of await gengConnected(n)) {
    const { edgeMask } = parseGraph6(g6);
    const deg = degrees(buildAdj(n, edgeMask, pairs));
    if (pathLowerBound(deg, edgeCount(edgeMask), n) >= B) continue;
    const below = decompWithEndpointsExact(n, edgeMask, pairs, B - 1, [], NODE_LIMIT);
    if (!below.paths) cat.push(g6);
  }
  await explainCatalog(n, cat, "structure-forced");
}

if (CATALOG) {
  const g6s = (await Bun.file(CATALOG).text()).split("\n").map((l) => l.trim()).filter(Boolean);
  await explainCatalog(CAT_N, g6s, `structure-forced (from ${CATALOG.split("/").pop()})`);
}

// ── V4: is p(G) exactly the best bound? ───────────────────────────────────
//
// The bounds are PROVED ≤ p(G) (see the derivations above), so equality only
// needs the other direction: exhibit a decomposition whose size equals the
// bound. That is one feasibility check per graph instead of an escalation, which
// is what makes a whole order affordable.
if (EQUAL_N > 0) {
  console.log(`\nV4. is p(G) = the best bound? all connected graphs on n = ${EQUAL_N}`);
  const pairs = allPairs(EQUAL_N);
  let checked = 0;
  let equal = 0;
  let gaps = 0;
  let undec = 0;
  const witnesses: string[] = [];
  const t0 = performance.now();
  for (const g6 of await gengConnected(EQUAL_N)) {
    const { edgeMask } = parseGraph6(g6);
    const b = localBounds(EQUAL_N, edgeMask, pairs);
    b.L5 = boundaryBound(EQUAL_N, edgeMask, pairs, subsetPathNumbers(EQUAL_N, edgeMask, pairs));
    const target = Math.max(b.best, b.L5);
    checked++;
    const quick = pathNumberAtMost(EQUAL_N, edgeMask, pairs, target);
    if (quick.ok) {
      equal++;
      continue;
    }
    try {
      const ex = decompWithEndpointsExact(EQUAL_N, edgeMask, pairs, target, [], NODE_LIMIT);
      if (ex.paths) equal++;
      else {
        gaps++;
        if (witnesses.length < 8) witnesses.push(`${g6} bound=${target} but p > ${target}`);
      }
    } catch (e) {
      if (!(e instanceof SearchLimitExceeded)) throw e;
      undec++;
    }
  }
  const secs = (performance.now() - t0) / 1000;
  if (gaps === 0 && undec === 0) {
    ok(`${equal.toLocaleString()}/${checked.toLocaleString()} graphs: p(G) equals the best bound EXACTLY — no gaps at n = ${EQUAL_N} (${secs.toFixed(0)}s)`);
  } else {
    note(`${equal.toLocaleString()}/${checked.toLocaleString()} equal; ${gaps} with p strictly above every bound; ${undec} undecided (${secs.toFixed(0)}s)`);
    for (const w of witnesses) note(`    ${w}`);
  }
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILURES`}`);
process.exit(failures === 0 ? 0 : 1);
