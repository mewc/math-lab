// Exhaustive, exact-integer verifier for the counterexample to Goemans'
// unsplittable-flow COST conjecture (the cost strengthening of the
// Dinitz–Garg–Goemans theorem). Run: `bun run research/dgg-counterexample.ts`.
//
// The conjecture (Conjecture 1.3 in the SSUF literature): for a single-source
// fractional flow x with demands d_i and D = max_i d_i, there is an UNSPLITTABLE
// routing y that simultaneously satisfies
//     (congestion)  y_a <= x_a + D           for every arc a      -- this half is the PROVEN DGG theorem
//     (cost)        c^T y <= c^T x           for every nonneg cost c  -- the OPEN conjecture (Goemans)
//
// This instance exhibits an x, c for which every congestion-good unsplittable
// routing costs strictly more than c^T x. Everything is integer arithmetic; the
// path system is closed (exactly two s->t_i paths per terminal, no splice
// hybrids), so enumerating all 2^3 = 8 routings is exhaustive.

type Arc = "s>t1" | "s>t2" | "s>u" | "u>t3" | "u>v" | "v>t1" | "v>w" | "w>t2" | "w>t3";

const ARCS: Arc[] = ["s>t1", "s>t2", "s>u", "u>t3", "u>v", "v>t1", "v>w", "w>t2", "w>t3"];

// fractional load x_a and per-unit cost c_a
const x: Record<Arc, number> = { "s>t1": 10, "s>t2": 6, "s>u": 24, "u>t3": 10, "u>v": 14, "v>t1": 5, "v>w": 9, "w>t2": 4, "w>t3": 5 };
const c: Record<Arc, number> = { "s>t1": 2, "s>t2": 3, "s>u": 0, "u>t3": 2, "u>v": 0, "v>t1": 0, "v>w": 0, "w>t2": 0, "w>t3": 0 };

const d = { t1: 15, t2: 10, t3: 15 };
const D = Math.max(d.t1, d.t2, d.t3); // = 15

// The (only) two s->t_i paths per terminal. E_i = cheap-but-direct, Z_i = zero-cost detour.
const paths: Record<string, Record<"E" | "Z", Arc[]>> = {
  t1: { E: ["s>t1"], Z: ["s>u", "u>v", "v>t1"] },
  t2: { E: ["s>t2"], Z: ["s>u", "u>v", "v>w", "w>t2"] },
  t3: { E: ["u>t3", "s>u"], Z: ["s>u", "u>v", "v>w", "w>t3"] }, // note: BOTH t3 paths use s>u
};

// sanity: the fractional flow x must be a genuine feasible flow.
// decomposition: t1 = 10*E1 + 5*Z1, t2 = 6*E2 + 4*Z2, t3 = 10*E3 + 5*Z3
const fracSplit = { t1: { E: 10, Z: 5 }, t2: { E: 6, Z: 4 }, t3: { E: 10, Z: 5 } };
const rebuilt: Record<Arc, number> = Object.fromEntries(ARCS.map((a) => [a, 0])) as Record<Arc, number>;
for (const t of ["t1", "t2", "t3"] as const) {
  for (const choice of ["E", "Z"] as const) {
    for (const a of paths[t][choice]) rebuilt[a] += fracSplit[t][choice];
  }
}
for (const a of ARCS) {
  if (rebuilt[a] !== x[a]) throw new Error(`fractional flow mismatch on ${a}: rebuilt ${rebuilt[a]} != x ${x[a]}`);
}
const fracCost = ARCS.reduce((s, a) => s + c[a] * x[a], 0);
console.log(`Fractional flow x is feasible.  c^T x = ${fracCost}`);
console.log(`Demands d = (${d.t1}, ${d.t2}, ${d.t3}),  D = d_max = ${D}\n`);

// enumerate all 8 unsplittable routings
type Choice = "E" | "Z";
let bestGoodCost = Infinity;
const rows: string[] = [];
for (const q1 of ["E", "Z"] as Choice[]) {
  for (const q2 of ["E", "Z"] as Choice[]) {
    for (const q3 of ["E", "Z"] as Choice[]) {
      const load: Record<Arc, number> = Object.fromEntries(ARCS.map((a) => [a, 0])) as Record<Arc, number>;
      const pick = { t1: q1, t2: q2, t3: q3 } as const;
      for (const t of ["t1", "t2", "t3"] as const) {
        for (const a of paths[t][pick[t]]) load[a] += d[t];
      }
      const cost = ARCS.reduce((s, a) => s + c[a] * load[a], 0);
      // congestion-good iff y_a <= x_a + D on every arc
      const violated = ARCS.filter((a) => load[a] > x[a] + D);
      const good = violated.length === 0;
      if (good) bestGoodCost = Math.min(bestGoodCost, cost);
      const status = good ? "GOOD" : `bad on ${violated.map((a) => `${a} (${load[a]}>${x[a] + D})`).join(", ")}`;
      rows.push(`  ${q1} ${q2} ${q3}   cost ${String(cost).padStart(2)}   ${status}`);
    }
  }
}
console.log("routing  t1 t2 t3   cost   congestion (y_a <= x_a + D ?)");
for (const r of rows) console.log(r);

console.log(`\nCheapest congestion-good unsplittable routing: cost = ${bestGoodCost}`);
console.log(`Fractional cost                              : c^T x = ${fracCost}`);
if (bestGoodCost > fracCost) {
  console.log(`\n*** COUNTEREXAMPLE CONFIRMED ***  min good cost ${bestGoodCost} > ${fracCost} = c^T x`);
  console.log(`The cost conjecture demands a congestion-good routing with cost <= ${fracCost}; none exists.`);
} else {
  throw new Error("no separation — the instance does NOT refute the conjecture");
}
