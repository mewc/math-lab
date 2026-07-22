# Math Lab research log — 1/3–2/3 conjecture campaign

Ground rules (inherited from Collatz Lab): no fabricated steps, dead ends are
logged as results, corrections stay on the record. All mathematical claims are
computed in exact BigInt arithmetic; comparisons against 1/3 are done by
cross-multiplication, never floating point.

Machinery: `lib/poset.ts` — posets as bitmask relations, linear-extension
counting via DP over order ideals (O(2^n·n)), pair probabilities by counting
extensions of the pair-augmented poset, isomorphism-dedup via WL-style
refinement + class-respecting permutation canonicalization, enumeration by
maximal-element extension over order ideals.

## Iteration 1 — exhaustive sweep, n ≤ 9 (2026-07-22)

`research/iteration1.ts` → `research/results-iteration1.json`

- Enumerated every poset up to isomorphism on n = 3…9. Census matched OEIS
  A000112 at every size (5, 16, 63, 318, 2045, 16999, 183231) — the
  self-check that the enumerator drops/duplicates nothing. First run at n = 9
  actually *failed* on this check purely because our anchor array ended at
  n = 8; the computed count 183231 was already correct. Kept on the record as
  a reminder that the check fires.
- For each of the 202,670 non-chain posets, computed b(P) = max over
  incomparable pairs of min(P(x<y), P(y<x)) exactly.
- **Verdict: zero posets below 1/3.** The conjecture holds exactly on all
  posets with at most 9 elements. (Independent reproduction — Peczarski's
  published computations already cover ≤ 11 elements; ours adds the full
  spectrum and extremal census, checked in as data.)
- Minimum balance is exactly 1/3 at every size; number of extremal posets:
  1, 2, 3, 5, 8, 12, 18 for n = 3…9. (Could not check this census sequence
  against OEIS — network policy blocks oeis.org from this environment. Open
  loose end.)
- Runner-up balance (smallest value > 1/3) decreases: 1/2 (n=3), 2/5, 4/11,
  5/14, 5/14, 16/45, 6/17 (n=9) ≈ 0.353. Empirical suggestion: balance values
  accumulate at 1/3 from above. Not proved, rate unknown.
- Runtime: ~51 s total in Bun (n = 9 alone ~47 s; canonicalization dominates).

## Iteration 2 — extremal landscape + sampling (2026-07-22)

`research/iteration2.ts`

- **A. Hook family.** H(k) = chain c₁<…<c_k with feet x<c₁, y<c₂ (H(1) = the
  3-element 1+2 poset). Computed b(H(k)) exactly for k = 1…12 (up to 14
  elements): **exactly 1/3 every time**, always at pair (x,y). So the
  conjectured bound is tight at every size, witnessed by one explicit family.
  Exact for k ≤ 12; conjecture beyond. Likely known in the literature — no
  novelty claimed.
- **B. Seed check.** Every one of the 31 exactly-1/3 posets on ≤ 8 elements
  has, at its extremal pair (x,y), a third element comparable to exactly one
  of x, y — i.e. an induced 1+2 pattern seeded at the extremal pair. 31/31.
  Extended same day to n = 9 (`BMAX=9`): 49/49 including the 18 extremal
  posets at n = 9.
- **C. Sampling.** 8,000 random posets on n = 10…13 (random-DAG closure model
  at mixed densities + random unit-interval semiorders; xorshift32 seed
  0x9e3779b9, reproducible). Exact balance per sample: **none below 1/3**;
  minima seen were exactly 1/3 at every n. Evidence, not proof.
- Sanity anchor: 2+2 poset → 6 extensions, balance 1/2 — matches hand
  computation.

## Loose ends / next iterations

- Identify the extremal census sequence 1,2,3,5,8,12,18 (OEIS check needs a
  network-unrestricted environment).
- Prove b(H(k)) = 1/3 by induction on extension counts — looks like a
  tractable exercise; check literature first (Brightwell's 1999 survey).
- n = 10 exhaustive (2,567,284 posets) — feasible but ~10–15 min with current
  canonicalizer; optimize before attempting.
- The runner-up accumulation question: is inf{b(P) : b(P) > 1/3} = 1/3 over
  all finite posets? Our data suggests yes; find or construct a family with
  balance → 1/3 strictly from above.
