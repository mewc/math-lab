// Exact poset machinery for the 1/3–2/3 conjecture campaign. Everything here
// is integer-exact: linear extensions are counted in BigInt via dynamic
// programming over order ideals, and balance comparisons are done by
// cross-multiplication — no floating point touches a mathematical claim.
//
// Representation: elements 0..n-1; lt[i] is the bitmask of elements strictly
// below i. The relation is kept transitively closed at all times.

export interface Poset {
  n: number;
  lt: number[]; // lt[i] = bitmask of j with j < i (strict, transitively closed)
}

export function emptyPoset(n: number): Poset {
  return { n, lt: new Array(n).fill(0) };
}

/** up[i] = bitmask of j with i < j. Derived view of the same relation. */
export function upSets(p: Poset): number[] {
  const up = new Array(p.n).fill(0);
  for (let i = 0; i < p.n; i++) {
    for (let j = 0; j < p.n; j++) if (p.lt[j] & (1 << i)) up[i] |= 1 << j;
  }
  return up;
}

/** Transitive closure in place (Warshall on bitmasks). */
export function close(p: Poset): Poset {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < p.n; i++) {
      let below = p.lt[i];
      let m = below;
      while (m) {
        const j = 31 - Math.clz32(m & -m);
        below |= p.lt[j];
        m &= m - 1;
      }
      if (below !== p.lt[i]) {
        p.lt[i] = below;
        changed = true;
      }
    }
  }
  return p;
}

/** Add relation a < b and re-close. Throws if it would create a cycle. */
export function withRelation(p: Poset, a: number, b: number): Poset {
  if (p.lt[a] & (1 << b)) throw new Error("cycle");
  const q: Poset = { n: p.n, lt: p.lt.slice() };
  q.lt[b] |= 1 << a;
  close(q);
  for (let i = 0; i < q.n; i++) if (q.lt[i] & (1 << i)) throw new Error("cycle");
  return q;
}

export function isDownset(p: Poset, mask: number): boolean {
  let m = mask;
  while (m) {
    const i = 31 - Math.clz32(m & -m);
    if ((p.lt[i] & mask) !== p.lt[i]) return false;
    m &= m - 1;
  }
  return true;
}

/** All order ideals (downsets), as bitmasks. */
export function downsets(p: Poset): number[] {
  const out: number[] = [];
  for (let mask = 0; mask < 1 << p.n; mask++) if (isDownset(p, mask)) out.push(mask);
  return out;
}

/**
 * Number of linear extensions, exactly. DP over order ideals: f(S) counts the
 * extensions of the sub-poset induced on downset S; f(S) = Σ f(S \ {i}) over
 * elements i maximal in S. O(2^n · n).
 */
export function countExtensions(p: Poset): bigint {
  const up = upSets(p);
  const size = 1 << p.n;
  const f = new Array<bigint>(size).fill(0n);
  f[0] = 1n;
  for (let mask = 1; mask < size; mask++) {
    if (!isDownset(p, mask)) continue;
    let acc = 0n;
    let m = mask;
    while (m) {
      const i = 31 - Math.clz32(m & -m);
      if ((up[i] & mask) === 0) acc += f[mask ^ (1 << i)]; // i maximal in S
      m &= m - 1;
    }
    f[mask] = acc;
  }
  return f[size - 1];
}

export interface PairStat {
  a: number;
  b: number;
  /** extensions with a before b */
  aFirst: bigint;
  /** extensions with b before a */
  bFirst: bigint;
}

/** All incomparable pairs with exact before/after extension counts. */
export function pairStats(p: Poset, total?: bigint): PairStat[] {
  const e = total ?? countExtensions(p);
  const out: PairStat[] = [];
  for (let a = 0; a < p.n; a++) {
    for (let b = a + 1; b < p.n; b++) {
      if (p.lt[a] & (1 << b) || p.lt[b] & (1 << a)) continue; // comparable
      const aFirst = countExtensions(withRelation(p, a, b));
      out.push({ a, b, aFirst, bFirst: e - aFirst });
    }
  }
  return out;
}

export interface Balance {
  /** numerator/denominator of the best pair's min-side probability, in lowest terms not required */
  num: bigint;
  den: bigint;
  pair: [number, number];
  extensions: bigint;
}

/**
 * b(P) = max over incomparable pairs (x,y) of min(P(x<y), P(y<x)), exactly.
 * Returns null for chains (no incomparable pair). The 1/3–2/3 conjecture:
 * b(P) ≥ 1/3 for every finite non-chain poset.
 */
export function balance(p: Poset): Balance | null {
  const e = countExtensions(p);
  let best: Balance | null = null;
  for (let a = 0; a < p.n; a++) {
    for (let b = a + 1; b < p.n; b++) {
      if (p.lt[a] & (1 << b) || p.lt[b] & (1 << a)) continue;
      const aFirst = countExtensions(withRelation(p, a, b));
      const minSide = aFirst < e - aFirst ? aFirst : e - aFirst;
      // compare minSide/e > best.num/best.den by cross-multiplication
      if (!best || minSide * best.den > best.num * e) {
        best = { num: minSide, den: e, pair: [a, b], extensions: e };
      }
    }
  }
  return best;
}

export function isChain(p: Poset): boolean {
  for (let a = 0; a < p.n; a++)
    for (let b = a + 1; b < p.n; b++)
      if (!(p.lt[a] & (1 << b)) && !(p.lt[b] & (1 << a))) return false;
  return true;
}

// ---------------------------------------------------------------- canonical

/**
 * Canonical string for isomorphism-dedup. Elements are partitioned by an
 * iterated invariant (down/up degrees refined by neighbor multisets, WL-style);
 * we then try only permutations respecting the partition and take the
 * lexicographically smallest relation bitstring. Exact (the refinement only
 * prunes; all class-respecting permutations are tried).
 */
export function canonical(p: Poset): string {
  const n = p.n;
  const up = upSets(p);
  // iterated refinement
  let color = new Array<number>(n).fill(0);
  for (let round = 0; round < n; round++) {
    const sig = new Array<string>(n);
    for (let i = 0; i < n; i++) {
      const downC: number[] = [];
      const upC: number[] = [];
      for (let j = 0; j < n; j++) {
        if (p.lt[i] & (1 << j)) downC.push(color[j]);
        if (up[i] & (1 << j)) upC.push(color[j]);
      }
      downC.sort((x, y) => x - y);
      upC.sort((x, y) => x - y);
      sig[i] = `${color[i]}|${downC.join(",")}|${upC.join(",")}`;
    }
    const uniq = [...new Set(sig)].sort();
    const next = sig.map((s) => uniq.indexOf(s));
    if (uniq.length === new Set(color).size && next.every((c, i) => c === color[i])) break;
    color = next;
  }
  // group elements by final color; candidate orderings permute within groups
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const g = groups.get(color[i]) ?? [];
    g.push(i);
    groups.set(color[i], g);
  }
  const groupList = [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => g);

  let best: string | null = null;
  const perm = new Array<number>(n); // perm[old] = new index
  const assignGroup = (gi: number, offset: number) => {
    if (gi === groupList.length) {
      const mat = new Array<number>(n * n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (p.lt[i] & (1 << j)) mat[perm[i] * n + perm[j]] = 1; // j < i
        }
      }
      const s = mat.join("");
      if (best === null || s < best) best = s;
      return;
    }
    const g = groupList[gi];
    const permute = (idx: number, used: number) => {
      if (idx === g.length) {
        assignGroup(gi + 1, offset + g.length);
        return;
      }
      for (let k = 0; k < g.length; k++) {
        if (used & (1 << k)) continue;
        perm[g[idx]] = offset + k;
        permute(idx + 1, used | (1 << k));
      }
    };
    permute(0, 0);
  };
  assignGroup(0, 0);
  return best!;
}

// -------------------------------------------------------------- enumeration

/**
 * All posets on n elements up to isomorphism, grown by repeatedly attaching a
 * new maximal element whose strict down-set is an arbitrary order ideal of the
 * smaller poset (every finite poset arises this way by peeling a maximal
 * element), deduplicated canonically. Sanity anchors: 1, 2, 5, 16, 63, 318,
 * 2045, 16999 for n = 1…8 (OEIS A000112).
 */
export function enumeratePosets(n: number): Poset[] {
  let current: Poset[] = [emptyPoset(1)];
  for (let k = 2; k <= n; k++) {
    const seen = new Set<string>();
    const next: Poset[] = [];
    for (const p of current) {
      for (const ideal of downsets(p)) {
        const q: Poset = { n: k, lt: [...p.lt, ideal] };
        // new element k-1 sits above exactly `ideal`; relation stays closed
        const key = canonical(q);
        if (!seen.has(key)) {
          seen.add(key);
          next.push(q);
        }
      }
    }
    current = next;
  }
  return current;
}

// ------------------------------------------------------------------ helpers

/** Hasse cover edges (j -> i where i covers j): for drawing diagrams. */
export function coverEdges(p: Poset): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < p.n; i++) {
    let m = p.lt[i];
    while (m) {
      const j = 31 - Math.clz32(m & -m);
      m &= m - 1;
      // i covers j iff no k with j < k < i
      let between = false;
      let mm = p.lt[i];
      while (mm) {
        const k = 31 - Math.clz32(mm & -mm);
        mm &= mm - 1;
        if (k !== j && p.lt[k] & (1 << j)) {
          between = true;
          break;
        }
      }
      if (!between) out.push([j, i]);
    }
  }
  return out;
}

/** Compact text form, e.g. "0<2 1<2" (cover relations only). */
export function describe(p: Poset): string {
  const edges = coverEdges(p);
  if (edges.length === 0) return `antichain(${p.n})`;
  return edges.map(([j, i]) => `${j}<${i}`).join(" ");
}
