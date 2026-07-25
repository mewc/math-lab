/**
 * PARITY TOGGLING — attacking Gallai through Lovász's rigid all-odd class.
 *
 * Every earlier turn of this campaign inducted on n: peel a vertex, lean on the
 * verified smaller case, repeat. This attacks the conjecture along a different
 * axis — the PARITY of the degrees — using a classical theorem the campaign has
 * never actually used.
 *
 *   LOVÁSZ (1968). Every graph on n vertices decomposes into at most ⌊n/2⌋
 *   paths and cycles.
 *
 *   COROLLARY (all-odd rigidity). If every degree of H is odd (so n is even),
 *   then p(H) = n/2 exactly, and in EVERY decomposition of that size each vertex
 *   is the end of exactly one path.
 *     Proof. Lovász gives a decomposition into ≤ n/2 paths and cycles. A cycle
 *     meets each of its vertices in 2 edges, and a path meets each of its
 *     vertices in 2 edges unless the vertex is one of its ends; so every
 *     odd-degree vertex ends at least one path. Counting ends,
 *     2·#paths ≥ #odd = n, so #paths ≥ n/2. With #paths + #cycles ≤ n/2 this
 *     forces #paths = n/2 and #cycles = 0. Then Σ_v e_v = 2·(n/2) = n with every
 *     e_v ≥ 1, so e_v = 1 for all v. ∎
 *   The path-ends therefore form a perfect pairing of V(H) — an extremely rigid
 *   structure, and one no other line of this campaign exploits.
 *
 * THE TOGGLE. Take any G with z even-degree vertices (z ≡ n mod 2, so z is even
 * when n is even). Choose a perfect matching π on those even vertices and
 * TOGGLE each pair: delete the pair if it is an edge of G, add it if it is not.
 * Every even vertex changes parity, every odd vertex is untouched, so the result
 * H is all-odd and the corollary applies: p(H) = n/2, with rigidity. Converting
 * back to G costs nothing when
 *   · an ADDED pair uv (in H, not in G) is an END-EDGE of its path — deleting it
 *     merely shortens that path;
 *   · a DELETED pair uv (in G, not in H) can be RE-ATTACHED — extend the path
 *     ending at u by v (needs v ∉ that path), or symmetrically at v.
 * If every toggle is free, p(G) ≤ n/2 = B(n) and Gallai holds for G.
 *
 * So: **Gallai at even n is equivalent to "some pairing admits an optimal
 * all-odd decomposition whose toggles are all free."** No free lunch is claimed —
 * it is a reformulation — but it moves the whole question onto a rigid class
 * with a classical theorem behind it, and it makes a sharp, testable question:
 *
 *   Q. Does every graph admit SOME pairing π and SOME optimal decomposition of
 *      the toggled graph in which every toggle is free?
 *
 * A "no" would not disprove Gallai (which is verified to n = 11) — it would show
 * this proof strategy has a genuine obstruction, and expose what it looks like.
 * A "yes" over the whole tested range makes "some π always works" the target.
 *
 * Odd n gets a bonus: z is odd, so one even vertex is left unpaired, H has
 * exactly one even vertex, and the same counting gives at most (n−1)/2 parts,
 * all paths — one SPARE path below B(n) = (n+1)/2. So at odd n a single toggle
 * may fail and Gallai still follows. Even n is the hard case, and is what this
 * script tests.
 *
 * Checks:
 *   P1. All-odd rigidity, decided not assumed: for every all-odd graph on
 *       n ≤ RIG_N, certify p = n/2 (a verified decomposition, plus an EXHAUSTIVE
 *       refutation at n/2 − 1), then search exhaustively for a size-n/2
 *       decomposition violating "every vertex ends exactly one path". A null
 *       result there is a proof of rigidity for that graph.
 *   P2. The toggle experiment, even n ≤ TOG_N: every connected G, every pairing
 *       π of its even vertices, exhaustive search for a free-toggle
 *       decomposition, and the converted decomposition of G verified
 *       edge-by-edge. Reports how many graphs are covered, how many pairings
 *       work per graph, and every graph where NO pairing works.
 *   P3. Coverage vs. Pyber's classical class (even-degree vertices induce a
 *       forest) — is the toggle route reaching graphs Pyber's theorem does not?
 *
 * Exit 0 if P1 passes and every certificate produced verifies. P2's answer is
 * data: failures are reported, never suppressed.
 *
 * Run:
 *   bun research/gallai-parity.ts
 *   bun research/gallai-parity.ts --tog-n 8 --rig-n 8
 */

import {
  allPairs,
  buildAdj,
  decompWithEndpointsExact,
  degrees,
  edgeCount,
  gallaiBound,
  hasEdge,
  maskFromEdges,
  pairIndex,
  parseGraph6,
  SearchLimitExceeded,
  verifyDecomposition,
  type EdgeMask,
} from "./gallai-lib.ts";

const args = process.argv.slice(2);
function opt(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
}

const RIG_N = Number(opt("rig-n", "8"));
const TOG_N = Number(opt("tog-n", "8"));
const NODE_LIMIT = Number(opt("node-limit", "20000000"));
/** Systematic geng slice for sampling large n, e.g. "0/512". */
const SLICE = opt("slice", "");

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

async function gengConnected(n: number, slice = ""): Promise<string[]> {
  if (n === 1) return ["@"];
  const gengArgs = ["-c", "-q", String(n)];
  if (slice) gengArgs.push(slice);
  const proc = Bun.spawn([geng!, ...gengArgs], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

/** Ends of each path, counted per vertex. */
function endCounts(n: number, paths: number[][]): Int32Array {
  const e = new Int32Array(n);
  for (const P of paths) {
    e[P[0]!]!++;
    e[P[P.length - 1]!]!++;
  }
  return e;
}

// ── P1: all-odd rigidity ──────────────────────────────────────────────────

async function checkRigidity(): Promise<void> {
  console.log(`P1. Lovász all-odd rigidity, decided exhaustively (n ≤ ${RIG_N})`);
  let graphs = 0;
  let rigid = 0;
  let certRigid = 0;
  let undecided = 0;
  for (let n = 2; n <= RIG_N; n += 2) {
    const pairs = allPairs(n);
    for (const g6 of await gengConnected(n)) {
      const { edgeMask } = parseGraph6(g6);
      const deg = degrees(buildAdj(n, edgeMask, pairs));
      if (deg.some((d) => d % 2 === 0)) continue; // all-odd only
      graphs++;
      const target = n / 2;

      const at = decompWithEndpointsExact(n, edgeMask, pairs, target, [], NODE_LIMIT);
      if (!at.paths) {
        fail(`n=${n} ${g6}: no decomposition of size ${target} — contradicts Lovász`);
        continue;
      }
      const v = verifyDecomposition(n, edgeMask, pairs, at.paths);
      if (!v.ok) {
        fail(`n=${n} ${g6}: bad certificate — ${v.reason}`);
        continue;
      }
      try {
        const below = decompWithEndpointsExact(n, edgeMask, pairs, target - 1, [], NODE_LIMIT);
        if (below.paths) {
          fail(`n=${n} ${g6}: decomposed into ${below.paths.length} < ${target} paths, but all degrees are odd`);
          continue;
        }
      } catch (e) {
        if (!(e instanceof SearchLimitExceeded)) throw e;
        undecided++;
        continue;
      }

      // The certificate itself must satisfy rigidity.
      const ec = endCounts(n, at.paths);
      let certOk = true;
      for (let u = 0; u < n; u++) {
        if (ec[u] !== 1) {
          fail(`n=${n} ${g6}: certificate has vertex ${u} ending ${ec[u]} paths, expected exactly 1`);
          certOk = false;
          break;
        }
      }
      if (!certOk) continue;
      certRigid++;

      // Decisive rigidity test: is there ANY size-n/2 decomposition in which
      // some vertex is not the end of exactly one path? Exhausting this is much
      // costlier than finding one decomposition, so it is attempted with a node
      // budget and reported as undecided when that runs out — never assumed.
      try {
        const violating = decompWithEndpointsExact(
          n,
          edgeMask,
          pairs,
          target,
          [],
          NODE_LIMIT,
          (paths) => {
            const e = endCounts(n, paths);
            for (let u = 0; u < n; u++) if (e[u] !== 1) return true;
            return false;
          },
        );
        if (violating.paths) {
          fail(`n=${n} ${g6}: found a size-${target} decomposition violating rigidity`);
          continue;
        }
        rigid++;
      } catch (e) {
        if (!(e instanceof SearchLimitExceeded)) throw e;
        undecided++;
      }
    }
  }
  ok(
    `${graphs} connected all-odd graphs: p = n/2 exactly on ${certRigid} verified certificates, ` +
      `each satisfying "every vertex ends exactly one path"`,
  );
  if (rigid === graphs) {
    ok(`rigidity decided EXHAUSTIVELY for all ${rigid} — no size-n/2 decomposition violates it`);
  } else {
    note(
      `rigidity decided exhaustively for ${rigid}/${graphs}; ${undecided} hit the ` +
        `${NODE_LIMIT.toLocaleString()}-node limit (the lemma is proved analytically above — ` +
        `these are the cases where the machine confirmation was not affordable)`,
    );
  }
}

// ── toggle machinery ──────────────────────────────────────────────────────

type Toggle = { u: number; v: number; added: boolean };

/** Perfect matchings on a vertex list (even length). */
function perfectMatchings(vs: number[]): Array<Array<[number, number]>> {
  if (vs.length === 0) return [[]];
  const [first, ...rest] = vs;
  const out: Array<Array<[number, number]>> = [];
  for (let i = 0; i < rest.length; i++) {
    const partner = rest[i]!;
    const remaining = rest.filter((_, k) => k !== i);
    for (const sub of perfectMatchings(remaining)) {
      out.push([[first!, partner], ...sub]);
    }
  }
  return out;
}

/**
 * Convert a decomposition of the toggled graph H back to one of G, paying
 * nothing: added edges must be end-edges (drop them), deleted edges must be
 * re-attachable at a path end. Backtracks over the choices, so a null result
 * means no assignment works for THIS decomposition — not merely that a greedy
 * order failed.
 */
function convert(D: number[][], toggles: Toggle[]): number[][] | null {
  const start = D.map((p) => p.slice());

  const step = (paths: number[][], idx: number): number[][] | null => {
    if (idx === toggles.length) return paths;
    const t = toggles[idx]!;

    if (t.added) {
      // uv ∈ E(H) \ E(G): must be the first or last edge of its path.
      for (let i = 0; i < paths.length; i++) {
        const P = paths[i]!;
        const L = P.length;
        const head = (P[0] === t.u && P[1] === t.v) || (P[0] === t.v && P[1] === t.u);
        const tail =
          (P[L - 1] === t.u && P[L - 2] === t.v) || (P[L - 1] === t.v && P[L - 2] === t.u);
        for (const which of [head ? "head" : "", tail ? "tail" : ""]) {
          if (!which) continue;
          const next = paths.map((p, k) =>
            k === i ? (which === "head" ? p.slice(1) : p.slice(0, -1)) : p.slice(),
          );
          const pruned = next.filter((p) => p.length >= 2);
          const got = step(pruned, idx + 1);
          if (got) return got;
        }
      }
      return null;
    }

    // uv ∈ E(G) \ E(H): extend a path that ENDS at u by v (or vice versa).
    for (const [a, b] of [
      [t.u, t.v],
      [t.v, t.u],
    ]) {
      for (let i = 0; i < paths.length; i++) {
        const P = paths[i]!;
        if (P.includes(b)) continue;
        let ext: number[] | null = null;
        if (P[0] === a) ext = [b, ...P];
        else if (P[P.length - 1] === a) ext = [...P, b];
        if (!ext) continue;
        const next = paths.map((p, k) => (k === i ? ext! : p.slice()));
        const got = step(next, idx + 1);
        if (got) return got;
      }
    }
    return null;
  };

  return step(start, 0);
}

// ── P2: the toggle experiment ─────────────────────────────────────────────

type TogResult = {
  n: number;
  graphs: number;
  allOdd: number;
  covered: number;
  uncovered: string[];
  pairingsTried: number;
  pairingsWorked: number;
  pairingsUndecided: number;
  firstPairingWorked: number;
  pyberOnly: number;
  toggleOnly: number;
  undecidedGraphs: number;
  sampled?: boolean;
};

/** Do the even-degree vertices induce a forest? (Pyber's classical class.) */
function evenVerticesInduceForest(
  n: number,
  mask: EdgeMask,
  pairs: Array<[number, number]>,
  deg: number[],
): boolean {
  const evens = [];
  for (let u = 0; u < n; u++) if (deg[u]! % 2 === 0) evens.push(u);
  const idx = new Map(evens.map((v, i) => [v, i]));
  const parent = evens.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)));
  for (let i = 0; i < pairs.length; i++) {
    if (!hasEdge(mask, i)) continue;
    const [a, b] = pairs[i]!;
    if (!idx.has(a) || !idx.has(b)) continue;
    const ra = find(idx.get(a)!);
    const rb = find(idx.get(b)!);
    if (ra === rb) return false; // a cycle among even vertices
    parent[ra] = rb;
  }
  return true;
}

async function toggleExperiment(): Promise<TogResult[]> {
  console.log(`\nP2. The toggle experiment — even n ≤ ${TOG_N}, every graph, every pairing`);
  const results: TogResult[] = [];

  for (let n = 4; n <= TOG_N; n += 2) {
    const pairs = allPairs(n);
    const B = gallaiBound(n);
    const res: TogResult = {
      n,
      graphs: 0,
      allOdd: 0,
      covered: 0,
      uncovered: [],
      pairingsTried: 0,
      pairingsWorked: 0,
      pairingsUndecided: 0,
      firstPairingWorked: 0,
      pyberOnly: 0,
      toggleOnly: 0,
      undecidedGraphs: 0,
      sampled: false,
    };
    const t0 = performance.now();

    // Beyond n = 8 the full population is out of reach, so a SYSTEMATIC geng
    // slice is used and labelled as a sample — never presented as exhaustive.
    const sliceForN = n >= 10 ? SLICE : "";
    for (const g6 of await gengConnected(n, sliceForN)) {
      const { edgeMask } = parseGraph6(g6);
      const adj = buildAdj(n, edgeMask, pairs);
      const deg = degrees(adj);
      res.graphs++;
      const evens: number[] = [];
      for (let u = 0; u < n; u++) if (deg[u]! % 2 === 0) evens.push(u);
      const pyber = evenVerticesInduceForest(n, edgeMask, pairs, deg);

      if (evens.length === 0) {
        // Already rigid: Lovász's corollary settles it outright.
        res.allOdd++;
        res.covered++;
        continue;
      }

      let workedAny = false;
      let workedFirst = false;
      let sawUndecided = false;
      let pairingIdx = 0;
      for (const pi of perfectMatchings(evens)) {
        pairingIdx++;
        res.pairingsTried++;
        // Build H by toggling each pair.
        const edges: Array<[number, number]> = [];
        for (let i = 0; i < pairs.length; i++) if (hasEdge(edgeMask, i)) edges.push(pairs[i]!);
        const toggles: Toggle[] = [];
        const edgeSet = new Set(edges.map(([a, b]) => pairIndex(a, b, n)));
        for (const [a, b] of pi) {
          const id = pairIndex(a, b, n);
          const added = !edgeSet.has(id);
          toggles.push({ u: a, v: b, added });
          if (added) edgeSet.add(id);
          else edgeSet.delete(id);
        }
        const hEdges: Array<[number, number]> = [];
        for (let i = 0; i < pairs.length; i++) if (edgeSet.has(i)) hEdges.push(pairs[i]!);
        const hMask = maskFromEdges(n, hEdges);
        const hDeg = degrees(buildAdj(n, hMask, pairs));
        if (hDeg.some((d) => d % 2 === 0)) {
          fail(`n=${n} ${g6}: toggled graph is not all-odd`);
          continue;
        }

        let found: number[][] | null = null;
        try {
          found = decompWithEndpointsExact(
            n,
            hMask,
            pairs,
            n / 2,
            [],
            NODE_LIMIT,
            (paths) => convert(paths, toggles) !== null,
          ).paths;
        } catch (e) {
          if (!(e instanceof SearchLimitExceeded)) throw e;
          // The search ran out of nodes: this pairing is UNDECIDED. Counting it
          // as a failure would understate the conjecture; counting it as a
          // success would overstate it. It is excluded and reported.
          res.pairingsUndecided++;
          sawUndecided = true;
          continue;
        }
        if (!found) continue;

        const converted = convert(found, toggles);
        if (!converted) {
          fail(`n=${n} ${g6}: accept predicate passed but conversion failed`);
          continue;
        }
        if (converted.length > B) {
          fail(`n=${n} ${g6}: converted decomposition has ${converted.length} > B=${B}`);
          continue;
        }
        const v = verifyDecomposition(n, edgeMask, pairs, converted);
        if (!v.ok) {
          fail(`n=${n} ${g6}: converted certificate invalid — ${v.reason}`);
          continue;
        }
        res.pairingsWorked++;
        if (pairingIdx === 1) workedFirst = true;
        workedAny = true;
      }

      if (workedAny) {
        res.covered++;
        if (workedFirst) res.firstPairingWorked++;
        if (!pyber) res.toggleOnly++;
      } else if (sawUndecided) {
        res.undecidedGraphs++;
      } else {
        if (res.uncovered.length < 12) res.uncovered.push(g6);
        if (pyber) res.pyberOnly++;
      }
    }

    const secs = (performance.now() - t0) / 1000;
    res.sampled = n >= 10 && SLICE !== "";
    results.push(res);
    console.log(
      `  n=${n}${res.sampled ? ` [slice ${SLICE}]` : ""}: ${res.covered}/${res.graphs} graphs covered by parity toggling ` +
        `(${res.allOdd} already all-odd), pairings ${res.pairingsWorked}/${res.pairingsTried} worked` +
        `${res.pairingsUndecided ? ` (+${res.pairingsUndecided} undecided)` : ""}, ` +
        `first pairing sufficed for ${res.firstPairingWorked}` +
        `${res.undecidedGraphs ? `, ${res.undecidedGraphs} graphs undecided` : ""}, ${secs.toFixed(1)}s`,
    );
  }
  return results;
}

// ── P4: adversarial family probes beyond the exhaustive range ─────────────

/**
 * Exhaustive enumeration stops at n = 8. The strengthened claim ("EVERY pairing
 * works") is most likely to break where the graph is rigid, dense and highly
 * symmetric, and where every vertex is even so the pairing count is maximal.
 * These families are chosen for exactly that: all degrees even, so z = n and the
 * number of pairings is (n−1)!!.
 */
function familyGraphs(): Array<{ name: string; n: number; edges: Array<[number, number]> }> {
  const out: Array<{ name: string; n: number; edges: Array<[number, number]> }> = [];

  // K_n minus a perfect matching (n even): (n−2)-regular, all degrees even.
  for (const n of [8, 10, 12]) {
    const edges: Array<[number, number]> = [];
    for (let u = 0; u < n; u++) {
      for (let v = u + 1; v < n; v++) {
        if (v === u + 1 && u % 2 === 0) continue; // drop the matching
        edges.push([u, v]);
      }
    }
    out.push({ name: `K_${n} − perfect matching`, n, edges });
  }

  // Complete bipartite with both sides even-degree.
  for (const [a, b] of [
    [4, 6],
    [6, 6],
    [4, 8],
  ] as Array<[number, number]>) {
    const edges: Array<[number, number]> = [];
    for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) edges.push([i, a + j]);
    out.push({ name: `K_{${a},${b}}`, n: a + b, edges });
  }

  // Cycles and their squares (2- and 4-regular).
  for (const n of [8, 10, 12]) {
    const cyc: Array<[number, number]> = [];
    for (let i = 0; i < n; i++) cyc.push([i, (i + 1) % n]);
    out.push({ name: `C_${n}`, n, edges: cyc });
    const sq: Array<[number, number]> = [...cyc];
    for (let i = 0; i < n; i++) {
      const j = (i + 2) % n;
      sq.push([Math.min(i, j), Math.max(i, j)]);
    }
    out.push({ name: `C_${n}²`, n, edges: sq.filter(([x, y]) => x !== y) });
  }

  // Complete tripartite, all degrees even.
  {
    const parts = [4, 4, 4];
    const edges: Array<[number, number]> = [];
    const off = [0, 4, 8];
    for (let p = 0; p < 3; p++) {
      for (let q = p + 1; q < 3; q++) {
        for (let i = 0; i < parts[p]!; i++) {
          for (let j = 0; j < parts[q]!; j++) edges.push([off[p]! + i, off[q]! + j]);
        }
      }
    }
    out.push({ name: "K_{4,4,4}", n: 12, edges });
  }

  return out;
}

async function familyProbe(maxPairings: number): Promise<void> {
  console.log(`\nP4. Adversarial family probes (all degrees even ⇒ maximal pairing count)`);
  for (const fam of familyGraphs()) {
    const { name, n, edges } = fam;
    const pairs = allPairs(n);
    const mask = maskFromEdges(n, edges);
    const deg = degrees(buildAdj(n, mask, pairs));
    const B = gallaiBound(n);
    const evens: number[] = [];
    for (let u = 0; u < n; u++) if (deg[u]! % 2 === 0) evens.push(u);
    if (evens.length % 2 !== 0) {
      note(`${name}: odd number of even-degree vertices, skipped (even-n test)`);
      continue;
    }
    const all = perfectMatchings(evens);
    const step = all.length > maxPairings ? Math.ceil(all.length / maxPairings) : 1;
    let tried = 0;
    let worked = 0;
    let undecided = 0;
    for (let k = 0; k < all.length; k += step) {
      const pi = all[k]!;
      const edgeSet = new Set<number>();
      for (const [a, b] of edges) edgeSet.add(pairIndex(a, b, n));
      const toggles: Toggle[] = [];
      for (const [a, b] of pi) {
        const id = pairIndex(a, b, n);
        const added = !edgeSet.has(id);
        toggles.push({ u: a, v: b, added });
        if (added) edgeSet.add(id);
        else edgeSet.delete(id);
      }
      const hEdges: Array<[number, number]> = [];
      for (let i = 0; i < pairs.length; i++) if (edgeSet.has(i)) hEdges.push(pairs[i]!);
      const hMask = maskFromEdges(n, hEdges);
      tried++;
      let found: number[][] | null = null;
      try {
        found = decompWithEndpointsExact(
          n,
          hMask,
          pairs,
          n / 2,
          [],
          NODE_LIMIT,
          (paths) => convert(paths, toggles) !== null,
        ).paths;
      } catch (e) {
        if (!(e instanceof SearchLimitExceeded)) throw e;
        undecided++;
        continue;
      }
      if (!found) continue;
      const converted = convert(found, toggles);
      if (!converted || converted.length > B) continue;
      const v = verifyDecomposition(n, mask, pairs, converted);
      if (!v.ok) {
        fail(`${name}: converted certificate invalid — ${v.reason}`);
        continue;
      }
      worked++;
    }
    const label = step > 1 ? `${tried} of ${all.length} pairings (every ${step}th)` : `all ${tried} pairings`;
    const failed = tried - worked - undecided;
    if (failed === 0 && undecided === 0) {
      ok(`${name} (n=${n}, ${edges.length} edges, z=${evens.length}): ${label} free-toggle, every certificate verified`);
    } else if (failed === 0) {
      ok(
        `${name} (n=${n}, ${edges.length} edges, z=${evens.length}): ${worked} of ${tried} pairings ` +
          `free-toggle and ZERO decided failures; ${undecided} undecided at the ` +
          `${NODE_LIMIT.toLocaleString()}-node limit (excluded, not counted against the conjecture)`,
      );
    } else {
      note(
        `${name} (n=${n}, z=${evens.length}): ${failed}/${tried} pairings DECIDED to have no ` +
          `free-toggle decomposition${undecided ? `, ${undecided} undecided` : ""} — a real obstruction, ` +
          `pairing choice matters here`,
      );
    }
  }
}

// ── main ──────────────────────────────────────────────────────────────────

console.log(`Gallai via parity toggling — Lovász's all-odd class as the base\n`);
if (opt("fam-only", "") === "1") {
  await familyProbe(Number(opt("max-pairings", "400")));
  console.log(`\n${failures === 0 ? "ALL CERTIFICATES VALID" : `${failures} FAILURES`}`);
  process.exit(failures === 0 ? 0 : 1);
}
await checkRigidity();
const results = await toggleExperiment();
if (opt("skip-fam", "") !== "1") {
  await familyProbe(Number(opt("max-pairings", "400")));
}

const totalGraphs = results.reduce((a, r) => a + r.graphs, 0);
const totalCovered = results.reduce((a, r) => a + r.covered, 0);
const totalUndecidedGraphs = results.reduce((a, r) => a + r.undecidedGraphs, 0);
const totalUndecidedPairings = results.reduce((a, r) => a + r.pairingsUndecided, 0);
const totalUncovered = results.flatMap((r) => r.uncovered);
const toggleOnly = results.reduce((a, r) => a + r.toggleOnly, 0);
const pyberOnly = results.reduce((a, r) => a + r.pyberOnly, 0);

console.log("");
const totalPairings = results.reduce((a, r) => a + r.pairingsTried, 0);
const workedPairings = results.reduce((a, r) => a + r.pairingsWorked, 0);
const exhaustiveN = results.filter((r) => !r.sampled).map((r) => r.n);
const sampledN = results.filter((r) => r.sampled).map((r) => r.n);

if (totalUndecidedGraphs > 0 || totalUndecidedPairings > 0) {
  note(
    `${totalUndecidedPairings.toLocaleString()} pairings hit the ${NODE_LIMIT.toLocaleString()}-node limit and are ` +
      `EXCLUDED from the counts (${totalUndecidedGraphs} graphs have no decided pairing at all)`,
  );
}
if (totalCovered === totalGraphs - totalUndecidedGraphs) {
  ok(
    `Q ANSWERED YES: every one of the ${totalCovered} decided connected graphs tested on ` +
      `even n (exhaustive at n = ${exhaustiveN.join(", ")}${sampledN.length ? `; sampled at n = ${sampledN.join(", ")}` : ""}) ` +
      `admits a pairing whose toggles are all free — each with a verified ` +
      `decomposition of G of size ≤ ceil(n/2) built from the all-odd case`,
  );
  // A pairing that ran out of nodes is UNDECIDED, not a failure. Comparing
  // `worked` against the raw total would silently report those as failures.
  const decidedPairings = totalPairings - totalUndecidedPairings;
  const failedPairings = decidedPairings - workedPairings;
  if (failedPairings === 0) {
    ok(
      `STRONGER, and unexpected: ALL ${decidedPairings.toLocaleString()} DECIDED pairings worked, not merely ` +
        `one per graph. Gallai needs a single good pairing; the data says every pairing is good. ` +
        `(${totalUndecidedPairings.toLocaleString()} undecided at the node limit, excluded.)`,
    );
  } else {
    note(
      `${failedPairings.toLocaleString()} of ${decidedPairings.toLocaleString()} decided pairings FAILED — ` +
        `the choice of pairing matters, and Free Toggle as stated is false`,
    );
  }
  note(`the toggle route reaches ${toggleOnly} graphs whose even vertices do NOT induce a forest, i.e. outside Pyber's classical class`);
} else {
  note(
    `Q ANSWERED NO: ${totalGraphs - totalCovered}/${totalGraphs} graphs admit NO free-toggle ` +
      `pairing — the strategy has a real obstruction. Witnesses:`,
  );
  for (const g of totalUncovered) note(`    ${g}`);
  note(`${pyberOnly} of the uncovered graphs ARE in Pyber's class, so Pyber's theorem still covers them`);
  note(`the toggle route reaches ${toggleOnly} graphs outside Pyber's class`);
}

console.log(`\n${failures === 0 ? "ALL CERTIFICATES VALID" : `${failures} FAILURES`}`);
process.exit(failures === 0 ? 0 : 1);
