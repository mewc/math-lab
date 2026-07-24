/**
 * Shared exact path-number engine for Gallai path decomposition research.
 * Integer / bitset arithmetic only — no floating point in decisive checks.
 *
 * Edge masks are BigInt so C(n,2) may exceed 31 (JS bitwise ops are 32-bit).
 * Residual adjacency for search uses number bitsets (requires n ≤ 31).
 */

export type Adj = number[][];
export type EdgeMask = bigint;

/** Map unordered pair {u,v} (u < v) to bit index in 0..C(n,2)-1. */
export function pairIndex(u: number, v: number, n: number): number {
  if (u > v) {
    const t = u;
    u = v;
    v = t;
  }
  return (u * (2 * n - u - 1)) / 2 + (v - u - 1);
}

export function allPairs(n: number): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let u = 0; u < n; u++) {
    for (let v = u + 1; v < n; v++) pairs.push([u, v]);
  }
  return pairs;
}

export function hasEdge(edgeMask: EdgeMask, i: number): boolean {
  return ((edgeMask >> BigInt(i)) & 1n) === 1n;
}

export function setEdge(edgeMask: EdgeMask, i: number): EdgeMask {
  return edgeMask | (1n << BigInt(i));
}

export function buildAdj(
  n: number,
  edgeMask: EdgeMask,
  pairs: Array<[number, number]>,
): Adj {
  const adj: Adj = Array.from({ length: n }, () => []);
  for (let i = 0; i < pairs.length; i++) {
    if (!hasEdge(edgeMask, i)) continue;
    const [u, v] = pairs[i]!;
    adj[u]!.push(v);
    adj[v]!.push(u);
  }
  for (let u = 0; u < n; u++) adj[u]!.sort((a, b) => a - b);
  return adj;
}

export function edgeCount(edgeMask: EdgeMask): number {
  let c = 0;
  let m = edgeMask;
  while (m !== 0n) {
    m &= m - 1n;
    c++;
  }
  return c;
}

export function degrees(adj: Adj): number[] {
  return adj.map((nbrs) => nbrs.length);
}

/**
 * Lower bounds on path_number:
 *   - ceil(odd/2)
 *   - max_v ceil(deg(v)/2)
 *   - ceil(m/(n-1))
 */
export function pathLowerBound(deg: number[], m: number, n: number): number {
  let odd = 0;
  let maxHalf = 0;
  for (const d of deg) {
    if (d & 1) odd++;
    const h = (d + 1) >> 1;
    if (h > maxHalf) maxHalf = h;
  }
  const byOdd = (odd + 1) >> 1;
  const byEdges = n <= 1 ? 0 : Math.ceil(m / (n - 1));
  return Math.max(byOdd, maxHalf, byEdges);
}

export function isConnected(adj: Adj, n: number): boolean {
  if (n === 1) return true;
  let start = -1;
  for (let u = 0; u < n; u++) {
    if (adj[u]!.length > 0) {
      start = u;
      break;
    }
  }
  if (start < 0) return false;
  const seen = new Uint8Array(n);
  const stack = [start];
  seen[start] = 1;
  let visited = 1;
  while (stack.length) {
    const u = stack.pop()!;
    for (const v of adj[u]!) {
      if (!seen[v]) {
        seen[v] = 1;
        visited++;
        stack.push(v);
      }
    }
  }
  return visited === n;
}

export function gallaiBound(n: number): number {
  return (n + 1) >> 1;
}

/**
 * A path is a vertex sequence with no repeats; consecutive pairs are edges.
 * Decomposition: every edge of the graph appears in exactly one path.
 */
export function verifyDecomposition(
  n: number,
  edgeMask: EdgeMask,
  pairs: Array<[number, number]>,
  paths: number[][],
): { ok: true } | { ok: false; reason: string } {
  const used = new Map<number, number>();
  for (let pi = 0; pi < paths.length; pi++) {
    const path = paths[pi]!;
    if (path.length < 2) {
      return { ok: false, reason: `path ${pi} has length < 1 edge` };
    }
    const seenV = new Set<number>();
    for (const v of path) {
      if (v < 0 || v >= n) return { ok: false, reason: `vertex ${v} out of range` };
      if (seenV.has(v)) return { ok: false, reason: `path ${pi} repeats vertex ${v}` };
      seenV.add(v);
    }
    for (let i = 0; i < path.length - 1; i++) {
      const u = path[i]!;
      const v = path[i + 1]!;
      const idx = pairIndex(u, v, n);
      if (idx < 0 || idx >= pairs.length) {
        return { ok: false, reason: `bad edge ${u}-${v}` };
      }
      if (!hasEdge(edgeMask, idx)) {
        return { ok: false, reason: `path ${pi} uses non-edge ${u}-${v}` };
      }
      if (used.has(idx)) {
        return { ok: false, reason: `edge ${u}-${v} used twice` };
      }
      used.set(idx, pi);
    }
  }
  const m = edgeCount(edgeMask);
  if (used.size !== m) {
    return {
      ok: false,
      reason: `covered ${used.size} edges but graph has ${m}`,
    };
  }
  return { ok: true };
}

// ── residual bitsets (n ≤ 31) ──────────────────────────────────────────────

function residualFromMask(
  n: number,
  edgeMask: EdgeMask,
  pairs: Array<[number, number]>,
): Uint32Array {
  if (n > 31) throw new Error(`residual bitsets require n≤31, got ${n}`);
  const bs = new Uint32Array(n);
  for (let i = 0; i < pairs.length; i++) {
    if (!hasEdge(edgeMask, i)) continue;
    const [u, v] = pairs[i]!;
    bs[u]! |= 1 << v;
    bs[v]! |= 1 << u;
  }
  return bs;
}

function popcount32(x: number): number {
  let c = 0;
  let m = x >>> 0;
  while (m) {
    m &= m - 1;
    c++;
  }
  return c;
}

function residualOddCount(bs: Uint32Array, n: number): number {
  let o = 0;
  for (let u = 0; u < n; u++) if (popcount32(bs[u]!) & 1) o++;
  return o;
}

function residualMaxCeilHalfDeg(bs: Uint32Array, n: number): number {
  let m = 0;
  for (let u = 0; u < n; u++) {
    const h = (popcount32(bs[u]!) + 1) >> 1;
    if (h > m) m = h;
  }
  return m;
}

function residualEdgeCount(bs: Uint32Array, n: number): number {
  let s = 0;
  for (let u = 0; u < n; u++) s += popcount32(bs[u]!);
  return s >> 1;
}

function removeEdge(bs: Uint32Array, u: number, v: number): void {
  bs[u]! &= ~(1 << v);
  bs[v]! &= ~(1 << u);
}

function addEdge(bs: Uint32Array, u: number, v: number): void {
  bs[u]! |= 1 << v;
  bs[v]! |= 1 << u;
}

function greedyDegreePaths(
  n: number,
  edgeMask: EdgeMask,
  pairs: Array<[number, number]>,
): number[][] {
  let best: number[][] | null = null;

  for (let seed0 = 0; seed0 < n; seed0++) {
    const bs = residualFromMask(n, edgeMask, pairs);
    const paths: number[][] = [];
    const deg = (u: number) => popcount32(bs[u]!);

    function extendFrom(start: number): number[] {
      const path = [start];
      const usedV = new Uint8Array(n);
      usedV[start] = 1;
      let cur = start;
      for (;;) {
        let nbrs = bs[cur]!;
        let bestV = -1;
        let bestD = -1;
        while (nbrs) {
          const lsb = nbrs & -nbrs;
          const v = 31 - Math.clz32(lsb);
          nbrs ^= lsb;
          if (usedV[v]) continue;
          const d = deg(v);
          if (d > bestD) {
            bestD = d;
            bestV = v;
          }
        }
        if (bestV < 0) break;
        path.push(bestV);
        usedV[bestV] = 1;
        cur = bestV;
      }
      return path;
    }

    while (residualEdgeCount(bs, n) > 0) {
      let start = -1;
      for (let u = 0; u < n; u++) {
        if (popcount32(bs[u]!) & 1) {
          start = u;
          break;
        }
      }
      if (start < 0) {
        for (let k = 0; k < n; k++) {
          const u = (seed0 + k) % n;
          if (bs[u]!) {
            start = u;
            break;
          }
        }
      }
      if (start < 0) break;

      let path = extendFrom(start);
      if (path.length < 2) {
        let found = false;
        for (let u = 0; u < n && !found; u++) {
          const high = bs[u]! & ~((1 << (u + 1)) - 1);
          if (high) {
            const v = 31 - Math.clz32(high & -high);
            path = [u, v];
            found = true;
          }
        }
        if (!found) throw new Error("greedy: residual edges but no edge found");
      }
      for (let i = 0; i < path.length - 1; i++) removeEdge(bs, path[i]!, path[i + 1]!);
      paths.push(path);
    }

    if (!best || paths.length < best.length) best = paths;
  }

  return best ?? [];
}

/**
 * Exact search: minimum path decomposition size (or best found above budget).
 * Exhaustive DFS on residual; force lowest residual edge into next path.
 */
export function exactPathNumber(
  n: number,
  edgeMask: EdgeMask,
  pairs: Array<[number, number]>,
  budget: number,
): { num: number; paths: number[][] } {
  const m = edgeCount(edgeMask);
  if (m === 0) return { num: 0, paths: [] };

  const greedy = greedyDegreePaths(n, edgeMask, pairs);
  const gCheck = verifyDecomposition(n, edgeMask, pairs, greedy);
  if (!gCheck.ok) throw new Error(`greedy bad: ${gCheck.reason}`);

  if (greedy.length <= budget) {
    return { num: greedy.length, paths: greedy };
  }

  const bs = residualFromMask(n, edgeMask, pairs);
  let best = greedy.length;
  let bestPaths: number[][] = greedy;

  if (budget >= m && m < best) {
    best = m;
    const triv: number[][] = [];
    for (let i = 0; i < pairs.length; i++) {
      if (!hasEdge(edgeMask, i)) continue;
      triv.push([pairs[i]![0], pairs[i]![1]]);
    }
    bestPaths = triv;
  }

  const pathsSoFar: number[][] = [];

  function enumeratePathsContainingClean(
    a: number,
    b: number,
    out: number[][],
  ): void {
    const leftExts: number[][] = [];
    {
      const used = new Uint8Array(n);
      used[a] = 1;
      used[b] = 1;
      const chain: number[] = [];
      function dfsLeft(cur: number): void {
        leftExts.push(chain.slice());
        let nbrs = bs[cur]!;
        while (nbrs) {
          const lsb = nbrs & -nbrs;
          const v = 31 - Math.clz32(lsb);
          nbrs ^= lsb;
          if (used[v]) continue;
          used[v] = 1;
          chain.push(v);
          dfsLeft(v);
          chain.pop();
          used[v] = 0;
        }
      }
      dfsLeft(a);
    }

    for (const left of leftExts) {
      const used = new Uint8Array(n);
      used[a] = 1;
      used[b] = 1;
      for (const v of left) used[v] = 1;

      const rightChain: number[] = [];
      function dfsRight(cur: number): void {
        const p: number[] = [];
        for (let i = left.length - 1; i >= 0; i--) p.push(left[i]!);
        p.push(a);
        p.push(b);
        for (const x of rightChain) p.push(x);
        out.push(p);

        let nbrs = bs[cur]!;
        while (nbrs) {
          const lsb = nbrs & -nbrs;
          const v = 31 - Math.clz32(lsb);
          nbrs ^= lsb;
          if (used[v]) continue;
          used[v] = 1;
          rightChain.push(v);
          dfsRight(v);
          rightChain.pop();
          used[v] = 0;
        }
      }
      dfsRight(b);
    }
  }

  function findLowestEdge(): [number, number] | null {
    for (let u = 0; u < n; u++) {
      let nbrs = bs[u]!;
      const high = nbrs & ~((1 << (u + 1)) - 1);
      if (high) {
        const v = 31 - Math.clz32(high & -high);
        return [u, v];
      }
    }
    return null;
  }

  function search(pathCount: number): void {
    if (pathCount >= best) return;
    if (pathCount > budget) return;

    const rem = residualEdgeCount(bs, n);
    if (rem === 0) {
      best = pathCount;
      bestPaths = pathsSoFar.map((p) => p.slice());
      return;
    }

    const odd = residualOddCount(bs, n);
    const byOdd = (odd + 1) >> 1;
    const byDeg = residualMaxCeilHalfDeg(bs, n);
    const remE = residualEdgeCount(bs, n);
    const byEdges = n <= 1 ? 0 : Math.ceil(remE / (n - 1));
    const lb = Math.max(byOdd, byDeg, byEdges);
    if (pathCount + lb >= best) return;
    if (pathCount + lb > budget) return;

    const seed = findLowestEdge();
    if (!seed) return;
    const [a, b] = seed;

    const candidates: number[][] = [];
    enumeratePathsContainingClean(a, b, candidates);
    candidates.sort((p, q) => q.length - p.length);

    for (const path of candidates) {
      for (let i = 0; i < path.length - 1; i++) {
        removeEdge(bs, path[i]!, path[i + 1]!);
      }
      pathsSoFar.push(path);
      search(pathCount + 1);
      pathsSoFar.pop();
      for (let i = 0; i < path.length - 1; i++) {
        addEdge(bs, path[i]!, path[i + 1]!);
      }
      if (best <= budget) return;
    }
  }

  search(0);
  return { num: best, paths: bestPaths };
}

export function pathNumberAtMost(
  n: number,
  edgeMask: EdgeMask,
  pairs: Array<[number, number]>,
  budget: number,
): { ok: true; num: number; paths: number[][] } | { ok: false; num: number; paths: number[][] } {
  const result = exactPathNumber(n, edgeMask, pairs, budget);
  if (result.num <= budget && (result.paths.length > 0 || edgeCount(edgeMask) === 0)) {
    if (edgeCount(edgeMask) === 0) return { ok: true, num: 0, paths: [] };
    const v = verifyDecomposition(n, edgeMask, pairs, result.paths);
    if (!v.ok) {
      throw new Error(`internal: bad certificate: ${v.reason}`);
    }
    if (result.paths.length !== result.num) {
      throw new Error(`internal: num ${result.num} != paths ${result.paths.length}`);
    }
    return { ok: true, num: result.num, paths: result.paths };
  }
  return { ok: false, num: result.num, paths: result.paths };
}

// ── graph6 ─────────────────────────────────────────────────────────────────

/**
 * Parse a graph6 string (n ≤ 62) into n and BigInt edge bitmask.
 * graph6 bit order: column-by-column upper triangle
 *   (0,1), (0,2),(1,2), (0,3),(1,3),(2,3), ...
 */
export function parseGraph6(g6: string): {
  n: number;
  edgeMask: EdgeMask;
  edges: Array<[number, number]>;
} {
  let s = g6.trim();
  if (s.startsWith(">>graph6<<")) s = s.slice(">>graph6<<".length);
  if (s.length === 0) throw new Error("empty graph6");

  let pos = 0;
  function nextByte(): number {
    if (pos >= s.length) throw new Error("graph6 truncated");
    const c = s.charCodeAt(pos++) - 63;
    if (c < 0 || c > 63) throw new Error(`bad graph6 char at ${pos - 1}`);
    return c;
  }

  let n: number;
  const b0 = nextByte();
  if (b0 !== 63) {
    n = b0;
  } else {
    const x = (nextByte() << 12) | (nextByte() << 6) | nextByte();
    n = x;
  }
  if (n < 0 || n > 31) {
    throw new Error(`graph6 n=${n} out of supported range 0..31`);
  }

  const needBits = (n * (n - 1)) / 2;
  const needBytes = Math.ceil(needBits / 6);
  const bits: number[] = [];
  for (let i = 0; i < needBytes; i++) {
    const b = nextByte();
    for (let k = 5; k >= 0; k--) bits.push((b >> k) & 1);
  }

  let edgeMask = 0n;
  const edges: Array<[number, number]> = [];
  let bi = 0;
  for (let col = 1; col < n; col++) {
    for (let row = 0; row < col; row++) {
      if (bits[bi++] === 1) {
        const idx = pairIndex(row, col, n);
        edgeMask = setEdge(edgeMask, idx);
        edges.push([row, col]);
      }
    }
  }

  return { n, edgeMask, edges };
}

export function maskFromEdges(n: number, edges: Array<[number, number]>): EdgeMask {
  let mask = 0n;
  for (const [u, v] of edges) mask = setEdge(mask, pairIndex(u, v, n));
  return mask;
}

// ── star / complete certificates ───────────────────────────────────────────

export function starTightCertificate(n: number): {
  n: number;
  edges: Array<[number, number]>;
  paths: number[][];
  pathNumber: number;
  bound: number;
  tight: boolean;
} {
  const edges: Array<[number, number]> = [];
  for (let i = 1; i < n; i++) edges.push([0, i]);
  const paths: number[][] = [];
  let i = 1;
  while (i + 1 < n) {
    paths.push([i, 0, i + 1]);
    i += 2;
  }
  if (i < n) paths.push([i, 0]);
  const pathNumber = paths.length;
  const bound = gallaiBound(n);
  return { n, edges, paths, pathNumber, bound, tight: pathNumber === bound };
}

export function completeMask(n: number): EdgeMask {
  const e = (n * (n - 1)) / 2;
  return (1n << BigInt(e)) - 1n;
}
