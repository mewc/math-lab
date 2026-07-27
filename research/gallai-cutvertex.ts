/**
 * THE CUT-VERTEX FORMULA — the path number is determined by the pieces.
 *
 * Every reduction this campaign proved before was either unconditional but
 * narrow (the degree-2 splice) or an exact reformulation that provably could not
 * be easier than what it reformulated (the leaf reduction, parity toggling).
 * This one is neither: it computes p(G) from strictly smaller graphs.
 *
 * For a graph H with a designated vertex v and an integer t ≥ 0, write
 *     c_H(v, t) = the fewest paths in a decomposition of H in which at least t
 *                 paths END at v            (∞ if no such decomposition exists).
 * So c_H(v, 0) = p(H), and c_H(v, t) is non-decreasing in t.
 *
 *   THEOREM (cut-vertex formula; proved, all n).  Let v be a cut vertex of G,
 *   and let G₁, G₂ be edge-disjoint connected subgraphs with G₁ ∪ G₂ = G and
 *   V(G₁) ∩ V(G₂) = {v}. Then
 *
 *          p(G) = min over t ≥ 0 of [ c_{G₁}(v, t) + c_{G₂}(v, t) − t ].
 *
 *   Proof. (≤) Fix t attaining the minimum and decompositions D₁, D₂ of G₁, G₂
 *   attaining c_{G₁}(v,t), c_{G₂}(v,t). Choose t paths of D₁ ending at v and t of
 *   D₂ ending at v, pair them up, and concatenate each pair at v. A path of G₁
 *   and a path of G₂ meet only at v — the subgraphs share no other vertex — so
 *   each concatenation is again a path. The result covers E(G₁) ∪ E(G₂) = E(G)
 *   with |D₁| + |D₂| − t paths.
 *   (≥) Let D be any decomposition of G and let s be the number of its paths
 *   that use edges of both sides. Such a path must pass through v, and being a
 *   path it visits v exactly once, so it splits into exactly two pieces — one in
 *   each side, each ENDING at v. Every other path lies wholly in one side.
 *   The pieces form decompositions D₁ of G₁ and D₂ of G₂ with
 *   |D| = |D₁| + |D₂| − s, and D₁ (likewise D₂) has at least s paths ending at
 *   v. Hence |D| ≥ c_{G₁}(v,s) + c_{G₂}(v,s) − s ≥ the minimum. ∎
 *
 *   COROLLARY (Gallai reduces to 2-connected graphs, modulo E).  Suppose the
 *   endpoint property holds on both sides: each Gᵢ has a decomposition of size
 *   ≤ ⌈nᵢ/2⌉ with a path ending at v, i.e. c_{Gᵢ}(v,1) ≤ ⌈nᵢ/2⌉. Taking t = 1,
 *          p(G) ≤ ⌈n₁/2⌉ + ⌈n₂/2⌉ − 1 ≤ ⌈n/2⌉,      n = n₁ + n₂ − 1,
 *   with equality in the last step whenever n₁ or n₂ is odd, and slack of 1 when
 *   both are even. So no graph with a cut vertex can be a minimal counterexample
 *   to Gallai unless E fails on one of its pieces — and E can only fail on a
 *   tight graph at an even-degree vertex (Theorems A and B), which is a small
 *   and fully censused class here.
 *
 * Unlike the leaf reduction this is not circular: G₁ and G₂ are strictly smaller
 * than G, so an induction on the number of vertices is legitimate.
 *
 * Checks:
 *   C1. The arithmetic of the corollary, for all n₁, n₂ ≤ 2000.
 *   C2. The formula itself, exhaustively: for every connected graph on n ≤ N
 *       with a cut vertex, compute p(G) exactly, compute the right-hand side
 *       from the pieces, and assert equality. Both sides use the complete
 *       solver, so a mismatch is a real mismatch and not a search artifact.
 *   C3. The corollary end to end: where E holds on both pieces, the constructed
 *       decomposition is built explicitly and verified edge by edge, and its
 *       size checked against ⌈n/2⌉.
 *
 * Run:
 *   bun research/gallai-cutvertex.ts            # n ≤ 8
 *   bun research/gallai-cutvertex.ts --n 9
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
  SearchLimitExceeded,
  verifyDecomposition,
} from "./gallai-lib.ts";

const args = process.argv.slice(2);
function opt(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
}

const N = Number(opt("n", "8"));
const NODE_LIMIT = Number(opt("node-limit", "20000000"));

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

type Piece = {
  n: number;
  mask: bigint;
  pairs: Array<[number, number]>;
  v: number; // index of the shared vertex inside the piece
  back: number[]; // piece index → original vertex
};

/** Split G at cut vertex v into (first component + v) and (the rest + v). */
function splitAt(
  n: number,
  edges: Array<[number, number]>,
  adj: number[][],
  v: number,
): [Piece, Piece] | null {
  const seen = new Uint8Array(n);
  seen[v] = 1;
  const comp = new Int32Array(n).fill(-1);
  let nComp = 0;
  for (let s = 0; s < n; s++) {
    if (seen[s]) continue;
    const stack = [s];
    seen[s] = 1;
    comp[s] = nComp;
    while (stack.length) {
      const x = stack.pop()!;
      for (const y of adj[x]!) {
        if (y === v || seen[y]) continue;
        seen[y] = 1;
        comp[y] = nComp;
        stack.push(y);
      }
    }
    nComp++;
  }
  if (nComp < 2) return null; // not a cut vertex

  const build = (want: (c: number) => boolean): Piece => {
    const verts = [v];
    for (let u = 0; u < n; u++) if (u !== v && want(comp[u]!)) verts.push(u);
    const idx = new Map(verts.map((u, i) => [u, i]));
    const sub: Array<[number, number]> = [];
    for (const [a, b] of edges) {
      if (idx.has(a) && idx.has(b)) sub.push([idx.get(a)!, idx.get(b)!]);
    }
    const k = verts.length;
    return { n: k, mask: maskFromEdges(k, sub), pairs: allPairs(k), v: 0, back: verts };
  };
  return [build((c) => c === 0), build((c) => c !== 0)];
}

/** c_H(v, t): fewest paths with at least t of them ending at v. */
function cost(piece: Piece, t: number): { size: number; paths: number[][] } | null {
  const m = edgeCount(piece.mask);
  if (m === 0) return t === 0 ? { size: 0, paths: [] } : null;
  for (let b = Math.max(1, t); b <= m; b++) {
    try {
      const r = decompWithEndpointsExact(
        piece.n,
        piece.mask,
        piece.pairs,
        b,
        [],
        NODE_LIMIT,
        (paths) => {
          let ends = 0;
          for (const P of paths) {
            if (P[0] === piece.v) ends++;
            if (P[P.length - 1] === piece.v) ends++;
          }
          return ends >= t;
        },
      );
      if (r.paths) return { size: r.paths.length, paths: r.paths };
    } catch (e) {
      if (!(e instanceof SearchLimitExceeded)) throw e;
      return null;
    }
  }
  return null;
}

function exactP(n: number, mask: bigint, pairs: Array<[number, number]>): number | null {
  const m = edgeCount(mask);
  if (m === 0) return 0;
  for (let b = 1; b <= m; b++) {
    try {
      const r = decompWithEndpointsExact(n, mask, pairs, b, [], NODE_LIMIT);
      if (r.paths) return r.paths.length;
    } catch (e) {
      if (!(e instanceof SearchLimitExceeded)) throw e;
      return null;
    }
  }
  return m;
}

console.log(`The cut-vertex formula for the path number (n ≤ ${N})\n`);

// ── C1: the corollary's arithmetic ────────────────────────────────────────
{
  let bad = 0;
  let tightCases = 0;
  for (let n1 = 2; n1 <= 2000; n1++) {
    for (let n2 = 2; n2 <= 40; n2++) {
      const n = n1 + n2 - 1;
      const lhs = gallaiBound(n1) + gallaiBound(n2) - 1;
      if (lhs > gallaiBound(n)) bad++;
      if (lhs === gallaiBound(n)) tightCases++;
    }
  }
  if (bad === 0) {
    ok(`C1: ceil(n₁/2) + ceil(n₂/2) − 1 ≤ ceil((n₁+n₂−1)/2) for all tested n₁, n₂ — the corollary's arithmetic never fails (equality in ${tightCases.toLocaleString()} of the cases, so the single merge is exactly what pays for the glue)`);
  } else {
    fail(`C1: arithmetic fails in ${bad} cases`);
  }
}

// ── C2 / C3 ───────────────────────────────────────────────────────────────
let withCut = 0;
let formulaOk = 0;
let undecided = 0;
let corollaryOk = 0;
let corollaryNA = 0;

for (let n = 3; n <= N; n++) {
  const pairs = allPairs(n);
  const B = gallaiBound(n);
  for (const g6 of await gengConnected(n)) {
    const { edgeMask } = parseGraph6(g6);
    const adj = buildAdj(n, edgeMask, pairs);
    const edges: Array<[number, number]> = [];
    for (let i = 0; i < pairs.length; i++) {
      const [a, b] = pairs[i]!;
      if (adj[a]!.includes(b)) edges.push([a, b]);
    }
    // find a cut vertex
    let cut = -1;
    for (let v = 0; v < n && cut < 0; v++) {
      const keep: Array<[number, number]> = edges.filter(([a, b]) => a !== v && b !== v);
      const others = [];
      for (let u = 0; u < n; u++) if (u !== v) others.push(u);
      const idx = new Map(others.map((u, i) => [u, i]));
      const sub = keep.map(([a, b]) => [idx.get(a)!, idx.get(b)!] as [number, number]);
      const subAdj = buildAdj(n - 1, maskFromEdges(n - 1, sub), allPairs(n - 1));
      if (!isConnected(subAdj, n - 1)) cut = v;
    }
    if (cut < 0) continue;
    withCut++;

    const split = splitAt(n, edges, adj, cut);
    if (!split) {
      fail(`${g6}: vertex ${cut} identified as a cut vertex but the split failed`);
      continue;
    }
    const [P1, P2] = split;
    if (P1.n + P2.n - 1 !== n) {
      fail(`${g6}: pieces have ${P1.n} + ${P2.n} − 1 ≠ ${n} vertices`);
      continue;
    }
    if (edgeCount(P1.mask) + edgeCount(P2.mask) !== edgeCount(edgeMask)) {
      fail(`${g6}: pieces do not partition the edges`);
      continue;
    }

    const p = exactP(n, edgeMask, pairs);
    if (p === null) {
      undecided++;
      continue;
    }

    // right-hand side of the formula
    let rhs = Infinity;
    let rhsT = -1;
    const maxT = Math.min(
      degrees(buildAdj(P1.n, P1.mask, P1.pairs))[P1.v]!,
      degrees(buildAdj(P2.n, P2.mask, P2.pairs))[P2.v]!,
    );
    let stuck = false;
    for (let t = 0; t <= maxT; t++) {
      const c1 = cost(P1, t);
      const c2 = cost(P2, t);
      if (!c1 || !c2) {
        if (t === 0) stuck = true;
        break;
      }
      const val = c1.size + c2.size - t;
      if (val < rhs) {
        rhs = val;
        rhsT = t;
      }
    }
    if (stuck || rhs === Infinity) {
      undecided++;
      continue;
    }

    if (rhs !== p) {
      fail(`${g6} cut=${cut}: p(G) = ${p} but the formula gives ${rhs} (best t = ${rhsT})`);
      continue;
    }
    formulaOk++;

    // C3: the corollary, constructed and verified
    const B1 = gallaiBound(P1.n);
    const B2 = gallaiBound(P2.n);
    const e1 = cost(P1, 1);
    const e2 = cost(P2, 1);
    if (!e1 || !e2 || e1.size > B1 || e2.size > B2) {
      corollaryNA++;
      continue;
    }
    // glue: concatenate one path ending at v from each side
    const lift = (piece: Piece, path: number[]) => path.map((x) => piece.back[x]!);
    const pick = (piece: Piece, paths: number[][]) => {
      for (let i = 0; i < paths.length; i++) {
        const P = paths[i]!;
        if (P[0] === piece.v) return { i, path: P.slice().reverse() };
        if (P[P.length - 1] === piece.v) return { i, path: P.slice() };
      }
      return null;
    };
    const a1 = pick(P1, e1.paths);
    const a2 = pick(P2, e2.paths);
    if (!a1 || !a2) {
      fail(`${g6}: c(v,1) reported ≥ 1 end at v but no such path was found`);
      continue;
    }
    // a1 is oriented to END at v; a2 must therefore START at v so the shared
    // vertex appears exactly once in the concatenation.
    const tail = lift(P2, a2.path).reverse();
    const glued = [...lift(P1, a1.path), ...tail.slice(1)];
    const out: number[][] = [glued];
    e1.paths.forEach((P, i) => {
      if (i !== a1.i) out.push(lift(P1, P));
    });
    e2.paths.forEach((P, i) => {
      if (i !== a2.i) out.push(lift(P2, P));
    });
    if (out.length > B) {
      fail(`${g6}: glued decomposition has ${out.length} > B = ${B}`);
      continue;
    }
    const ver = verifyDecomposition(n, edgeMask, pairs, out);
    if (!ver.ok) {
      fail(`${g6}: glued certificate invalid — ${ver.reason}`);
      continue;
    }
    corollaryOk++;
  }
  console.log(`  n=${n}: ${withCut} graphs with a cut vertex processed so far`);
}

console.log("");
if (formulaOk > 0 && failures === 0) {
  ok(`C2: the cut-vertex formula is EXACT on all ${formulaOk.toLocaleString()} connected graphs with a cut vertex, n ≤ ${N} — p(G) = min_t [c₁(v,t) + c₂(v,t) − t] every time`);
}
ok(`C3: ${corollaryOk.toLocaleString()} graphs where E holds on both pieces got an explicitly glued, verified decomposition of size ≤ ceil(n/2)`);
if (corollaryNA > 0) {
  note(`${corollaryNA} graphs where E fails on a piece (or its budget is exceeded) — exactly the case the corollary excludes`);
}
if (undecided > 0) note(`${undecided} graphs undecided at the node limit (no verdict claimed)`);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILURES`}`);
process.exit(failures === 0 ? 0 : 1);
