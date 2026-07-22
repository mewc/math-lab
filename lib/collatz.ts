// Core Collatz machinery. Everything is BigInt so arbitrarily large inputs
// (way past Number.MAX_SAFE_INTEGER) compute exactly — a hard requirement,
// since trajectories routinely overshoot 2^53 even for small seeds.

export type Parity = "even" | "odd";

export interface Step {
  index: number;
  value: bigint;
  parity: Parity;
  /** log2 of the value, for chart scaling (approximate, safe for huge bigints) */
  log2: number;
}

export interface TrajectoryResult {
  steps: Step[];
  /** true if the orbit reached 1 within the step cap */
  reachedOne: boolean;
  /** true if a cycle other than 1 → 4 → 2 was detected (variants only) */
  cycle: bigint[] | null;
  /** true if the orbit exceeded the value ceiling (presumed divergent) */
  overflowed: boolean;
  /** number of steps applied (edges, not vertices) */
  totalStoppingTime: number | null;
  /** first index k with T^k(n) < n — Terras' "stopping time" */
  stoppingTime: number | null;
  peak: bigint;
  peakIndex: number;
  oddSteps: number;
  evenSteps: number;
}

/** Approximate log2 of a BigInt without precision loss for chart purposes. */
export function bigLog2(n: bigint): number {
  if (n <= 0n) return 0;
  const s = n.toString(2);
  // leading "1." plus next 52 bits is plenty of mantissa
  const head = s.slice(0, 53);
  return s.length - head.length + Math.log2(Number(BigInt("0b" + head)));
}

export interface VariantSpec {
  /** odd rule: n -> mult*n + add */
  mult: bigint;
  add: bigint;
  label: string;
}

export const VARIANTS: Record<string, VariantSpec> = {
  "3n+1": { mult: 3n, add: 1n, label: "3n + 1 (Collatz)" },
  "3n-1": { mult: 3n, add: -1n, label: "3n − 1 (known cycles)" },
  "5n+1": { mult: 5n, add: 1n, label: "5n + 1 (presumed divergence)" },
};

const VALUE_CEILING = 1n << 4096n; // ~10^1233 — beyond this we call it divergent

export function trajectory(
  n: bigint,
  opts: { maxSteps?: number; variant?: VariantSpec } = {},
): TrajectoryResult {
  const maxSteps = opts.maxSteps ?? 3000;
  const v = opts.variant ?? VARIANTS["3n+1"];
  const start = n;
  const steps: Step[] = [];
  const seen = new Map<string, number>();

  let cur = n;
  let peak = n;
  let peakIndex = 0;
  let oddSteps = 0;
  let evenSteps = 0;
  let stoppingTime: number | null = null;
  let cycle: bigint[] | null = null;
  let reachedOne = false;
  let overflowed = false;

  for (let i = 0; ; i++) {
    steps.push({
      index: i,
      value: cur,
      parity: cur % 2n === 0n ? "even" : "odd",
      log2: bigLog2(cur),
    });
    if (cur > peak) {
      peak = cur;
      peakIndex = i;
    }
    if (stoppingTime === null && i > 0 && cur < start) stoppingTime = i;
    if (cur === 1n) {
      reachedOne = true;
      break;
    }
    if (i >= maxSteps) break;
    if (cur > VALUE_CEILING) {
      overflowed = true;
      break;
    }
    const key = cur.toString();
    const prev = seen.get(key);
    if (prev !== undefined) {
      cycle = steps.slice(prev, i).map((s) => s.value);
      break;
    }
    seen.set(key, i);

    if (cur % 2n === 0n) {
      cur = cur / 2n;
      evenSteps++;
    } else {
      cur = v.mult * cur + v.add;
      oddSteps++;
    }
  }

  return {
    steps,
    reachedOne,
    cycle,
    overflowed,
    totalStoppingTime: reachedOne ? steps.length - 1 : null,
    stoppingTime,
    peak,
    peakIndex,
    oddSteps,
    evenSteps,
  };
}

/**
 * Fast total-stopping-time for small n using plain numbers with a shared memo.
 * Values stay exact: intermediate peaks for n ≤ 10^5 are far below 2^53.
 */
export function totalStoppingTimes(limit: number): Int32Array {
  const out = new Int32Array(limit + 1).fill(-1);
  if (limit >= 1) out[1] = 0;
  for (let n = 2; n <= limit; n++) {
    let x = n;
    let steps = 0;
    // walk until we hit a memoized value or 1
    while (x !== 1 && (x > limit || out[x] === -1)) {
      x = x % 2 === 0 ? x / 2 : 3 * x + 1;
      steps++;
      if (steps > 3000) break; // unreachable for this range; safety only
    }
    out[n] = steps + (x === 1 ? 0 : out[x]);
  }
  return out;
}

/** Records: n whose total stopping time exceeds all smaller n. */
export function stoppingTimeRecords(times: Int32Array): number[] {
  const recs: number[] = [];
  let best = -1;
  for (let n = 1; n < times.length; n++) {
    if (times[n] > best) {
      best = times[n];
      recs.push(n);
    }
  }
  return recs;
}

export function formatBig(n: bigint): string {
  const s = n.toString();
  if (s.length <= 21) return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${s[0]}.${s.slice(1, 5)}…e${s.length - 1} (${s.length} digits)`;
}
