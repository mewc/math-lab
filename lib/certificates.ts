// Iteration 1 of the joint research log: the modular Lyapunov certificate
// family, decided rigorously.
//
// Candidate proof shape: a potential  φ(n) = log2(n) + w(n mod 2^k)  that
// strictly decreases along every step of the accelerated map T (odd n →
// (3n+1)/2, even n → n/2) for every positive integer n. If such a w exists
// for ANY k, the conjecture follows by descent.
//
// Deciding the family: along any directed cycle r_0 → r_1 → … → r_L = r_0 in
// the congruence graph G_k of T on Z/2^k, the w-terms telescope to zero, so a
// valid w forces the summed log-multiplier of every cycle to be negative
// (each odd edge contributes log2(3/2), each even edge −1). Conversely,
// standard shortest-path theory (Bellman–Ford feasibility) supplies a valid w
// whenever all cycle sums are negative. So:
//
//     the family is non-empty  ⇔  G_k has no cycle of nonnegative weight.
//
// This module PROVES the family empty, at every modulus, by exhibiting
// explicit positive-weight cycles in G_k and machine-verifying them edge by
// edge. The witnesses are the shadows of the three rational T-cycles at
// x = −1, −5, −17 (equivalently, the known cycles of 3n−1 / of Collatz on
// negative integers): each is a genuine cycle of G_k for every k, with
// positive mean log-multiplier. The obstruction is structural — finite-
// modulus arithmetic cannot see the sign of the domain, which is exactly the
// §6 no-go filter materializing as a dead certificate family.

export interface EdgeStep {
  from: bigint;
  to: bigint;
  parity: "odd" | "even";
  /** true if `to` is one of the two lawful successors of `from` in G_k */
  lawful: boolean;
}

export interface CycleWitness {
  name: string;
  seed: bigint; // the rational (negative-integer) T-fixed cycle it shadows
  k: number;
  residues: bigint[];
  steps: EdgeStep[];
  closes: boolean;
  allEdgesLawful: boolean;
  oddSteps: number;
  length: number;
  /** cycle mean in bits/step: (odd·log2(3) − length) / length  — positive ⇒ obstruction */
  meanBits: number;
  /** exact positivity check: 3^odd > 2^length, in BigInt */
  provablyPositive: boolean;
}

/** The two lawful successors of residue r in G_k (all lifts of r step to one of these). */
export function successors(r: bigint, k: number): [bigint, bigint] {
  const m = 1n << BigInt(k);
  const half = 1n << BigInt(k - 1);
  if (r % 2n === 1n) {
    const base = ((3n * r + 1n) / 2n) % m;
    return [base, (base + half) % m];
  }
  const base = r / 2n;
  return [base, (base + half) % m];
}

function tStep(x: bigint): bigint {
  return x % 2n === 0n ? x / 2n : (3n * x + 1n) / 2n;
}

const mod = (x: bigint, m: bigint) => ((x % m) + m) % m;

/**
 * Follow the rational T-cycle through `seed` (a negative integer with a
 * finite T-cycle), project it into Z/2^k, and machine-verify that every
 * projected step is a lawful edge of G_k and that the cycle closes.
 */
export function witnessCycle(name: string, seed: bigint, k: number, maxLen = 64): CycleWitness {
  const m = 1n << BigInt(k);
  const residues: bigint[] = [];
  const steps: EdgeStep[] = [];
  let x = seed;
  let odd = 0;
  for (let i = 0; i < maxLen; i++) {
    const r = mod(x, m);
    residues.push(r);
    const parity: "odd" | "even" = x % 2n === 0n ? "even" : "odd";
    if (parity === "odd") odd++;
    const nx = tStep(x);
    const nr = mod(nx, m);
    const [s0, s1] = successors(r, k);
    steps.push({ from: r, to: nr, parity, lawful: nr === s0 || nr === s1 });
    x = nx;
    if (x === seed) break;
  }
  const closes = x === seed;
  const length = steps.length;
  const allEdgesLawful = steps.every((s) => s.lawful);
  const meanBits = (odd * Math.log2(3) - length) / length;
  const provablyPositive = 3n ** BigInt(odd) > 1n << BigInt(length);
  return {
    name,
    seed,
    k,
    residues,
    steps,
    closes,
    allEdgesLawful,
    oddSteps: odd,
    length,
    meanBits,
    provablyPositive,
  };
}

export interface Iteration1Result {
  k: number;
  witnesses: CycleWitness[];
  /** every witness closes, is edge-lawful, and is exactly-positive */
  familyProvedEmpty: boolean;
}

/** Decide the modular-Lyapunov family at modulus 2^k. */
export function decideCertificateFamily(k: number): Iteration1Result {
  const witnesses = [
    witnessCycle("shadow of x = −1 (the T-fixed point; all-odd loop)", -1n, k),
    witnessCycle("shadow of the −5 cycle (parity 1,1,0)", -5n, k),
    witnessCycle("shadow of the −17 cycle (7 odd / 4 even in 11 steps)", -17n, k),
  ];
  const familyProvedEmpty = witnesses.every((w) => w.closes && w.allEdgesLawful && w.provablyPositive);
  return { k, witnesses, familyProvedEmpty };
}
