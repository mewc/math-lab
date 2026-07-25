/**
 * The ENDPOINT PROPERTY for Gallai's path decomposition conjecture.
 *
 * Write B(n) = ceil(n/2) and p(G) for the path number. Call G *tight* if
 * p(G) = B(n). Define, for a connected G on n vertices and a vertex v:
 *
 *   E(G, v):  G has a path decomposition of size ≤ B(n) in which v is an
 *             END of some path.
 *
 * Why it matters — it closes the even-n leaf induction with no search:
 *
 *   THEOREM D (leaf reduction).  Let G be connected on n ≥ 2 vertices with a
 *   leaf x attached at a, and H = G − x. If p(H) ≤ B(n−1) and E(H, a) holds,
 *   then p(G) ≤ B(n).
 *     Proof. H is connected on n−1 vertices. If p(H) ≤ B(n) − 1, take such a
 *     decomposition and add the single-edge path (a,x): size ≤ B(n). Otherwise
 *     B(n−1) ≥ p(H) ≥ B(n), and since B(n−1) ≤ B(n) we get p(H) = B(n).
 *     By E(H, a) there is a decomposition D of H of size ≤ B(n) with a an end
 *     of some path P ∈ D. Replace P by P + ax; x ∉ V(H) so this is again a
 *     path, and the edge ax was uncovered. |D| ≤ B(n). ∎
 *   No parity split, no case (iv) forced-endpoint search: the campaign's
 *   even-n leaf gap becomes exactly "E holds on order n−1".
 *
 * E is far from arbitrary — two elementary lemmas confine where it can fail:
 *
 *   THEOREM A (splitting; all n).  If p(G) ≤ B(n) − 1 then E(G, v) holds for
 *   every vertex v of positive degree.
 *     Proof. Take D with |D| ≤ B(n) − 1. If some path ends at v, done. Else v
 *     is interior to some P ∈ D (it has an edge, and that edge lies on some
 *     path). Cut P at v into P₁, P₂ — both have ≥ 1 edge, both are paths, and
 *     they cover exactly the edges of P. The result has size |D| + 1 ≤ B(n)
 *     and v ends P₁. ∎
 *
 *   THEOREM B (parity; all n).  In EVERY path decomposition D of G, the number
 *   of paths ending at v is ≡ deg(v) (mod 2). Hence if deg(v) is odd, v is an
 *   end of some path in every decomposition, so E(G, v) holds whenever
 *   p(G) ≤ B(n).
 *     Proof. Each path of D uses 2 edges at v if v is interior to it, 1 if v
 *     ends it, 0 otherwise; summing over D gives deg(v). ∎
 *
 *   LEMMA G (orbit; all n).  If some decomposition of size ≤ B(n) has an end b
 *   and some automorphism of G carries b to v, then E(G, v) holds — relabel the
 *   decomposition along the automorphism. Every path has two ends, so EVERY
 *   vertex-transitive graph satisfies E at every vertex. In particular E holds
 *   for K_n, for cycles, and for circulants; K_n matters because it is the
 *   extremal tight graph at odd order (see the density census below).
 *
 *   COROLLARY C.  E(G, v) can fail only if G is tight AND deg(v) is even.
 *   In particular E holds for every graph with all degrees odd, and for every
 *   TREE: a tree has p(T) = q/2 with q = #odd-degree vertices, so tightness
 *   q/2 = ceil(n/2) forces q = n — all degrees odd — and Theorem B applies.
 *
 * This script machine-checks all of the above and then attacks what Corollary C
 * leaves: tight graphs at even-degree vertices, by EXHAUSTIVE forced-endpoint
 * search (`decompWithEndpointsExact` — a null result is a proof, not a
 * timeout). Checks:
 *
 *   S0. Engine validation. (a) exact p(T) = q/2 on every tree n ≤ TREE_N,
 *       q = #odd-degree vertices — a known closed form, so this pins the
 *       solver in BOTH directions (finds q/2, proves q/2−1 impossible).
 *       (b) exact p(K_n) = ceil(n/2). (c) soundness against the campaign's
 *       existing capped engine, which is sound but incomplete: its failure at
 *       a budget is NOT a proof of tightness. Quantified here.
 *   S1. Parity identity (Theorem B) re-verified on every certificate produced.
 *   S2. Splitting (Theorem A): explicit split certificate for every non-tight
 *       connected graph n ≤ N and every vertex.
 *   S3. E on tight graphs: exhaustive endpoint search at every even-degree
 *       vertex of every tight connected graph n ≤ N; certificates verified.
 *       (Odd-degree vertices are also run, as a check of Theorem B.)
 *   S4. Pendant equivalence: for tight G, E(G,v) ⇔ p(G + pendant at v) ≤ B(n)
 *       — an independent route to the same bit, via the plain solver.
 *   S5. Probe of the two-endpoint strengthening E₂(G,u,v) on tight graphs
 *       n ≤ E2_N (needed for a self-contained Gallai+E induction; failures are
 *       reported, not hidden).
 *
 * Exit 0 only if S0–S4 pass with zero failures. S5 is a probe: its outcome is
 * reported either way. Nothing here claims a proof of Gallai.
 *
 * Run:
 *   bun research/gallai-endpoint.ts              # n ≤ 8, fast
 *   bun research/gallai-endpoint.ts --n 9        # full (minutes)
 *   bun research/gallai-endpoint.ts --n 7 --e2-n 7
 */

import {
  allPairs,
  buildAdj,
  completeMask,
  decompWithEndpointsExact,
  degrees,
  edgeCount,
  gallaiBound,
  maskFromEdges,
  parseGraph6,
  pathLowerBound,
  pathNumberAtMost,
  SearchLimitExceeded,
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

const N = Number(opt("n", "8"));
const XV_N = Number(opt("xv-n", "6"));
const TREE_N = Number(opt("tree-n", "10"));
const KN_N = Number(opt("kn-n", "8"));
const E2_N = Number(opt("e2-n", "6"));
const NODE_LIMIT = Number(opt("node-limit", "8000000"));
const OUT = opt("out", "");

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

async function gengConnected(n: number): Promise<string[]> {
  const geng = Bun.which("geng");
  if (!geng) throw new Error("geng not on PATH (brew install nauty)");
  if (n === 1) return ["@"];
  const proc = Bun.spawn([geng, "-c", "-q", String(n)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

/** Trees on n vertices = connected graphs with exactly n−1 edges. */
async function gengTrees(n: number): Promise<string[]> {
  const geng = Bun.which("geng");
  if (!geng) throw new Error("geng not on PATH (brew install nauty)");
  if (n <= 2) return n === 2 ? ["A_"] : ["@"];
  const proc = Bun.spawn([geng, "-c", "-q", String(n), `${n - 1}:${n - 1}`], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

// ── S1: parity identity, run on every certificate we produce ───────────────

let certsChecked = 0;
let parityChecked = 0;
/** Graphs the capped engine calls tight but the exhaustive search refutes. */
let cappedOvercount = 0;

/** Verify a decomposition and the Theorem B parity identity on it. */
function checkCert(
  n: number,
  mask: EdgeMask,
  pairs: Array<[number, number]>,
  paths: number[][],
  deg: number[],
  label: string,
): boolean {
  const v = verifyDecomposition(n, mask, pairs, paths);
  if (!v.ok) {
    fail(`${label}: bad certificate — ${v.reason}`);
    return false;
  }
  certsChecked++;
  const ends = new Int32Array(n);
  for (const P of paths) {
    ends[P[0]!]!++;
    ends[P[P.length - 1]!]!++;
  }
  for (let u = 0; u < n; u++) {
    if ((ends[u]! & 1) !== (deg[u]! & 1)) {
      fail(`${label}: parity identity violated at vertex ${u} (ends=${ends[u]}, deg=${deg[u]})`);
      return false;
    }
  }
  parityChecked++;
  return true;
}

// ── Theorem A: constructive split at v ─────────────────────────────────────

function splitAt(paths: number[][], v: number): number[][] | null {
  for (const P of paths) {
    if (P[0] === v || P[P.length - 1] === v) return paths.map((p) => p.slice());
  }
  for (let pi = 0; pi < paths.length; pi++) {
    const P = paths[pi]!;
    const i = P.indexOf(v);
    if (i <= 0 || i >= P.length - 1) continue;
    const out = paths.filter((_, k) => k !== pi).map((p) => p.slice());
    out.push(P.slice(0, i + 1), P.slice(i));
    return out;
  }
  return null;
}

// ── decisive path number ───────────────────────────────────────────────────

type PathNum =
  | { kind: "le"; num: number; paths: number[][] } // certified p(G) ≤ num
  | { kind: "tight"; paths: number[][] } // p(G) = B, exhaustively decided
  | { kind: "undecided" };

/**
 * Decide whether G is tight. Fast path: the capped engine finds a decomp of
 * size ≤ B−1 (certificate ⇒ non-tight). Slow path: exhaustive search at B−1;
 * a null there is a proof of tightness.
 */
function classify(
  n: number,
  mask: EdgeMask,
  pairs: Array<[number, number]>,
  B: number,
): PathNum {
  if (edgeCount(mask) === 0) return { kind: "le", num: 0, paths: [] };
  const quick = pathNumberAtMost(n, mask, pairs, B - 1);
  if (quick.ok) return { kind: "le", num: quick.num, paths: quick.paths };
  let below: { paths: number[][] | null };
  try {
    below = decompWithEndpointsExact(n, mask, pairs, B - 1, [], NODE_LIMIT);
  } catch (e) {
    if (e instanceof SearchLimitExceeded) return { kind: "undecided" };
    throw e;
  }
  if (below.paths) {
    cappedOvercount++;
    return { kind: "le", num: below.paths.length, paths: below.paths };
  }
  const at = pathNumberAtMost(n, mask, pairs, B);
  if (!at.ok) {
    // Would be a counterexample to Gallai — escalate to the exact engine.
    const ex = decompWithEndpointsExact(n, mask, pairs, B, [], NODE_LIMIT);
    if (!ex.paths) return { kind: "undecided" };
    return { kind: "tight", paths: ex.paths };
  }
  return { kind: "tight", paths: at.paths };
}

/** G plus a new pendant vertex at v, as an (n+1)-vertex graph. */
function withPendant(
  n: number,
  edges: Array<[number, number]>,
  v: number,
): { n: number; mask: EdgeMask; pairs: Array<[number, number]> } {
  const n2 = n + 1;
  const e2: Array<[number, number]> = edges.map(([a, b]) => [a, b]);
  e2.push([v, n]);
  return { n: n2, mask: maskFromEdges(n2, e2), pairs: allPairs(n2) };
}

async function main() {
  console.log(`Gallai endpoint property E(G,v) — exhaustive check (n ≤ ${N})\n`);

  // ── S0: validate the exact engine against closed forms + the old engine ──
  console.log(`S0a. exact p(T) = q/2 on every tree (n ≤ ${TREE_N}), q = #odd-degree`);
  {
    let trees = 0;
    let bad = 0;
    for (let n = 2; n <= TREE_N; n++) {
      const pairs = allPairs(n);
      for (const g6 of await gengTrees(n)) {
        const { edgeMask } = parseGraph6(g6);
        const deg = degrees(buildAdj(n, edgeMask, pairs));
        const q = deg.filter((d) => d % 2 === 1).length;
        const target = q / 2;
        const at = decompWithEndpointsExact(n, edgeMask, pairs, target, [], NODE_LIMIT);
        const below = decompWithEndpointsExact(n, edgeMask, pairs, target - 1, [], NODE_LIMIT);
        if (!at.paths || below.paths) {
          bad++;
          if (bad <= 3) {
            fail(`tree n=${n} ${g6}: q/2=${target} but at=${at.paths?.length ?? "none"}, below=${below.paths?.length ?? "none"}`);
          }
          continue;
        }
        if (!checkCert(n, edgeMask, pairs, at.paths, deg, `tree n=${n} ${g6}`)) continue;
        trees++;
      }
    }
    if (bad === 0) ok(`${trees} trees: exact path number equals q/2 in both directions`);
  }

  console.log(`S0b. exact p(K_n) = ceil(n/2) (n ≤ ${KN_N}), tight in both directions`);
  {
    let bad = 0;
    for (let n = 2; n <= KN_N; n++) {
      const pairs = allPairs(n);
      const mask = completeMask(n);
      const deg = degrees(buildAdj(n, mask, pairs));
      const B = gallaiBound(n);
      const at = decompWithEndpointsExact(n, mask, pairs, B, [], NODE_LIMIT);
      const below = decompWithEndpointsExact(n, mask, pairs, B - 1, [], NODE_LIMIT);
      if (!at.paths || below.paths) {
        fail(`K_${n}: expected p=${B}, got at=${at.paths?.length ?? "none"} below=${below.paths?.length ?? "none"}`);
        bad++;
        continue;
      }
      checkCert(n, mask, pairs, at.paths, deg, `K_${n}`);
    }
    if (bad === 0) ok(`K_2..K_${KN_N}: p = ceil(n/2) exactly`);
  }

  console.log(`S0c. soundness vs. the campaign's capped engine, connected n ≤ ${XV_N}`);
  {
    let compared = 0;
    let unsound = 0;
    let looser = 0;
    for (let n = 2; n <= XV_N; n++) {
      const pairs = allPairs(n);
      for (const g6 of await gengConnected(n)) {
        const { edgeMask } = parseGraph6(g6);
        const m = edgeCount(edgeMask);
        let exact = m;
        for (let b = 1; b <= m; b++) {
          const r = decompWithEndpointsExact(n, edgeMask, pairs, b, [], NODE_LIMIT);
          if (r.paths) {
            const deg = degrees(buildAdj(n, edgeMask, pairs));
            if (!checkCert(n, edgeMask, pairs, r.paths, deg, `n=${n} ${g6} exact@${b}`)) break;
            exact = r.paths.length;
            break;
          }
        }
        // smallest budget the capped engine can certify
        let oldMin = m;
        for (let b = 1; b <= m; b++) {
          if (pathNumberAtMost(n, edgeMask, pairs, b).ok) {
            oldMin = b;
            break;
          }
        }
        if (oldMin < exact) {
          unsound++;
          if (unsound <= 3) fail(`n=${n} ${g6}: capped engine certified ${oldMin} < exact ${exact}`);
        } else if (oldMin > exact) {
          looser++;
        }
        compared++;
      }
    }
    if (unsound === 0) ok(`${compared} graphs: capped engine never beats the exact optimum (sound)`);
    note(`capped engine misses the optimum on ${looser}/${compared} graphs — its failure at a budget is NOT a proof of tightness`);
  }

  // ── S2/S3/S4 main sweep ─────────────────────────────────────────────────
  console.log(`\nS2–S4. splitting / E on tight graphs / pendant equivalence`);
  const census: Array<{
    n: number;
    graphs: number;
    tight: number;
    tightEven: number;
    evenPairs: number;
    maxNodes: number;
    secs: number;
    lbForced: number;
    structForced: number;
    denseViolations: number;
  }> = [];
  const tightEvenSamples: string[] = [];
  let undecided = 0;
  let splitChecks = 0;
  let eChecks = 0;
  let pendantChecks = 0;

  for (let n = 2; n <= N; n++) {
    const B = gallaiBound(n);
    const pairs = allPairs(n);
    const graphs = await gengConnected(n);
    const t0 = performance.now();
    let tight = 0;
    let tightEven = 0;
    let lbForced = 0;
    let structForced = 0;
    let denseViolations = 0;
    let evenPairs = 0;
    let maxNodes = 0;

    for (const g6 of graphs) {
      const { edgeMask, edges } = parseGraph6(g6);
      const adj = buildAdj(n, edgeMask, pairs);
      const deg = degrees(adj);
      const cls = classify(n, edgeMask, pairs, B);

      if (cls.kind === "undecided") {
        undecided++;
        if (undecided <= 5) fail(`n=${n} ${g6}: path number undecided within node limit`);
        continue;
      }

      if (cls.kind === "le") {
        // Non-tight (p ≤ B−1): Theorem A gives E(G,v) for every v, constructively.
        if (!checkCert(n, edgeMask, pairs, cls.paths, deg, `n=${n} ${g6} base`)) continue;
        if (cls.paths.length > B - 1) {
          fail(`n=${n} ${g6}: classified non-tight but certificate has size ${cls.paths.length} > ${B - 1}`);
          continue;
        }
        for (let v = 0; v < n; v++) {
          if (deg[v]! === 0) continue;
          const split = splitAt(cls.paths, v);
          if (!split) {
            fail(`n=${n} ${g6}: split at ${v} failed (v neither end nor interior)`);
            continue;
          }
          if (split.length > B) {
            fail(`n=${n} ${g6}: split at ${v} gave size ${split.length} > ${B}`);
            continue;
          }
          const endsAtV = split.some((P) => P[0] === v || P[P.length - 1] === v);
          if (!endsAtV) {
            fail(`n=${n} ${g6}: split at ${v} does not end at ${v}`);
            continue;
          }
          if (!checkCert(n, edgeMask, pairs, split, deg, `n=${n} ${g6} split@${v}`)) continue;
          splitChecks++;
        }
        continue;
      }

      // Tight graph: the only place E can fail (Corollary C).
      tight++;
      const m = edgeCount(edgeMask);
      if (pathLowerBound(deg, m, n) >= B) lbForced++;
      else structForced++;
      // At odd n the odd-vertex bound (≤ (n−1)/2) and the max-degree bound
      // (≤ (n−1)/2) both fall short of B = (n+1)/2, so only the edge bound
      // m > (n−1)·(B−1) = (n−1)²/2 can force tightness. Does anything else?
      if (n % 2 === 1 && 2 * m <= (n - 1) * (n - 1)) denseViolations++;
      if (!checkCert(n, edgeMask, pairs, cls.paths, deg, `n=${n} ${g6} tight`)) continue;
      const hasEven = deg.some((d) => d > 0 && d % 2 === 0);
      if (hasEven && tightEvenSamples.length < 40) tightEvenSamples.push(`n=${n} ${g6}`);
      if (hasEven) tightEven++;

      for (let v = 0; v < n; v++) {
        if (deg[v]! === 0) continue;
        let res: { paths: number[][] | null; nodes: number };
        try {
          res = decompWithEndpointsExact(n, edgeMask, pairs, B, [v], NODE_LIMIT);
        } catch (e) {
          if (e instanceof SearchLimitExceeded) {
            undecided++;
            fail(`n=${n} ${g6}: E(G,${v}) undecided within node limit`);
            continue;
          }
          throw e;
        }
        if (res.nodes > maxNodes) maxNodes = res.nodes;
        if (!res.paths) {
          fail(`n=${n} ${g6}: E(G,${v}) FALSE (deg=${deg[v]}, tight, exhaustive) — counterexample to the endpoint property`);
          continue;
        }
        if (res.paths.length > B) {
          fail(`n=${n} ${g6}: E(G,${v}) certificate size ${res.paths.length} > ${B}`);
          continue;
        }
        if (!res.paths.some((P) => P[0] === v || P[P.length - 1] === v)) {
          fail(`n=${n} ${g6}: E(G,${v}) certificate does not end at ${v}`);
          continue;
        }
        if (!checkCert(n, edgeMask, pairs, res.paths, deg, `n=${n} ${g6} E@${v}`)) continue;
        eChecks++;
        if (deg[v]! % 2 === 0) evenPairs++;

        // S4: independent route — E(G,v) ⇔ p(G+pendant at v) ≤ B (G tight).
        if (n <= Math.min(N, 8)) {
          const P = withPendant(n, edges, v);
          const pend = decompWithEndpointsExact(P.n, P.mask, P.pairs, B, [], NODE_LIMIT);
          if (!pend.paths) {
            fail(`n=${n} ${g6}: pendant equivalence broken at ${v} (E true but p(G+pendant) > ${B})`);
            continue;
          }
          pendantChecks++;
        }
      }
    }

    const secs = (performance.now() - t0) / 1000;
    census.push({
      n,
      graphs: graphs.length,
      tight,
      tightEven,
      evenPairs,
      maxNodes,
      secs,
      lbForced,
      structForced,
      denseViolations,
    });
    console.log(
      `  n=${String(n).padStart(2)}  B=${B}  graphs=${String(graphs.length).padStart(7)}` +
        `  tight=${String(tight).padStart(6)}  tight&even=${String(tightEven).padStart(6)}` +
        `  E@even=${String(evenPairs).padStart(7)}  lb-forced=${String(lbForced).padStart(6)}` +
        `  struct=${String(structForced).padStart(5)}  ${secs.toFixed(1)}s`,
    );
  }

  if (undecided === 0) ok(`no undecided graphs (node limit ${NODE_LIMIT.toLocaleString()})`);
  note(
    `capped engine called ${cappedOvercount} graphs tight that the exhaustive ` +
      `search decomposes below B — tight censuses computed with the capped ` +
      `engine are upper bounds`,
  );
  ok(`Theorem A: ${splitChecks} split certificates verified (non-tight graphs)`);
  ok(`E: ${eChecks} endpoint certificates verified on tight graphs`);
  ok(`S4: ${pendantChecks} pendant-equivalence cross-checks passed`);
  ok(`S1: parity identity holds on all ${parityChecked}/${certsChecked} certificates`);

  // ── S5: two-endpoint probe ──────────────────────────────────────────────
  console.log(`\nS5. probe: two-endpoint property E₂(G,u,v) on tight graphs (n ≤ ${E2_N})`);
  {
    let pairsTested = 0;
    let pairsFailed = 0;
    let failedMinDeg3 = 0;
    let pairsUndecided = 0;
    const examples: string[] = [];
    for (let n = 3; n <= Math.min(E2_N, N); n++) {
      const B = gallaiBound(n);
      const pairs = allPairs(n);
      for (const g6 of await gengConnected(n)) {
        const { edgeMask } = parseGraph6(g6);
        const adj = buildAdj(n, edgeMask, pairs);
        const deg = degrees(adj);
        const cls = classify(n, edgeMask, pairs, B);
        if (cls.kind !== "tight") continue;
        for (let u = 0; u < n; u++) {
          for (let v = u + 1; v < n; v++) {
            if (deg[u]! === 0 || deg[v]! === 0) continue;
            let r: { paths: number[][] | null };
            try {
              r = decompWithEndpointsExact(n, edgeMask, pairs, B, [u, v], NODE_LIMIT);
            } catch (e) {
              if (e instanceof SearchLimitExceeded) {
                // Dense tight graphs can exhaust the node limit. Counted, not
                // hidden: an undecided instance is not evidence either way.
                pairsUndecided++;
                continue;
              }
              throw e;
            }
            pairsTested++;
            if (!r.paths) {
              pairsFailed++;
              if (deg[u]! >= 3 && deg[v]! >= 3) failedMinDeg3++;
              if (examples.length < 8) {
                examples.push(`n=${n} ${g6} {${u},${v}} deg=(${deg[u]},${deg[v]})`);
              }
            } else if (
              !r.paths.some((P) => P[0] === u || P[P.length - 1] === u) ||
              !r.paths.some((P) => P[0] === v || P[P.length - 1] === v)
            ) {
              fail(`E₂ certificate at n=${n} ${g6} {${u},${v}} misses an endpoint`);
            }
          }
        }
      }
    }
    if (pairsUndecided > 0) {
      note(`${pairsUndecided} instances undecided at the ${NODE_LIMIT.toLocaleString()}-node limit (excluded from the counts below)`);
    }
    if (pairsFailed === 0) {
      note(`E₂ held for all ${pairsTested} (tight graph, vertex pair) instances — strengthening survives`);
    } else {
      note(`E₂ FAILS for ${pairsFailed}/${pairsTested} instances — strengthening is false, examples:`);
      for (const e of examples) note(`    ${e}`);
      note(
        `of those failures, ${failedMinDeg3} have both vertices of degree ≥ 3 ` +
          `(degree-2 vertices are removable by the splice reduction, so only ` +
          `these obstruct a δ≥3 induction)`,
      );
    }
  }

  console.log(`\nCensus (tight graphs are the only place E can fail):`);
  for (const c of census) {
    console.log(
      `  n=${c.n}: connected=${c.graphs} tight=${c.tight} tight-with-even-vertex=${c.tightEven}` +
        ` lb-forced=${c.lbForced} structure-forced=${c.structForced} maxSearchNodes=${c.maxNodes}`,
    );
  }
  const oddCensus = census.filter((c) => c.n % 2 === 1 && c.n >= 3);
  const oddViol = oddCensus.reduce((a, c) => a + c.denseViolations, 0);
  console.log(`\nOdd order (the orders Theorem D actually needs E for):`);
  for (const c of oddCensus) {
    console.log(
      `  n=${c.n}: tight=${c.tight}, all with 2m > (n−1)² = ${(c.n - 1) ** 2}? ` +
        `${c.denseViolations === 0 ? "yes" : `NO (${c.denseViolations} violations)`}`,
    );
  }
  if (oddViol === 0) {
    note(
      `every tight graph of odd order n ≤ ${N} is density-forced (m > (n−1)²/2): ` +
        `the even-n leaf gap lives only on near-complete graphs`,
    );
  } else {
    note(`${oddViol} tight graphs of odd order are NOT density-forced — the localisation fails`);
  }
  if (tightEvenSamples.length) {
    console.log(`\nSample tight graphs with an even-degree vertex (the hard class):`);
    for (const s of tightEvenSamples.slice(0, 12)) console.log(`  ${s}`);
  }

  if (OUT) {
    await Bun.write(
      OUT,
      JSON.stringify({ n: N, census, splitChecks, eChecks, pendantChecks, certsChecked, undecided }, null, 2),
    );
    console.log(`\nwrote ${OUT}`);
  }

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILURES`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
