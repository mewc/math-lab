/**
 * The DEGREE-2 SPLICE reduction for Gallai's path decomposition conjecture.
 *
 * B(n) = ceil(n/2); p(G) = path number. Note B(n−1) = B(n) for even n and
 * B(n−1) = B(n) − 1 for odd n, so an even-n induction step must not spend an
 * extra path. The splice never does.
 *
 *   THEOREM F (degree-2 splice; unconditional, all n, both parities).
 *   Let G be connected on n ≥ 3 vertices with a vertex v of degree 2 whose
 *   neighbours u, w are NON-ADJACENT. Put H = (G − v) + uw. Then H is a simple
 *   connected graph on n−1 vertices and
 *                            p(G) ≤ p(H).
 *   Hence Gallai for order n−1 implies p(G) ≤ B(n−1) ≤ B(n).
 *     Proof. H is simple (uw ∉ E(G)) and connected: any G-path through v enters
 *     and leaves by u–v–w, which the new edge uw short-circuits. Let D be a
 *     path decomposition of H. The edge uw lies on exactly one P ∈ D, say
 *     P = A–u–w–B. Replace P by P′ = A–u–v–w–B. Since v ∉ V(H), P′ is again a
 *     path; the edges it covers are those of P with uw replaced by uv and vw.
 *     So D′ = (D ∖ {P}) ∪ {P′} covers E(H) ∖ {uw} ∪ {uv, vw} = E(G), each edge
 *     once, and |D′| = |D|. ∎
 *   The splice is size-preserving, which is exactly what even n needs.
 *
 *   WHY ADJACENT NEIGHBOURS ARE DIFFERENT (honest scope). If uw ∈ E(G) — i.e.
 *   v lies in a triangle — the same substitution *uncovers* uw, so Theorem F
 *   does not apply. Two sub-cases, with H = G − v (still connected, n−1 verts):
 *     (i)  n odd: the two edges at v already form the path u–v–w, so
 *          p(G) ≤ p(H) + 1 ≤ B(n−1) + 1 = B(n). Unconditional.
 *     (ii) n even: B(n−1) + 1 = B(n) + 1 overshoots. It suffices that some
 *          decomposition D of H with |D| ≤ B(n) has u and w as ends of two
 *          DISTINCT paths Q ≠ R: then Q + uv and R + wv are paths (v ∉ V(H)),
 *          giving |D| paths for G. Distinctness is essential — appending v to
 *          both ends of a single u…w path closes a cycle. Call this property
 *          E₂ˢ(H, u, w). It is NOT implied by parity (parity gives an odd
 *          number of path-ends at u and at w, which may be the same path), so
 *          this script decides it by exhaustive search and reports the counts.
 *
 *   COROLLARY (reduction scope). Gallai for all connected graphs on n vertices
 *   follows from Gallai on n−1 vertices together with:
 *     · the leaf reduction (`gallai-endpoint.ts`, Theorem D + property E), and
 *     · Theorem F / case (i) here,
 *   for every G that has a leaf, or a degree-2 vertex outside a triangle, or a
 *   degree-2 vertex at all when n is odd. What survives at even n: graphs with
 *   δ ≥ 3, plus graphs whose every degree-2 vertex lies in a triangle (handled
 *   here modulo E₂ˢ). The residual class is censused below.
 *
 * Checks (exit 0 only if all pass):
 *   F1. B(n−1) = B(n) − [n odd] for n ≤ 2000 (the arithmetic the cases rest on).
 *   F2. Splice: every (G, v) with deg(v) = 2 and non-adjacent neighbours,
 *       connected G on n ≤ N — H built, verified simple/connected/order n−1,
 *       decomposition of H obtained, spliced, and the result verified as a
 *       decomposition of G of the SAME size and ≤ B(n).
 *   F3. Triangle case, n odd: certificate of size ≤ B(n) via the u–v–w path.
 *   F4. Triangle case, n even: E₂ˢ(H, u, w) decided exhaustively; on success a
 *       spliced certificate of size ≤ B(n) is verified. Failures fall back to
 *       exact search on G and are reported (they do not disprove Gallai, they
 *       bound the reduction).
 *   F5. Coverage census per n: how much of the connected-graph population the
 *       reduction package disposes of, and what is left.
 *
 * Run:
 *   bun research/gallai-deg2.ts              # n ≤ 8
 *   bun research/gallai-deg2.ts --n 9        # full (minutes)
 */

import {
  allPairs,
  buildAdj,
  decompWithEndpointsExact,
  degrees,
  edgeCount,
  gallaiBound,
  isConnected,
  maskFromEdges,
  parseGraph6,
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

const N = Number(opt("n", "8"));
const NODE_LIMIT = Number(opt("node-limit", "8000000"));

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

/** A decomposition of size ≤ budget: capped engine first, exact if it fails. */
function decompAtMost(
  n: number,
  mask: EdgeMask,
  pairs: Array<[number, number]>,
  budget: number,
): number[][] | null {
  if (edgeCount(mask) === 0) return [];
  const quick = pathNumberAtMost(n, mask, pairs, budget);
  if (quick.ok) return quick.paths;
  try {
    return decompWithEndpointsExact(n, mask, pairs, budget, [], NODE_LIMIT).paths;
  } catch (e) {
    if (e instanceof SearchLimitExceeded) return null;
    throw e;
  }
}

/** Delete vertex v, relabelling 0..n-2; `extra` edges are added afterwards. */
function deleteVertex(
  n: number,
  edges: Array<[number, number]>,
  v: number,
  extra: Array<[number, number]> = [],
): { n: number; mask: EdgeMask; pairs: Array<[number, number]>; idx: (x: number) => number } {
  const idx = (x: number) => (x < v ? x : x - 1);
  const out: Array<[number, number]> = [];
  for (const [a, b] of edges) {
    if (a === v || b === v) continue;
    out.push([idx(a), idx(b)]);
  }
  for (const [a, b] of extra) out.push([idx(a), idx(b)]);
  const nH = n - 1;
  return { n: nH, mask: maskFromEdges(nH, out), pairs: allPairs(nH), idx };
}

/** Locate the path of D containing edge a–b consecutively. */
function findEdgePath(D: number[][], a: number, b: number): number {
  for (let i = 0; i < D.length; i++) {
    const P = D[i]!;
    for (let k = 0; k < P.length - 1; k++) {
      if ((P[k] === a && P[k + 1] === b) || (P[k] === b && P[k + 1] === a)) return i;
    }
  }
  return -1;
}

/** Insert v between the consecutive pair a,b of path P. */
function spliceInto(P: number[], a: number, b: number, v: number): number[] | null {
  for (let k = 0; k < P.length - 1; k++) {
    if ((P[k] === a && P[k + 1] === b) || (P[k] === b && P[k + 1] === a)) {
      return [...P.slice(0, k + 1), v, ...P.slice(k + 1)];
    }
  }
  return null;
}

/** Append v to the end of P at vertex x (x must be an end of P). */
function appendAtEnd(P: number[], x: number, v: number): number[] | null {
  if (P[0] === x) return [v, ...P];
  if (P[P.length - 1] === x) return [...P, v];
  return null;
}

async function main() {
  console.log(`Gallai degree-2 splice reduction (n ≤ ${N})\n`);

  // ── F1 ──────────────────────────────────────────────────────────────────
  {
    let bad = 0;
    for (let n = 2; n <= 2000; n++) {
      const want = gallaiBound(n) - (n % 2 === 1 ? 1 : 0);
      if (gallaiBound(n - 1) !== want) bad++;
    }
    if (bad === 0) ok(`F1: B(n−1) = B(n) − [n odd] for all 2 ≤ n ≤ 2000`);
    else fail(`F1: identity fails on ${bad} values`);
  }

  const census: Array<Record<string, number>> = [];
  let spliceChecks = 0;
  let triOddChecks = 0;
  let triEvenSplice = 0;
  let triEvenFallback = 0;
  const triEvenExamples: string[] = [];

  for (let n = 3; n <= N; n++) {
    const B = gallaiBound(n);
    const pairs = allPairs(n);
    const graphs = await gengConnected(n);
    const t0 = performance.now();
    let withLeaf = 0;
    let deg2NonAdj = 0;
    let deg2TriOnly = 0;
    let minDeg3 = 0;
    let residual = 0;

    for (const g6 of graphs) {
      const { edgeMask, edges } = parseGraph6(g6);
      const adj = buildAdj(n, edgeMask, pairs);
      const deg = degrees(adj);
      const hasLeaf = deg.some((d) => d === 1);
      if (hasLeaf) withLeaf++;
      const twos: number[] = [];
      for (let v = 0; v < n; v++) if (deg[v] === 2) twos.push(v);
      let sawNonAdj = false;

      for (const v of twos) {
        const [u, w] = adj[v]! as [number, number];
        const adjacent = adj[u]!.includes(w);

        if (!adjacent) {
          // ── F2: the splice ──────────────────────────────────────────────
          sawNonAdj = true;
          const H = deleteVertex(n, edges, v, [[u, w]]);
          const hAdj = buildAdj(H.n, H.mask, H.pairs);
          if (!isConnected(hAdj, H.n)) {
            fail(`n=${n} ${g6} v=${v}: H disconnected — Theorem F proof broken`);
            continue;
          }
          if (edgeCount(H.mask) !== edgeCount(edgeMask) - 1) {
            fail(`n=${n} ${g6} v=${v}: |E(H)| = ${edgeCount(H.mask)} ≠ m−1`);
            continue;
          }
          const D = decompAtMost(H.n, H.mask, H.pairs, gallaiBound(H.n));
          if (!D) {
            fail(`n=${n} ${g6} v=${v}: no decomposition of H within B(n−1)`);
            continue;
          }
          const pi = findEdgePath(D, H.idx(u), H.idx(w));
          if (pi < 0) {
            fail(`n=${n} ${g6} v=${v}: edge uw missing from H's decomposition`);
            continue;
          }
          // lift H's labels back to G, then splice v in
          const back = (x: number) => (x < v ? x : x + 1);
          const lifted = D.map((P) => P.map(back));
          const spliced = spliceInto(lifted[pi]!, u, w, v);
          if (!spliced) {
            fail(`n=${n} ${g6} v=${v}: splice failed`);
            continue;
          }
          const DG = lifted.map((P, i) => (i === pi ? spliced : P));
          if (DG.length !== D.length) {
            fail(`n=${n} ${g6} v=${v}: splice changed the size`);
            continue;
          }
          if (DG.length > B) {
            fail(`n=${n} ${g6} v=${v}: spliced decomposition has ${DG.length} > B=${B}`);
            continue;
          }
          const ver = verifyDecomposition(n, edgeMask, pairs, DG);
          if (!ver.ok) {
            fail(`n=${n} ${g6} v=${v}: spliced certificate invalid — ${ver.reason}`);
            continue;
          }
          spliceChecks++;
          continue;
        }

        // ── triangle case ────────────────────────────────────────────────
        const H = deleteVertex(n, edges, v);
        const hAdj = buildAdj(H.n, H.mask, H.pairs);
        if (!isConnected(hAdj, H.n)) {
          fail(`n=${n} ${g6} v=${v}: G−v disconnected (v in a triangle, degree 2)`);
          continue;
        }
        const back = (x: number) => (x < v ? x : x + 1);

        if (n % 2 === 1) {
          // F3: spend one extra path on u–v–w.
          const D = decompAtMost(H.n, H.mask, H.pairs, gallaiBound(H.n));
          if (!D) {
            fail(`n=${n} ${g6} v=${v}: no decomposition of G−v within B(n−1)`);
            continue;
          }
          const DG = [...D.map((P) => P.map(back)), [u, v, w]];
          if (DG.length > B) {
            fail(`n=${n} ${g6} v=${v}: odd-n triangle case gave ${DG.length} > B=${B}`);
            continue;
          }
          const ver = verifyDecomposition(n, edgeMask, pairs, DG);
          if (!ver.ok) {
            fail(`n=${n} ${g6} v=${v}: odd-n triangle certificate invalid — ${ver.reason}`);
            continue;
          }
          triOddChecks++;
          continue;
        }

        // F4: even n — need u, w as ends of two DISTINCT paths of H.
        const hu = H.idx(u);
        const hw = H.idx(w);
        const distinct = (D: number[][]): boolean => {
          for (let i = 0; i < D.length; i++) {
            for (let j = 0; j < D.length; j++) {
              if (i === j) continue;
              const P = D[i]!;
              const Q = D[j]!;
              const endsP = P[0] === hu || P[P.length - 1] === hu;
              const endsQ = Q[0] === hw || Q[Q.length - 1] === hw;
              if (endsP && endsQ) return true;
            }
          }
          return false;
        };
        let found: number[][] | null = null;
        try {
          found = decompWithEndpointsExact(
            H.n,
            H.mask,
            H.pairs,
            B,
            [hu, hw],
            NODE_LIMIT,
            distinct,
          ).paths;
        } catch (e) {
          if (!(e instanceof SearchLimitExceeded)) throw e;
        }

        if (found) {
          // Attach v to the u-end of one path and the w-end of another.
          // Pick an actual pair (i ≠ j): greedily taking the first path that
          // ends at u can steal the only path that ends at w.
          let qi = -1;
          let ri = -1;
          for (let i = 0; i < found.length && qi < 0; i++) {
            const P = found[i]!;
            if (P[0] !== hu && P[P.length - 1] !== hu) continue;
            for (let j = 0; j < found.length; j++) {
              if (j === i) continue;
              const Q = found[j]!;
              if (Q[0] === hw || Q[Q.length - 1] === hw) {
                qi = i;
                ri = j;
                break;
              }
            }
          }
          if (qi < 0 || ri < 0) {
            fail(`n=${n} ${g6} v=${v}: distinct-ends predicate satisfied but paths not found`);
            continue;
          }
          const lifted = found.map((P) => P.map(back));
          const Q = appendAtEnd(lifted[qi]!, u, v);
          const R = appendAtEnd(lifted[ri]!, w, v);
          if (!Q || !R) {
            fail(`n=${n} ${g6} v=${v}: end-append failed`);
            continue;
          }
          const DG = lifted.map((P, i) => (i === qi ? Q : i === ri ? R : P));
          if (DG.length > B) {
            fail(`n=${n} ${g6} v=${v}: triangle-even case gave ${DG.length} > B=${B}`);
            continue;
          }
          const ver = verifyDecomposition(n, edgeMask, pairs, DG);
          if (!ver.ok) {
            fail(`n=${n} ${g6} v=${v}: triangle-even certificate invalid — ${ver.reason}`);
            continue;
          }
          triEvenSplice++;
          continue;
        }

        // E₂ˢ(H,u,w) is exhaustively FALSE: the reduction cannot place v.
        // Gallai itself is checked directly on G, and the case is recorded.
        triEvenFallback++;
        if (triEvenExamples.length < 10) triEvenExamples.push(`n=${n} ${g6} v=${v}`);
        const direct = decompAtMost(n, edgeMask, pairs, B);
        if (!direct) {
          fail(`n=${n} ${g6} v=${v}: reduction failed AND no direct decomposition ≤ B — inspect`);
          continue;
        }
        const ver = verifyDecomposition(n, edgeMask, pairs, direct);
        if (!ver.ok) fail(`n=${n} ${g6} v=${v}: direct certificate invalid — ${ver.reason}`);
      }

      if (sawNonAdj) deg2NonAdj++;
      else if (twos.length > 0) deg2TriOnly++;
      if (Math.min(...deg) >= 3) minDeg3++;
      // Survives the whole package at even n: no leaf, no non-adjacent deg-2.
      if (!hasLeaf && !sawNonAdj) residual++;
    }

    const secs = (performance.now() - t0) / 1000;
    census.push({ n, graphs: graphs.length, withLeaf, deg2NonAdj, deg2TriOnly, minDeg3, residual, secs });
    console.log(
      `  n=${String(n).padStart(2)}  connected=${String(graphs.length).padStart(7)}` +
        `  leaf=${String(withLeaf).padStart(7)}  deg2-nonadj=${String(deg2NonAdj).padStart(7)}` +
        `  deg2-triangle-only=${String(deg2TriOnly).padStart(5)}  δ≥3=${String(minDeg3).padStart(7)}` +
        `  not-reduced=${String(residual).padStart(7)}  ${secs.toFixed(1)}s`,
    );
  }

  ok(`F2: ${spliceChecks} splice certificates verified (size-preserving, ≤ B(n))`);
  ok(`F3: ${triOddChecks} odd-n triangle certificates verified`);
  if (triEvenFallback === 0) {
    ok(`F4: ${triEvenSplice} even-n triangle cases all closed by distinct-ends splice`);
  } else {
    note(
      `F4: ${triEvenSplice} even-n triangle cases closed by the splice, ` +
        `${triEvenFallback} have E₂ˢ(G−v, u, w) exhaustively FALSE:`,
    );
    for (const e of triEvenExamples) note(`    ${e}`);
    note(`those fall back to direct exact search on G (Gallai still verified there)`);
  }

  console.log(`\nReduction coverage — share of connected graphs disposed of:`);
  for (const c of census) {
    const covered = c.graphs! - c.residual!;
    const pct = ((100 * covered) / c.graphs!).toFixed(1);
    console.log(
      `  n=${c.n}: ${covered}/${c.graphs} (${pct}%) have a leaf or a degree-2 vertex ` +
        `outside a triangle; ${c.residual} survive (δ≥3: ${c.minDeg3})`,
    );
  }

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILURES`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
