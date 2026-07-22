// Iteration 5 — the biomimetic wing. Two nature-inspired framings with real
// mathematical teeth, implemented as engines:
//
// (L) THERMODYNAMICS. Treat log2(n) as energy: odd T-steps inject
//     log2(3)-1 bits, even steps dissipate 1 bit. A divergent orbit is a
//     permanent second-law violation, and large-deviation theory prices the
//     violation: sustaining odd-fraction θ = log2/log3 costs entropy at
//     asymptotic rate 1 - H(θ) bits/step (H = binary entropy). This is a
//     PREDICTION testable against exact combinatorics: the uncovered tail
//     u(k) of Path C must decay at exactly that rate as k → ∞.
//
// (M) NATURAL SELECTION. Evolve seeds under fitness = "how many T-steps can
//     the orbit sustain the divergence-required bias?" — an adversarial
//     search with no knowledge of number theory. Prediction: selection
//     rediscovers the 2-adic persistence patterns (trailing-ones tails, the
//     −5 motif) that iterations 3–4 proved are the only mimics — and proved
//     mortal. A deterministic xorshift PRNG keeps runs reproducible.

export const THETA = Math.log(2) / Math.log(3);

export function binaryEntropy(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
}

/** The thermodynamic prediction: asymptotic decay rate of the uncovered tail. */
export const LD_RATE = 1 - binaryEntropy(THETA);

export interface ThermoRow {
  k: number;
  aMin: number;
  log2u: number;
  measuredRate: number;
}

/** Exact uncovered-tail decay (BigInt binomials) vs the entropy prediction. */
export function thermoTable(ks: number[]): ThermoRow[] {
  return ks.map((k) => {
    let aMin = 0;
    let p3 = 1n;
    const p2 = 1n << BigInt(k);
    while (p3 < p2) {
      p3 *= 3n;
      aMin++;
    }
    let tail = 0n;
    let c = 1n;
    for (let a = 0; a <= k; a++) {
      if (a >= aMin) tail += c;
      c = (c * BigInt(k - a)) / BigInt(a + 1);
    }
    const log2u = tail === 0n ? -Infinity : tail.toString(2).length - 1 - k;
    return { k, aMin, log2u, measuredRate: -log2u / k };
  });
}

// --------------------------------------------------------------------------
// (M) the evolutionary adversary
// --------------------------------------------------------------------------

export interface GAResult {
  history: { gen: number; best: number }[];
  bestFitness: number;
  bestSuffixBits: string;
  trailingOnes: number;
  /** champion's true hold, re-measured post-hoc with a huge cap */
  trueHold: number;
  trueHoldCapped: boolean;
  championOddFrac: number;
}

function makeRng(seed: number) {
  let s = seed >>> 0 || 0x9e3779b9;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0x100000000;
  };
}

/** Fitness: T-steps the orbit of (1<<bits | genome, forced odd) holds o/t ≥ θ. */
export function biasHold(
  genome: bigint,
  bits: number,
  cap: number,
): { hold: number; capped: boolean; oddFrac: number } {
  let x = (1n << BigInt(bits)) | genome | 1n;
  let odd = 0;
  let t = 0;
  let hold = 0;
  let holdOdd = 0;
  while (t < cap && x !== 1n) {
    if (x % 2n === 1n) {
      odd++;
      x = (3n * x + 1n) / 2n;
    } else {
      x = x / 2n;
    }
    t++;
    if (odd >= THETA * t) {
      hold = t;
      holdOdd = odd;
    } else break;
  }
  return { hold, capped: t >= cap, oddFrac: hold > 0 ? holdOdd / hold : 0 };
}

export function evolveAdversary(opts: {
  bits: number;
  population: number;
  generations: number;
  seed: number;
  /** fitness-evaluation window during evolution */
  evalCap?: number;
  /** post-hoc window for the champion's true hold */
  measureCap?: number;
}): GAResult {
  const { bits, population, generations, seed } = opts;
  const evalCap = opts.evalCap ?? bits * 8;
  const measureCap = opts.measureCap ?? 50000;
  const rng = makeRng(seed);
  const randGenome = () => {
    let g = 0n;
    for (let i = 0; i < bits; i += 16) g = (g << 16n) | BigInt(Math.floor(rng() * 65536));
    return g & ((1n << BigInt(bits)) - 1n);
  };
  let pop = Array.from({ length: population }, randGenome);
  const history: { gen: number; best: number }[] = [];
  let best = pop[0];
  let bestF = -1;

  for (let gen = 0; gen <= generations; gen++) {
    const scored = pop
      .map((g) => ({ g, f: biasHold(g, bits, evalCap).hold }))
      .sort((a, b) => b.f - a.f);
    if (scored[0].f > bestF) {
      bestF = scored[0].f;
      best = scored[0].g;
    }
    if (gen % Math.max(1, Math.floor(generations / 6)) === 0 || gen === generations) {
      history.push({ gen, best: scored[0].f });
    }
    // tournament + elitism + mutation/crossover
    const next: bigint[] = scored.slice(0, Math.max(2, population >> 3)).map((s) => s.g);
    while (next.length < population) {
      const pick = () => {
        const a = scored[Math.floor(rng() * scored.length)];
        const b = scored[Math.floor(rng() * scored.length)];
        return a.f >= b.f ? a.g : b.g;
      };
      let child: bigint;
      if (rng() < 0.5) {
        const cut = BigInt(1 + Math.floor(rng() * (bits - 1)));
        const mask = (1n << cut) - 1n;
        child = (pick() & mask) | (pick() & ~mask);
      } else {
        child = pick();
      }
      const flips = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < flips; i++) child ^= 1n << BigInt(Math.floor(rng() * bits));
      next.push(child & ((1n << BigInt(bits)) - 1n));
    }
    pop = next;
  }

  const suffix = (best & ((1n << 32n) - 1n)).toString(2).padStart(32, "0");
  let trailing = 0;
  const full = (best | 1n).toString(2);
  for (let i = full.length - 1; i >= 0 && full[i] === "1"; i--) trailing++;
  const champ = biasHold(best, bits, measureCap);
  return {
    history,
    bestFitness: bestF,
    bestSuffixBits: suffix,
    trailingOnes: trailing,
    trueHold: champ.hold,
    trueHoldCapped: champ.capped,
    championOddFrac: champ.oddFrac,
  };
}
