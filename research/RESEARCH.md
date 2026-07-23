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

## Iteration 3 — proof of H(k), extremal anatomy, runner-up posets (2026-07-22)

`research/iteration3.ts`

- **THEOREM (in-house, elementary).** b(H(k)) = 1/3 for every k ≥ 1.
  *Proof.* In any linear extension of H(k), the elements {x, c₁, …, c_k} are
  forced into the order x, c₁, …, c_k (x precedes c₁; the chain is rigid). An
  extension is therefore determined by where y is inserted, and y must precede
  c₂ — leaving exactly three slots: before x, between x and c₁, between c₁ and
  c₂. So e(H(k)) = 3 for every k. The only incomparable pairs are (x, y) and
  (y, c₁); each realizes its minority order in exactly one of the three slots,
  so both sit at exactly 1/3, and b(H(k)) = max(1/3, 1/3) = 1/3. ∎
  Machine cross-check: extension count, incomparable-pair list, and per-pair
  fractions verified exactly for k = 1…12. (Elementary; very likely known.)
- **Extremal anatomy.** All 49 exactly-1/3 posets on ≤ 9 elements have
  (a) e(P) a power of 3, and (b) EVERY incomparable pair at exactly 1/3 —
  no pair sits below. 49/49 on both counts. The extremal class is "totally
  balanced".
- **Runner-up posets recovered.** n=4: the N poset (e=5, b=2/5). Writing each
  runner-up as b = 1/3 + 1/(3d): d = 5, 11, 14, 15, 17 for n = 4,5,6,8,9
  (n=7 repeats n=6's 5/14). Slowly increasing — the accumulation signal.

## Iteration 5 — family probes for the accumulation question (2026-07-22)

`research/iteration5.ts` — three parametric families, all exact. Negative
results, logged as results:

- TWOHOOK(g) (two hooks separated by a g-chain): g=2 gives 2/5; g ≥ 3 gives
  **exactly 1/3 with e = 9** — two decoupled hooks stack into an extremal
  tower. Confirms the 3^m structure; does not approach 1/3 from above.
- NTOP(k) (N + chain on top): b = (k+2)/(2k+5) → **1/2**. Runs away.
- NLADDER(k) (N core + parallel chains + cap): oscillates toward ~1/2.
- Conclusion: the true runner-up posets are subtler than these shapes; the
  accumulation question needs the exhaustive runner-up at n = 10
  (iteration 6) rather than guessed families.

## Iteration 4 — exhaustive verification at n = 10 (2026-07-22)

`research/iteration4.ts`

- Scale redesign: no isomorphism dedup (every 10-element poset arises by
  attaching a maximal element over an order ideal of a 9-element poset —
  peel argument — so sweeping all (base, ideal) candidates covers everything,
  with multiplicity); exact arithmetic on plain doubles (extension counts
  ≤ 10! = 3,628,800 < 2^53); early exit per poset at the first pair strictly
  above 1/3, structurally-similar pairs tried first.
- 8,070,524 candidates covering all A000112(10) = 2,567,284 posets, 262 s.
- **Verdict: zero posets below 1/3 — the conjecture is verified exhaustively
  for all posets with at most 10 elements.**
- Extremal census at n = 10: **27** (deduped canonically from 45 full-scan
  hits) — exactly matching iteration 7's independent prediction. Extension
  counts of the 27: e ∈ {3, 9, 27} — towers of 1, 2, 3 hooks.

## Iteration 6 — the runner-up at n = 10 (2026-07-22)

`research/iteration6.ts`

- Same candidate generation, slacked early exit (skip only past b > 11/30),
  full scan below the slack — the minimum positive gap found is exact for any
  balance below 11/30. 269 s; 165 full scans; below-1/3 count 0 (independent
  re-confirmation of iteration 4's verdict).
- **Runner-up at n = 10: b = 37/106 ≈ 0.3490566**, gap 5/318, achieved by a
  single poset up to isomorphism:
  {0<2 0<3 1<3 2<4 2<5 3<5 3<6 4<6 4<7 5<7 6<8 6<9 7<9} — an intricate
  braided double-chain; no clean family we tried produces it.
- Runner-up sequence now: 2/5, 4/11, 5/14, 5/14, 16/45, 6/17, 37/106 —
  seven consecutive decreases; gaps 1/15, 1/33, 1/42, 1/45, 1/51, 5/318.
  The accumulation-at-1/3 signal strengthens; still no proof.

## Iteration 7 — the extremal class is self-generating (2026-07-22)

`research/iteration7.ts`

- Grew the extremal class level-by-level from the single seed 1+2 (n=3),
  extending each extremal poset by one new element in every consistent
  (downset, upset) position and keeping exactly-1/3 results.
- **Counts match the exhaustive census at every verified level**: 1, 2, 3, 5,
  8, 12, 18 for n = 3…9. So on the verified range, every extremal poset is a
  one-element extension of a smaller extremal poset — no orphans.
- **Prediction: 27 extremal posets at n = 10**, with e ∈ {3, 9, 27} (towers
  of 1, 2, 3 hooks) — **CONFIRMED by iteration 4's independent exhaustive
  sweep** (27 on the nose; two different methods, same answer).
- Extended growth (closure assumed beyond the verified range): **40 at
  n = 11** (e-dist 3×9, 9×21, 27×10) and **59 at n = 12** (3×10, 9×28,
  27×20, 81×1 — the first four-hook tower).
- **Correction, on the record.** First guess for the census law was A000792
  (from memory; OEIS unreachable), predicting 39 and 57 at n = 11, 12. The
  machine grew 40 and 59 — guess falsified same-day. What fits every
  computed point instead: the census differences 1, 1, 2, 3, 4, 6, 9, 13, 19
  satisfy **d(k) = d(k−1) + d(k−3)** — the recurrence counting compositions
  into parts {1, 3}, i.e. towers assembled from chain-links (1 element) and
  hooks (3 elements). Predicts census(13) = 87; next falsifiable target.

## Iteration 8 — the Tower Theorem & complete extremal characterization (2026-07-23)

`research/iteration8.ts`

- **THEOREM 2 (in-house; rigorous — the Tower Theorem).** Let P = B₁ ⊕ … ⊕
  B_m be an ordinal sum with every block a single point or the 3-element
  poset 1+2, and h ≥ 1 blocks equal to 1+2. Then e(P) = 3^h, every
  incomparable pair of P sits at exactly {1/3, 2/3}, and b(P) = 1/3.
  *Proof.* Linear extensions of an ordinal sum are exactly concatenations of
  block extensions, so e(P) = Πe(Bᵢ) = 3^h and a uniform extension restricts
  uniformly to each block. Incomparable pairs live only inside 1+2 blocks,
  where each pair's minority order occurs in exactly one of the block's three
  extensions. ∎  (Iteration 3's H(k) theorem is the case (1+2) ⊕ point^(k−1).)
- **Converse verified on the whole known extremal class**: all 175 extremal
  posets (grown class n ≤ 12; exhaustively confirmed n ≤ 10) ordinal-
  decompose into {point, 1+2} blocks — 175/175, no exceptions.
- **Constructive bijection**: generating one tower per composition of n into
  parts {1, 3} (excluding all-1s = the chain) reproduces the extremal class
  exactly — canonical set equality at every n ≤ 12. Hence
  **census(n) = #compositions(n; {1,3}) − 1**, which also explains iteration
  7's d(k) = d(k−1) + d(k−3) recurrence (append a 1-part or a 3-part) and
  the e-distribution (h hooks ⇔ C(n−2h, h) compositions ⇔ e = 3^h).
- Standing: the theorem direction is proved unconditionally; the converse
  ("b(P) = 1/3 only for towers") is a conjecture verified through n = 10
  exhaustively and n = 12 on the grown class. Both may exist in the
  literature (equality cases of 1/3–2/3 are a natural question); unverifiable
  offline, no novelty claimed.

## Loose ends / next iterations

- ~~Prove b(H(k)) = 1/3~~ — done (iteration 3, slot argument).
- ~~n = 10 exhaustive~~ — done (iteration 4, early-exit redesign).
- ~~Prove the tower theorem in general~~ — done (iteration 8, ordinal-sum
  form; rigorous).
- ~~Identify the extremal census law~~ — done (iteration 8: census(n) =
  #compositions(n; {1,3}) − 1, constructive bijection verified n ≤ 12).
- Prove the converse rigorously: b(P) = 1/3 ⇒ P is a tower of {point, 1+2}
  blocks. Verified n ≤ 10 exhaustive / n ≤ 12 grown; a proof likely needs
  the equality analysis of Kahn–Saks-type inequalities. Check literature
  first — this may well be known.
- n = 11 exhaustive sweep — running (iteration 9, 4 workers); tests
  "0 below 1/3" and census(11) = 40 at the exhaustive level.
- The accumulation question stands: explain the runner-up braid at n = 10
  (37/106), find the family it belongs to, and compute its limit. The
  gap sequence 1/15, 1/33, 1/42, 1/45, 1/51, 5/318 wants a law.
- Cross-check the {1,3}-composition sequence (1,1,2,3,4,6,9,13,19,28,…,
  a.k.a. Narayana's cows / A000930 shape) against OEIS from an unrestricted
  environment; identification is currently from the verified recurrence only.
