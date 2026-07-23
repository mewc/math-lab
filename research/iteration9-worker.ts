// Worker for iteration 9 — sweeps a shard of 9-element base posets two
// levels up to n = 11 candidates. See iteration9.ts for the design.

declare const self: Worker;

const N = 11;

function countExtFast(n: number, lt: number[], up: number[]): number {
  const size = 1 << n;
  const f = new Float64Array(size);
  f[0] = 1;
  for (let mask = 1; mask < size; mask++) {
    let ok = true;
    let m = mask;
    while (m) {
      const i = 31 - Math.clz32(m & -m);
      if ((lt[i] & mask) !== lt[i]) {
        ok = false;
        break;
      }
      m &= m - 1;
    }
    if (!ok) continue;
    let acc = 0;
    m = mask;
    while (m) {
      const i = 31 - Math.clz32(m & -m);
      if ((up[i] & mask) === 0) acc += f[mask ^ (1 << i)];
      m &= m - 1;
    }
    f[mask] = acc;
  }
  return f[size - 1];
}

function upSetsOf(n: number, lt: number[]): number[] {
  const up = new Array(n).fill(0);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) if (lt[j] & (1 << i)) up[i] |= 1 << j;
  return up;
}
function downsetsOf(n: number, lt: number[]): number[] {
  const out: number[] = [];
  for (let mask = 0; mask < 1 << n; mask++) {
    let ok = true;
    let m = mask;
    while (m) {
      const i = 31 - Math.clz32(m & -m);
      if ((lt[i] & mask) !== lt[i]) {
        ok = false;
        break;
      }
      m &= m - 1;
    }
    if (ok) out.push(mask);
  }
  return out;
}
const popcount = (x: number) => {
  let c = 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
};

// verify one n=11 candidate; returns 0 = fine (some pair strictly above 1/3),
// 1 = exactly 1/3 (extremal), 2 = below 1/3 (counterexample!), 3 = chain
function verify(lt: number[]): { code: number; e?: number; maxMin?: number } {
  const up = upSetsOf(N, lt);
  const pairs: Array<[number, number, number]> = [];
  for (let a = 0; a < N; a++) {
    for (let b = a + 1; b < N; b++) {
      if (lt[a] & (1 << b) || lt[b] & (1 << a)) continue;
      pairs.push([
        a,
        b,
        Math.abs(popcount(lt[a]) - popcount(lt[b])) + Math.abs(popcount(up[a]) - popcount(up[b])),
      ]);
    }
  }
  if (pairs.length === 0) return { code: 3 };
  pairs.sort((x, y) => x[2] - y[2]);
  const e = countExtFast(N, lt, up);
  let maxMin = 0;
  for (const [a, b] of pairs) {
    const lt2 = lt.slice();
    const add = lt2[a] | (1 << a);
    lt2[b] |= add;
    for (let j = 0; j < N; j++) if (up[b] & (1 << j)) lt2[j] |= add;
    const eab = countExtFast(N, lt2, upSetsOf(N, lt2));
    const minSide = Math.min(eab, e - eab);
    if (minSide > maxMin) maxMin = minSide;
    if (3 * minSide > e) return { code: 0 };
  }
  return { code: 3 * maxMin === e ? 1 : 2, e, maxMin };
}

self.onmessage = (ev: MessageEvent) => {
  const { bases, reportEvery } = ev.data as { bases: number[][]; reportEvery: number };
  let candidates = 0;
  let fullScans = 0;
  const extremal: number[][] = [];
  const belowPosets: number[][] = [];
  let sinceReport = 0;

  for (const lt9 of bases) {
    for (const D of downsetsOf(9, lt9)) {
      const lt10 = [...lt9, D];
      for (const D2 of downsetsOf(10, lt10)) {
        const lt11 = [...lt10, D2];
        candidates++;
        sinceReport++;
        const r = verify(lt11);
        if (r.code === 1) {
          fullScans++;
          extremal.push(lt11);
        } else if (r.code === 2) {
          fullScans++;
          belowPosets.push(lt11);
        }
        if (sinceReport >= reportEvery) {
          sinceReport = 0;
          postMessage({ type: "progress", candidates });
        }
      }
    }
  }
  postMessage({ type: "done", candidates, fullScans, extremal, belowPosets });
};
