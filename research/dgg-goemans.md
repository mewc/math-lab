# Goemans' unsplittable-flow cost conjecture — solved by counterexample

Companion log for the registry entry `goemans-unsplittable-flow`. Ground rules
(inherited from the rest of the lab): no fabricated steps, dead ends stay on the
record, every numeric claim is exact-integer and machine-checkable.

## The statement

Single-source unsplittable flow (SSUF). A source `s` must route integer demands
`d_i` to terminals `t_i`, each terminal's whole demand on **one** `s→t_i` path.
Let `x` be a fractional flow meeting the demands, and `D = max_i d_i`.

- **Congestion (proven — Dinitz–Garg–Goemans 1999):** there is always an
  unsplittable routing `y` with `y_a ≤ x_a + D` on every arc `a`.
- **Cost (Goemans' conjecture, Conjecture 1.3):** that routing can be chosen to
  *simultaneously* satisfy `cᵀy ≤ cᵀx` for every nonnegative cost `c`.

The conjecture is the **simultaneous** guarantee. This log records its disproof.

## What did not work (iterations 1–3)

- **Abstract cube / hypercube gadgets.** Set-systems where every integral
  selection overloads a resource look like clean counterexamples abstractly, but
  once realized as a graph they acquire *hybrid* paths (prefix/suffix splices).
  Exact separation then returns δ = 0. Figure-1 cube: 38 arcs, 162 support paths
  per terminal, 442,368 congestion-good routings, δ = 0.
- **False positives from partial LPs.** A five-terminal probe showed a restricted
  separation LP value δ ≈ 0.152; after exact mixed-integer pricing generated all
  621 relevant routing columns, |δ| < 5·10⁻¹⁴. Lesson: only an *exhaustive* or
  exact-pricing certificate counts.
- **Three-gate no-go.** With 3 demands and 3 gates, the +D slack provably cannot
  force one demand per gate (summing `x_i + D < d_2 + d_3` gives `2D < d_2 + d_3`,
  impossible). At least one gate carries two demands — the hybrid repair route.
- **Necessary conditions established:** any counterexample must be
  non-series-parallel, use unequal demands, put cost on the fractional support
  (not only off-support arcs), and survive both suffix splicing and source-prefix
  borrowing.

## What worked (iteration 4)

Stop deleting hybrid paths; make the +D capacity bound itself forbid the cheap
routings. Keep the path system **splice-closed and tiny** — two paths per
terminal, no hidden hybrids.

Instance: `V = {s,u,v,w,t₁,t₂,t₃}`, demands `d = (15,10,15)`, `D = 15`. Each
terminal has a cheap direct path `Eᵢ` (per-unit cost, total 30) and a zero-cost
detour `Zᵢ` down a shared spine `s→u→v→w`:

| terminal | direct `Eᵢ` (cost 30) | detour `Zᵢ` (cost 0) |
|---|---|---|
| t₁ | s→t₁ | s→u→v→t₁ |
| t₂ | s→t₂ | s→u→v→w→t₂ |
| t₃ | s→u→t₃ | s→u→v→w→t₃ |

The three detours are pairwise capacity-incompatible under +D:
`Z₂+Z₃` overload `v→w` (25 > 24), `Z₁+Z₃` overload `u→v` (30 > 29), `Z₁+Z₂`
overload `s→u` (40 > 39). So every congestion-good routing uses **at most one**
detour ⇒ at least two direct paths ⇒ cost ≥ 60, while `cᵀx = 58`.

Why it is structural, not a numerical fluke: the `Zᵢ` form the stable-set system
of a triangle with selection probabilities `1/3 + 2/5 + 1/3 = 16/15 > 1`. Every
good integral routing satisfies `z₁+z₂+z₃ ≤ 1`; the fractional point violates it,
and the `E`-costs are exactly the nonnegative complementary separator. The graph
is a subdivision of `K₄` — planar (so it also breaks the exact-D bound *for
planar graphs*, consistent with the proven planar 2D guarantee) but **not**
series-parallel, which is precisely why it escapes the series-parallel positive
result.

## Verify it

```
bun run research/dgg-counterexample.ts
```

Rebuilds `x` from its path decomposition (feasibility check), enumerates all
`2³ = 8` unsplittable routings in exact integers, prints the congestion table,
and asserts `min good cost = 60 > 58 = cᵀx`. Exhaustive: two paths per terminal
means the 8-routing table is the whole universe — no splice hybrids exist.

## Caveat kept on the record

As of Jan-2026 sources the cost conjecture was still listed **open**. This is a
self-contained, exhaustive certificate — not yet a literature-confirmed theorem.
It should be independently audited before being cited as settled.

## Jump in — a ready-to-paste prompt

Want to push on this (shrink the certificate, or attack the still-open planar
2D→D gap and the series-parallel-to-general frontier)? Paste this to a strong
reasoning model, with the SSUF paper attached:

> You are attacking the single-source unsplittable-flow (SSUF) **cost**
> conjecture (Goemans / Dinitz–Garg–Goemans, Conjecture 1.3): for a fractional
> flow `x` with demands `d_i`, `D = max d_i`, there is an unsplittable routing
> `y` with `y_a ≤ x_a + D` on every arc **and** `cᵀy ≤ cᵀx` for every
> nonnegative cost `c`. A planar 7-vertex counterexample already exists (demands
> 15,10,15; a K₄ subdivision; three zero-cost detours down a shared spine that
> are pairwise capacity-incompatible, forcing ≥2 cost-30 direct paths, so min
> good cost 60 > 58). Do **one** of:
> (a) find a strictly smaller counterexample (fewer vertices/arcs/demands, or
>     smaller integer separation) and give a finite exact-integer certificate;
> (b) determine whether the exact-D cost bound can still hold on **series-parallel**
>     digraphs (a positive result is known there) — prove or refute at that boundary;
> (c) close the planar gap between the proven 2D guarantee and the D bound this
>     example breaks.
> Rules: no floating point in the certificate; enumerate or exact-price **all**
> routings (partial LPs give spurious positives); a path system is only valid if
> it is splice-closed (every prefix/suffix concatenation that is a directed s→t
> path is counted). Deliver a machine-checkable instance `(G, d, x, c)` and a
> verifier, or an honest no-go with the obstruction named.

If you produce a new certificate, drop a verifier next to
`research/dgg-counterexample.ts`, add a dated note to the registry entry, and
keep dead ends on the record.
