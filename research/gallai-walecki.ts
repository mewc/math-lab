/**
 * Walecki rainbow constructions for near-complete graphs of ODD order.
 *
 * Brute force stalls exactly where the odd-order tightness question is decided:
 * on G = K_n minus a few edges. Theory beats search there.
 *
 * WALECKI (classical). For odd n = 2k+1, K_n decomposes into k Hamiltonian
 * cycles. Explicitly, on vertices Z_{2k} ∪ {∞}: for j = 0..k−1 take the zigzag
 *     C_j = ∞, j, j+1, j−1, j+2, j−2, …, j+(k−1), j−(k−1), j+k, ∞   (mod 2k)
 * The k cycles are edge-disjoint and cover K_n. Verified here, not assumed (W1).
 *
 * RAINBOW LEMMA. Let F ⊆ E(K_n) with |F| = c ≤ k and suppose some Hamiltonian
 * cycle decomposition C_1..C_k of K_n has every edge of F in a DIFFERENT cycle
 * ("F is rainbow"). Then, with G = K_n − F:
 *   · c = k:  deleting F cuts each cycle exactly once, so G is the disjoint
 *     union of k Hamiltonian PATHS — hence p(G) ≤ k = B(n) − 1, and G is NOT
 *     tight. At n = 11 this settles m = 50, where 5 paths hold at most 5·10 = 50
 *     edges and a decomposition must therefore be 5 Hamiltonian paths exactly.
 *   · c < k:  the c hit cycles give c Hamiltonian paths; each of the k−c unhit
 *     cycles is cut at one chosen edge, giving a Hamiltonian path plus a
 *     leftover edge. If the k−c chosen edges form a single path, the total is
 *     c + (k−c) + 1 = k+1 = B(n) paths. Choosing one cut edge INCIDENT TO a
 *     makes that Hamiltonian path end at a — so this also certifies the
 *     endpoint property E(G, a).
 * Both directions produce explicit decompositions, verified edge-by-edge.
 *
 * The rainbow labelling is found by searching permutations of the vertex set
 * (any relabelling of a Walecki decomposition is again one), seeded xorshift so
 * runs reproduce. A failure to find one is reported as a failure to find, never
 * as a proof of non-existence.
 *
 * Checks:
 *   W1. Walecki decomposition built and verified for odd n ≤ 15: k Hamiltonian
 *       cycles, pairwise edge-disjoint, union exactly K_n.
 *   W2. Every connected graph on 11 vertices with m = 50 (26 of them, complement
 *       = 5 edges): find a rainbow labelling, emit 5 Hamiltonian paths, verify.
 *       Certifies p = 5 = B(11) − 1, so NONE of them is tight — including
 *       `J]zn^~~~~~_`, which the general exhaustive search left undecided at a
 *       60M-node limit.
 *   W3. Every tight graph on 11 vertices (m ≥ 51, the 20 predicted by the
 *       odd-order density characterization) and EVERY vertex a: emit a size-6
 *       decomposition with a as a path end, verifying both p = 6 (tight) and
 *       E(G, a) — the endpoint property on the whole odd-order tight class at
 *       n = 11, which is what Theorem D consumes at n = 12.
 *
 * Exit 0 only if every graph in W2 and every (graph, vertex) in W3 is certified.
 *
 * Run:
 *   bun research/gallai-walecki.ts
 *   bun research/gallai-walecki.ts --n 11 --tries 400000
 */

import {
  allPairs,
  buildAdj,
  edgeCount,
  gallaiBound,
  hasEdge,
  maskFromEdges,
  pairIndex,
  parseGraph6,
  pathLowerBound,
  degrees,
  verifyDecomposition,
  type EdgeMask,
} from "./gallai-lib.ts";

const args = process.argv.slice(2);
function opt(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
}

const N = Number(opt("n", "11"));
const TRIES = Number(opt("tries", "200000"));
const SEED = Number(opt("seed", "0x9e3779b9"));

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
if (!geng) throw new Error("geng not on PATH (brew install nauty)");

async function gengBand(n: number, lo: number, hi: number): Promise<string[]> {
  const proc = Bun.spawn([geng!, "-c", "-q", String(n), `${lo}:${hi}`], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

// ── Walecki ───────────────────────────────────────────────────────────────

/** k = (n−1)/2 Hamiltonian cycles of K_n, n odd. Each as a vertex cycle list. */
function waleckiCycles(n: number): number[][] {
  if (n % 2 === 0) throw new Error(`Walecki here needs odd n, got ${n}`);
  const k = (n - 1) / 2;
  const ring = 2 * k; // Z_{2k}
  const INF = ring;
  const cycles: number[][] = [];
  for (let j = 0; j < k; j++) {
    const seq: number[] = [j % ring];
    for (let t = 1; t <= k; t++) {
      seq.push((j + t) % ring);
      if (t < k) seq.push(((j - t) % ring + ring) % ring);
    }
    cycles.push([INF, ...seq]);
  }
  return cycles;
}

/** Edges of a cycle given as a vertex list (closing back to the first). */
function cycleEdges(cyc: number[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < cyc.length; i++) {
    out.push([cyc[i]!, cyc[(i + 1) % cyc.length]!]);
  }
  return out;
}

function verifyWalecki(n: number): boolean {
  const k = (n - 1) / 2;
  const cycles = waleckiCycles(n);
  if (cycles.length !== k) {
    fail(`Walecki n=${n}: ${cycles.length} cycles, expected ${k}`);
    return false;
  }
  const seen = new Set<number>();
  for (const cyc of cycles) {
    if (cyc.length !== n || new Set(cyc).size !== n) {
      fail(`Walecki n=${n}: cycle is not Hamiltonian (${cyc.length} vertices)`);
      return false;
    }
    for (const [u, v] of cycleEdges(cyc)) {
      const id = pairIndex(u, v, n);
      if (seen.has(id)) {
        fail(`Walecki n=${n}: edge ${u}-${v} repeated across cycles`);
        return false;
      }
      seen.add(id);
    }
  }
  const expect = (n * (n - 1)) / 2;
  if (seen.size !== expect) {
    fail(`Walecki n=${n}: covered ${seen.size} edges, expected ${expect}`);
    return false;
  }
  return true;
}

// ── rainbow search ────────────────────────────────────────────────────────

let rngState = SEED >>> 0;
function rnd(): number {
  rngState ^= rngState << 13;
  rngState >>>= 0;
  rngState ^= rngState >>> 17;
  rngState ^= rngState << 5;
  rngState >>>= 0;
  return rngState;
}
function shuffled(n: number): number[] {
  const p = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = rnd() % (i + 1);
    const t = p[i]!;
    p[i] = p[j]!;
    p[j] = t;
  }
  return p;
}

const BASE = waleckiCycles(N);

/** Cycle index per edge id, under the relabelling perm. */
function cycleOfEdge(perm: number[]): Int32Array {
  const map = new Int32Array((N * (N - 1)) / 2).fill(-1);
  for (let ci = 0; ci < BASE.length; ci++) {
    for (const [u, v] of cycleEdges(BASE[ci]!)) {
      map[pairIndex(perm[u]!, perm[v]!, N)] = ci;
    }
  }
  return map;
}

/** Relabelled cycles as vertex lists. */
function permutedCycles(perm: number[]): number[][] {
  return BASE.map((cyc) => cyc.map((x) => perm[x]!));
}

/** Do the chosen edges form a single path? */
function edgesFormPath(edges: Array<[number, number]>): boolean {
  if (edges.length === 0) return true;
  const deg = new Map<number, number>();
  for (const [u, v] of edges) {
    deg.set(u, (deg.get(u) ?? 0) + 1);
    deg.set(v, (deg.get(v) ?? 0) + 1);
  }
  let ends = 0;
  for (const d of deg.values()) {
    if (d > 2) return false;
    if (d === 1) ends++;
  }
  if (ends !== 2) return false; // a cycle has no degree-1 vertex
  // connected?
  const adj = new Map<number, number[]>();
  for (const [u, v] of edges) {
    (adj.get(u) ?? adj.set(u, []).get(u)!).push(v);
    (adj.get(v) ?? adj.set(v, []).get(v)!).push(u);
  }
  const start = edges[0]![0];
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const x = stack.pop()!;
    for (const y of adj.get(x) ?? []) {
      if (!seen.has(y)) {
        seen.add(y);
        stack.push(y);
      }
    }
  }
  return seen.size === deg.size;
}

/** Order a set of edges known to form a path into a vertex sequence. */
function pathFromEdges(edges: Array<[number, number]>): number[] {
  const adj = new Map<number, number[]>();
  for (const [u, v] of edges) {
    if (!adj.has(u)) adj.set(u, []);
    if (!adj.has(v)) adj.set(v, []);
    adj.get(u)!.push(v);
    adj.get(v)!.push(u);
  }
  let start = -1;
  for (const [x, ys] of adj) if (ys.length === 1) start = x;
  const seq = [start];
  const used = new Set<string>();
  let cur = start;
  for (;;) {
    let next = -1;
    for (const y of adj.get(cur)!) {
      const key = cur < y ? `${cur}-${y}` : `${y}-${cur}`;
      if (!used.has(key)) {
        next = y;
        used.add(key);
        break;
      }
    }
    if (next < 0) break;
    seq.push(next);
    cur = next;
  }
  return seq;
}

/** Cut a cycle at edge (x,y) → the Hamiltonian path with ends x and y. */
function cutCycle(cyc: number[], x: number, y: number): number[] | null {
  const L = cyc.length;
  for (let i = 0; i < L; i++) {
    const u = cyc[i]!;
    const v = cyc[(i + 1) % L]!;
    if ((u === x && v === y) || (u === y && v === x)) {
      const out: number[] = [];
      for (let t = 1; t <= L; t++) out.push(cyc[(i + t) % L]!);
      return out; // starts at v, ends at u
    }
  }
  return null;
}

type Cert = { paths: number[][]; tries: number };

/**
 * Rainbow decomposition of G = K_N − F.
 * requireEnd < 0: pure rainbow (needs |F| = k) → k Hamiltonian paths.
 * requireEnd ≥ 0: |F| < k → k+1 paths, one ending at `requireEnd`.
 */
function rainbowDecomp(
  F: Array<[number, number]>,
  requireEnd: number,
): Cert | null {
  const k = (N - 1) / 2;
  const c = F.length;
  const fIds = F.map(([u, v]) => pairIndex(u, v, N));

  for (let attempt = 0; attempt < TRIES; attempt++) {
    const perm = attempt === 0 ? Array.from({ length: N }, (_, i) => i) : shuffled(N);
    const map = cycleOfEdge(perm);
    const hit = new Set<number>();
    let rainbow = true;
    for (const id of fIds) {
      const ci = map[id]!;
      if (ci < 0 || hit.has(ci)) {
        rainbow = false;
        break;
      }
      hit.add(ci);
    }
    if (!rainbow) continue;

    const cycles = permutedCycles(perm);
    const paths: number[][] = [];
    for (let ci = 0; ci < k; ci++) {
      if (!hit.has(ci)) continue;
      const fi = fIds.findIndex((id) => map[id] === ci);
      const [x, y] = F[fi]!;
      const P = cutCycle(cycles[ci]!, x, y);
      if (!P) {
        rainbow = false;
        break;
      }
      paths.push(P);
    }
    if (!rainbow) continue;
    if (c === k) return { paths, tries: attempt + 1 };

    // Unhit cycles: choose one cut edge each, forming a single path, with at
    // least one incident to `requireEnd`.
    const unhit: number[] = [];
    for (let ci = 0; ci < k; ci++) if (!hit.has(ci)) unhit.push(ci);
    const choice: Array<[number, number]> = [];

    const pick = (idx: number): number[][] | null => {
      if (idx === unhit.length) {
        if (!edgesFormPath(choice)) return null;
        if (requireEnd >= 0 && !choice.some(([a, b]) => a === requireEnd || b === requireEnd)) {
          return null;
        }
        const out = paths.slice();
        for (let t = 0; t < unhit.length; t++) {
          const P = cutCycle(cycles[unhit[t]!]!, choice[t]![0], choice[t]![1]);
          if (!P) return null;
          out.push(P);
        }
        out.push(pathFromEdges(choice));
        return out;
      }
      const cyc = cycles[unhit[idx]!]!;
      for (const [x, y] of cycleEdges(cyc)) {
        choice.push([x, y]);
        const got = pick(idx + 1);
        if (got) return got;
        choice.pop();
      }
      return null;
    };

    const built = pick(0);
    if (built) return { paths: built, tries: attempt + 1 };
  }
  return null;
}

/**
 * CONTIGUOUS RAINBOW (generalises the rainbow lemma to |F| > k).
 *
 * Removing a cyclically CONTIGUOUS run of s edges from a Hamiltonian cycle
 * leaves the complementary arc — still a single path. So if a labelling makes
 * the F-edges of EVERY Walecki cycle a contiguous run (and no cycle is missed),
 * then G = K_N − F decomposes into exactly k paths, giving p(G) ≤ k = B(N) − 1
 * and hence G is not tight. Plain rainbow is the case s = 1 everywhere.
 *
 * Every cycle must be hit: an unhit cycle would have to be cut, and its leftover
 * edge would need a (k+1)-st path.
 */
function contiguousRainbowDecomp(F: Array<[number, number]>): Cert | null {
  const k = (N - 1) / 2;
  const fIds = F.map(([u, v]) => pairIndex(u, v, N));

  for (let attempt = 0; attempt < TRIES; attempt++) {
    const perm = attempt === 0 ? Array.from({ length: N }, (_, i) => i) : shuffled(N);
    const cycles = permutedCycles(perm);

    // positions of F-edges along each cycle
    const posPerCycle: number[][] = [];
    let feasible = true;
    for (let ci = 0; ci < k && feasible; ci++) {
      const cyc = cycles[ci]!;
      const pos: number[] = [];
      for (let i = 0; i < cyc.length; i++) {
        const id = pairIndex(cyc[i]!, cyc[(i + 1) % cyc.length]!, N);
        if (fIds.includes(id)) pos.push(i);
      }
      if (pos.length === 0 || pos.length >= cyc.length) feasible = false;
      posPerCycle.push(pos);
    }
    if (!feasible) continue;
    if (posPerCycle.reduce((a, p) => a + p.length, 0) !== fIds.length) continue;

    // each run cyclically contiguous?
    const starts: number[] = [];
    for (let ci = 0; ci < k && feasible; ci++) {
      const pos = posPerCycle[ci]!;
      const L = cycles[ci]!.length;
      const set = new Set(pos);
      let start = -1;
      for (const p of pos) {
        let all = true;
        for (let t = 0; t < pos.length; t++) {
          if (!set.has((p + t) % L)) {
            all = false;
            break;
          }
        }
        if (all) {
          start = p;
          break;
        }
      }
      if (start < 0) feasible = false;
      starts.push(start);
    }
    if (!feasible) continue;

    const paths: number[][] = [];
    for (let ci = 0; ci < k; ci++) {
      const cyc = cycles[ci]!;
      const L = cyc.length;
      const s = posPerCycle[ci]!.length;
      const p = starts[ci]!;
      const seq: number[] = [];
      for (let t = 0; t <= L - s; t++) seq.push(cyc[(p + s + t) % L]!);
      paths.push(seq);
    }
    return { paths, tries: attempt + 1 };
  }
  return null;
}

function complementEdges(mask: EdgeMask, pairs: Array<[number, number]>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < pairs.length; i++) if (!hasEdge(mask, i)) out.push(pairs[i]!);
  return out;
}

// ── main ──────────────────────────────────────────────────────────────────

console.log(`Walecki rainbow constructions, n = ${N}\n`);

// W1
{
  let good = 0;
  for (let n = 5; n <= 15; n += 2) if (verifyWalecki(n)) good++;
  if (good === 6) ok(`W1: Walecki decomposition verified for n = 5,7,9,11,13,15 (k Hamiltonian cycles, edge-disjoint, exact cover)`);
}

const pairs = allPairs(N);
const B = gallaiBound(N);
const k = (N - 1) / 2;
const mFull = (N * (N - 1)) / 2;

// W2 — m = k·(N−1) is the exact-capacity band (m = 50 at N = 11)
{
  const mBand = k * (N - 1);
  const graphs = await gengBand(N, mBand, mBand);
  let certified = 0;
  let worstTries = 0;
  const misses: string[] = [];
  for (const g6 of graphs) {
    const { edgeMask } = parseGraph6(g6);
    const F = complementEdges(edgeMask, pairs);
    if (F.length !== k) {
      fail(`${g6}: complement has ${F.length} edges, expected ${k}`);
      continue;
    }
    const cert = rainbowDecomp(F, -1);
    if (!cert) {
      misses.push(g6);
      continue;
    }
    if (cert.paths.length !== k) {
      fail(`${g6}: got ${cert.paths.length} paths, expected ${k}`);
      continue;
    }
    for (const P of cert.paths) {
      if (P.length !== N) {
        fail(`${g6}: path is not Hamiltonian (${P.length} vertices)`);
      }
    }
    const v = verifyDecomposition(N, edgeMask, pairs, cert.paths);
    if (!v.ok) {
      fail(`${g6}: certificate invalid — ${v.reason}`);
      continue;
    }
    certified++;
    if (cert.tries > worstTries) worstTries = cert.tries;
  }
  if (misses.length === 0) {
    ok(
      `W2: all ${graphs.length} graphs at m = ${mBand} decompose into ${k} Hamiltonian paths ` +
        `(verified) — so p = ${k} = B(${N}) − 1 and NONE is tight (worst rainbow search ${worstTries} labellings)`,
    );
  } else {
    fail(`W2: no rainbow labelling found for ${misses.length} graphs: ${misses.slice(0, 5).join(" ")}`);
  }
}

// W3 — the tight band m ≥ k·(N−1) + 1: certify p = B and E(G,a) for every a
{
  const graphs = await gengBand(N, k * (N - 1) + 1, mFull);
  let tightCount = 0;
  let pairsCertified = 0;
  const misses: string[] = [];
  for (const g6 of graphs) {
    const { edgeMask } = parseGraph6(g6);
    const deg = degrees(buildAdj(N, edgeMask, pairs));
    const lb = pathLowerBound(deg, edgeCount(edgeMask), N);
    if (lb !== B) {
      fail(`${g6}: expected the density bound to force ${B}, got lb=${lb}`);
      continue;
    }
    tightCount++;
    const F = complementEdges(edgeMask, pairs);
    for (let a = 0; a < N; a++) {
      const cert = rainbowDecomp(F, a);
      if (!cert) {
        misses.push(`${g6}@${a}`);
        continue;
      }
      if (cert.paths.length !== B) {
        fail(`${g6}@${a}: got ${cert.paths.length} paths, expected B=${B}`);
        continue;
      }
      if (!cert.paths.some((P) => P[0] === a || P[P.length - 1] === a)) {
        fail(`${g6}@${a}: no path ends at ${a}`);
        continue;
      }
      const v = verifyDecomposition(N, edgeMask, pairs, cert.paths);
      if (!v.ok) {
        fail(`${g6}@${a}: certificate invalid — ${v.reason}`);
        continue;
      }
      pairsCertified++;
    }
  }
  if (misses.length === 0) {
    ok(
      `W3: all ${tightCount} tight graphs (m ≥ ${k * (N - 1) + 1}, lower bound = B = ${B}) carry a verified ` +
        `size-${B} decomposition — so p = ${B} exactly — and E(G,a) holds at ALL ${pairsCertified} ` +
        `(graph, vertex) pairs`,
    );
    note(
      `E is therefore certified on the entire odd-order tight class at n = ${N} ` +
        `(modulo the unproved characterization that these are the only tight graphs) — ` +
        `the input Theorem D needs for leafy graphs at n = ${N + 1}`,
    );
  } else {
    fail(`W3: no certificate for ${misses.length} (graph, vertex) pairs: ${misses.slice(0, 6).join(" ")}`);
  }
}

// W4 — the near-capacity bands below m = k(N−1), where |F| > k so plain
// rainbow cannot apply and the general exhaustive search bogs down.
{
  const top = k * (N - 1) - 1;
  const lo = Number(opt("w4-lo", String(top - 4)));
  let settled = 0;
  let total = 0;
  let worstTries = 0;
  const misses: string[] = [];
  for (let m = lo; m <= top; m++) {
    for (const g6 of await gengBand(N, m, m)) {
      total++;
      const { edgeMask } = parseGraph6(g6);
      const F = complementEdges(edgeMask, pairs);
      const cert = contiguousRainbowDecomp(F);
      if (!cert) {
        if (misses.length < 8) misses.push(`m=${m} ${g6} |F|=${F.length}`);
        continue;
      }
      if (cert.paths.length !== k) {
        fail(`m=${m} ${g6}: ${cert.paths.length} paths, expected ${k}`);
        continue;
      }
      const v = verifyDecomposition(N, edgeMask, pairs, cert.paths);
      if (!v.ok) {
        fail(`m=${m} ${g6}: certificate invalid — ${v.reason}`);
        continue;
      }
      settled++;
      if (cert.tries > worstTries) worstTries = cert.tries;
    }
  }
  ok(
    `W4: contiguous-rainbow certified p ≤ ${k} for ${settled}/${total} graphs in ` +
      `m = ${lo}..${top} (worst search ${worstTries} labellings) — each is NOT tight`,
  );
  if (misses.length) {
    note(`no contiguous-rainbow labelling found for ${total - settled} graphs, e.g. ${misses.join(" ")} (no verdict claimed for those here)`);
  }
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILURES`}`);
process.exit(failures === 0 ? 0 : 1);
