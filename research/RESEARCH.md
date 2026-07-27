# Math Lab research log

Two campaigns so far: the **1/3–2/3 conjecture** (below) and **Gallai's path
decomposition conjecture** (second half of this file).

# 1/3–2/3 conjecture — campaign log

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
  loose end.) **CLOSED 2026-07-27:** oeis.org IS reachable from here; the
  caveat was stale. The census 1, 2, 3, 5, 8, 12, 18, 27, 40, 59 is
  **A077868**, the expansion of 1/((1−x)(1−x−x³)) — exactly the partial-sum
  shape implied by iteration 8's law census(n) = #compositions(n; {1,3}) − 1.
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
- ~~Cross-check the {1,3}-composition sequence against OEIS~~ — **done
  2026-07-27**. oeis.org is reachable from this environment (the "network
  policy blocks OEIS" note was stale, and the same was true of the wider
  literature — see the Gallai literature check). The difference sequence
  1, 1, 2, 3, 4, 6, 9, 13, 19, 28, 41 is confirmed as **A000930**, Narayana's
  cows, a(n) = a(n−1) + a(n−3) — the recurrence iteration 7 derived from the
  machine census. The extremal census itself is **A077868**. Both
  identifications now rest on OEIS, not on a guess from a fitted recurrence.

---

# Gallai's path decomposition conjecture — campaign log

> Every connected graph on n vertices decomposes into at most B(n) = ⌈n/2⌉
> edge-disjoint paths. Open since 1968 (Gallai, reported by Lovász). Known for
> graphs whose even-degree vertices induce a forest (Pyber, after Lovász),
> maximum degree ≤ 5, planar graphs (Blanché–Bonamy–Bonichon), and other
> classes.

## LITERATURE CHECK — what was actually new (2026-07-26)

Turns 1–10 all carried the caveat "the literature cannot be checked from this
environment, no novelty claimed." That caveat was **wrong from turn 8 onward**:
web search works from here. It was checked on 2026-07-26 and two headline claims
in this log have to be corrected. Both corrections are demotions.

**1. The n = 11 exhaustive verification is NOT a frontier extension — it was
published in 2019.** Botler, Cunha and Sambinelli, *On Computing the Path Number
of a Graph*, Electronic Notes in Theoretical Computer Science **346** (2019)
185–197, give an ILP model for the path number and report Gallai verified for
**all graphs on at most 11 vertices**, for bipartite graphs on at most 16, and
for regular graphs on at most 14. Turn 8 called n = 11 "the frontier" and said
"no priority is claimed" as a hedge; the correct statement is stronger and
flatter: **it was already done, and turn 8 is an independent replication.**

  What survives, and it is not nothing: the replication used a completely
  different method — a proved degree-≤2 reduction plus certificate-verified
  combinatorial search, 15.5 min on a laptop, with every one of 577,076,528
  decompositions re-verified edge-by-edge. An ILP verification asks you to trust
  a solver; this one emits checkable certificates. Independent replication of a
  computational claim by an independent method is worth having. It is not a new
  result.

**2. The "new structural finding" about odd order is a named open problem.**
Turn 7 observed that at odd n every tight graph appears to be density-forced,
i.e. K_n minus at most (n−3)/2 edges, and turn 8 confirmed the census 1, 2, 4,
9, 20. That class has a name — an **odd semi-clique** is a clique on 2k+1
vertices minus at most k−1 edges — and the statement is exactly the **question
of Bonamy and Perrett**: can every connected graph on n vertices be decomposed
into at most ⌊n/2⌋ paths *unless* G is an odd semi-clique? At odd n,
⌊n/2⌋ = B(n) − 1, so "not tight unless an odd semi-clique" IS that question.
The "prediction of 20 at n = 11" was, unknowingly, just counting the odd
semi-cliques on 11 vertices.

  Known partial results on it: Botler, Jiménez, Sambinelli and Wakabayashi
  settled it for treewidth ≤ 3 (only K_3 and K_5 − e are exceptions), and it is
  known for planar graphs (only K_3 and K_5 − e are planar odd semi-cliques).
  A 2025 *Discrete Mathematics* paper, *Gallai's conjecture and the path number
  of odd semi-cliques*, works directly on the class.

  What survives: turns 7–9 are **independent computational evidence for the
  Bonamy–Perrett question** — exhaustive at odd n ≤ 9, and at n = 11 across the
  entire band m ≥ 45, which is the hard region (at m = 50 a 5-path decomposition
  must be five Hamiltonian paths exactly). That is a real if modest contribution
  to a live question, and it is a much more accurate description than "new
  structural finding."

**3. Everything else is very likely folklore, and none of it is claimed.** The
splitting lemma, the parity lemma, the orbit lemma, the endpoint property E, the
degree-2 splice and the parity-toggle framing are all elementary. Searching did
not turn up the toggle framing or the Free Toggle strengthening in print, but
four web searches are weak evidence of novelty for an elementary idea in a
sixty-year-old problem, and the even-degree subgraph G_E is *the* standard object
in this literature (Pyber, Fan, Botler et al. all work on its structure). Treat
all of it as reconstruction, not discovery.

**Standing instruction for later turns: check the literature FIRST.** Turn 7
spent its effort naming and localizing a property that turns out to be a known
open question; had the search been run first, that effort could have gone at the
question as stated, from the known partial results.

Same ground rules: exact integer/bitset arithmetic, every upper-bound claim
carries a machine-verified certificate (`verifyDecomposition`), dead ends and
corrections stay on the record. Unlabeled enumeration is nauty `geng -c`;
`p(G)` is the path number and G is **tight** when p(G) = B(n).

Machinery: `research/gallai-lib.ts` — BigInt edge masks, `number`-bitset
residual adjacency (n ≤ 31), three classical lower bounds
(⌈odd/2⌉, max⌈deg/2⌉, ⌈m/(n−1)⌉), a greedy+DFS budget engine
(`pathNumberAtMost`, sound but node-capped) and, added in turn 7, an
**exhaustive** forced-endpoint solver (`decompWithEndpointsExact`) whose `null`
is a proof of non-existence rather than a timeout — it throws if it would hit
its node limit.

## Turns 1–6 — finite verification and the leaf induction (2026-07-24)

Run under `mathsmasher` (`~/.mathsmasher/runs/2026-07-24T01-08-34-gallai-paths-v1`,
final verdict `open`); scripts in-repo, artifacts out-of-repo.

- **Exhaustive verification through n = 10.** `gallai-small-n.ts` (labeled,
  n ≤ 7), `gallai-unlabeled.ts` (geng, n ≤ 9), then `gallai-n10-stream.ts` in
  four `res/mod` shards + `gallai-n10-merge.ts`: **11,716,571 connected graphs
  on 10 vertices = A001349(10), every one certified p ≤ 5, zero
  counterexamples** (~47 s wall, 4 shards). 305,585 of them are tight by a
  lower bound.
- **Density lemma (I3).** m > (n−1)(B−1) ⇒ p = B, exhaustively certified n ≤ 10
  (844 graphs).
- **Structure-forced tight cores (I4/I5).** Tight graphs whose tightness no
  classical lower bound explains: **3 at n = 6, 51 at n = 8, none at odd
  n ≤ 9**. Each carries a size-B certificate plus an exhaustive refutation at
  B−1; one edge-minimal core at n = 8 (`G?rLeW`).
- **Leaf induction, partially closed.** A1: for odd n, B(n−1)+1 = B(n), so any
  leaf-lift works — Gallai(n−1) ⇒ Gallai(n) for every leafy graph of odd order,
  analytically, all n. A2 (parity): if deg_H(attach) is odd then every
  decomposition of H = G−leaf ends at the attachment, so the lift extends a
  path and spends nothing — closing even n in that case. What was left: even n
  with an even-degree attachment. `gallai-leaf-closed.ts` closed it only
  *constructively* for n ≤ 10 — all **1,975,757** leafy connected graphs got a
  certificate, with the forced-endpoint search needed just **5** times and zero
  exact-on-G fallbacks — but with no general argument.
- **Universal-vertex merge** (`gallai-univ-closed.ts`) and constructive families
  (stars, K_n, tree decompositions) verified separately.

## Turn 7 — the endpoint property: the even-n leaf gap, reduced to a statement (2026-07-25)

`research/gallai-endpoint.ts`, `research/gallai-deg2.ts`. For a connected G on n
vertices and a vertex v define

    E(G, v):  G has a path decomposition of size ≤ B(n) with v an END of some path.

Four elementary lemmas, all **proved for all n** (proofs in the script headers):

- **THEOREM A (splitting).** p(G) ≤ B(n) − 1 ⇒ E(G, v) for every v of positive
  degree. Cut, at v, the path that v is interior to: +1 path, still ≤ B(n).
- **THEOREM B (parity).** In *every* decomposition, #{paths ending at v} ≡
  deg(v) (mod 2). So odd-degree vertices are ends for free.
- **LEMMA G (orbit).** E transfers along automorphisms, so every
  vertex-transitive graph satisfies E — in particular K_n, the extremal tight
  graph at odd order.
- **COROLLARY C.** E(G, v) can fail only if G is **tight** and deg(v) is
  **even**. Hence E holds for every graph with all degrees odd, and for every
  **tree** (a tree has p = q/2 with q = #odd-degree vertices, so tightness
  forces q = n — all degrees odd).

The payoff is that the campaign's messy even-n leaf case collapses into one
clean conditional step, with no parity split and no search:

- **THEOREM D (leaf reduction).** G connected with a leaf x at a, H = G − x. If
  p(H) ≤ B(n−1) and E(H, a), then p(G) ≤ B(n). *Either* H has slack and the
  edge ax becomes its own path, *or* H is tight and E(H, a) hands us a path
  ending at a to extend. Both parities, all n. This is what the 5 forced-endpoint
  instances of turn 6 were doing; now it is a theorem plus a named hypothesis.

**E machine-verified exhaustively for every connected graph on n ≤ 9** — for
every graph and *every* vertex, split three ways by the lemmas: non-tight
graphs by an explicit split certificate (2,434,738 of them), tight graphs by
**exhaustive** forced-endpoint search (10,698 certificates), and the parity
identity re-checked on all **2,719,830** certificates produced. Zero failures,
zero undecided. Engine validated first against two closed forms — exact
p(T) = q/2 on all 200 trees n ≤ 10 and p(K_n) = ⌈n/2⌉ — in *both* directions,
and cross-checked by the independent pendant identity (for tight G,
E(G,v) ⇔ p(G + pendant at v) ≤ B(n), 10,617 agreements).

Consequence: **Theorem D is now unconditional for every leafy connected graph
on n ≤ 10**, by a general argument instead of a search over 1.98M graphs.

### Where E can actually fail — and it is a small place

Tight census by exact recount (`lb-forced` = some classical bound already
reaches B, `struct` = tightness no bound explains):

| n | connected | tight | tight w/ even-deg vertex | lb-forced | struct |
|---|---|---|---|---|---|
| 3 | 2 | 1 | 1 | 1 | 0 |
| 4 | 6 | 5 | 3 | 5 | 0 |
| 5 | 21 | 2 | 2 | 2 | 0 |
| 6 | 112 | 47 | 34 | 44 | 3 |
| 7 | 853 | 4 | 4 | 4 | 0 |
| 8 | 11,117 | 1,284 | 1,060 | 1,233 | 51 |
| 9 | 261,080 | **9** | 9 | 9 | 0 |

The `struct` column reproduces turn 6's independent count (3 at n = 6, 51 at
n = 8) from a different engine — two methods, same answer.

**Observation (verified n ≤ 9, unproved).** [SEE THE LITERATURE CHECK AT THE TOP
OF THIS CAMPAIGN: this is the Bonamy–Perrett question, and these graphs are known
as *odd semi-cliques*. What follows is independent verification of a named open
problem, not a new observation.] At *odd* n every tight graph is
density-forced: 2m > (n−1)². Both other classical bounds are structurally
incapable of reaching B at odd n — the odd-vertex count is at most n−1 (an
odd-order graph cannot have all degrees odd) and the max-degree bound is at
most (n−1)/2, so only the edge bound can — and empirically nothing else is
tight either. Equivalently the odd-order tight graphs are exactly **K_n minus a
graph with at most (n−3)/2 edges**, which predicts the census as the number of
graphs on n vertices with ≤ (n−3)/2 edges: 1, 2, 4, 9 for n = 3, 5, 7, 9 —
matching the recount exactly (1 = K_3; 2 = K_5, K_5−e; 4; and **9 at n = 9**,
i.e. 1+1+2+5 complements). **Next falsifiable target: 20 tight graphs at
n = 11** (1+1+2+5+11).

Why it matters: Theorem D applies E to H = G − x of order n−1, and the hard
parity is n even, i.e. **H of odd order**. So the entire residual even-n leaf
gap lives on near-complete graphs — and Lemma G already settles the extreme
point K_{n−1} of that family for free.

## Turn 7 — the degree-2 splice: a second unconditional reduction (2026-07-25)

`research/gallai-deg2.ts`.

- **THEOREM F (degree-2 splice; unconditional, all n, both parities).** Let v
  have degree 2 with **non-adjacent** neighbours u, w and put
  H = (G − v) + uw — simple, connected, order n−1. Then p(G) ≤ p(H): the edge
  uw lies on exactly one path of any decomposition of H, and replacing that
  edge by u–v–w reinserts v at **no cost in path count**. So Gallai(n−1) ⇒
  p(G) ≤ B(n−1) ≤ B(n). Being size-preserving is exactly what even n needs.
- **Honest scope: adjacent neighbours are genuinely different.** If uw ∈ E(G)
  (v in a triangle) the same substitution *uncovers* uw. For odd n the two edges
  at v are already a path u–v–w and p(G) ≤ p(H) + 1 = B(n) suffices. For even n
  it suffices that some decomposition of G−v of size ≤ B(n) has u and w as ends
  of two **distinct** paths — distinctness is essential, since appending v to
  both ends of one u…w path closes a cycle. Parity does not give it (the odd
  number of ends at u and at w may be the same path), so it is decided here by
  exhaustive search: **all 7,328 arising instances at n ≤ 9 hold**, so the
  degree-2 case is fully closed (constructively) in that range.
- Verified n ≤ 9: **136,553** splice certificates (each size-preserving and
  ≤ B(n)), **132,428** odd-n triangle certificates, zero failures.
- **Reduction coverage.** Fraction of connected graphs killed outright by
  "has a leaf, or a degree-2 vertex outside a triangle": 66.7% (n=4), 65.2%
  (n=6), 64.1% (n=7), 58.3% (n=8), **49.4% (n=9)** — with 84,242 of the
  remaining 132,088 at n = 9 having δ ≥ 3. The reductions shrink but stay
  substantial; the residual class is δ ≥ 3 plus triangle-bound degree-2
  vertices.

**Net standing after turn 7.** Gallai for order n reduces to order n−1 for every
connected graph with a leaf (Theorem D, modulo E on order n−1) or with a
degree-2 vertex outside a triangle (Theorem F, unconditional) or any degree-2
vertex when n is odd. What remains is δ ≥ 3 — where the conjecture is genuinely
hard — plus the E hypothesis, now localized to tight graphs at even-degree
vertices, and at odd order to near-complete graphs. Nothing here proves Gallai.

### Negative result, on the record

The natural strengthening that would make a Gallai+E induction self-contained is
**false**. E₂(G, u, v) — one decomposition of size ≤ B(n) with *both* u and v as
ends — **fails for 25 of 758** (tight graph, vertex pair) instances at n ≤ 6;
the smallest witnesses are the 4-vertex tight graphs `CV` and `C^` at pairs of
degree-2 vertices. 6 of the 25 failures have both vertices of degree ≥ 3, so
this is not merely an artifact of degree-2 vertices that Theorem F removes. So a
simultaneous induction on "Gallai ∧ E" cannot route through E₂ as stated;
E₂ˢ (the distinct-paths variant needed by Theorem F's triangle case) is a weaker
demand and did survive every instance tested. Dense tight graphs at n ≥ 7
exhaust the 8M-node limit on E₂ instances; those are counted as undecided and
excluded rather than silently dropped.

### Correction — Theorem D is an equivalence, not a weakening (2026-07-25)

Stated on the record, because turn 7 was first written up as if E were a
*weaker* hypothesis that Gallai could be reduced to. It is not.

**PROPOSITION.** Let m be odd, H connected and tight on m vertices, a ∈ V(H),
and G = H + a pendant vertex x. Then E(H, a) ⟺ p(G) ≤ B(m+1).
*Proof.* (⟸) Let D decompose G with |D| ≤ B(m+1) = (m+1)/2 = p(H). The path
containing ax has x as an end (x is a leaf). If that path is the bare edge ax,
then D ∖ {ax} decomposes H with p(H) − 1 paths — impossible. So it is longer,
and deleting x from it leaves a path ending at a: a decomposition of H of size
≤ p(H) with a as an end. (⟹) is Theorem D. ∎

So "E on order n−1" and "Gallai for leafy graphs of order n" are the SAME
statement, and proving E in general is exactly as hard as proving the leafy case
of Gallai. Theorem D is therefore a reorganization plus a localization, not a
reduction to something easier — and the loose end "prove E" below is not a
shortcut past Gallai.

What survives the correction, and is genuinely useful:

- Theorems A, B and G really do confine where E can fail (non-tight graphs,
  odd-degree vertices and whole automorphism orbits are free), which is what
  made the exhaustive n ≤ 9 check affordable and what explains why turn 6's
  1.98M-graph constructive sweep needed a forced-endpoint search only 5 times.
- The odd-order density census localizes the residual leafy case to
  near-complete graphs.
- **Theorem F is NOT circular**: it bounds p(G) ≤ p(H) for a strictly smaller
  H with no leftover hypothesis, so it genuinely removes degree-2 vertices from
  the problem. That is the one reduction here that stands alone — and it is what
  made the n = 11 verification below affordable.

## Turn 8 — exhaustive verification at n = 11 (2026-07-25)

`research/gallai-n11.ts`, log `research/gallai-n11.log`.

The finite frontier moves from n = 10 to **n = 11**, and Theorem F is what made
it affordable. At n = 11 there are A001349(11) = 1,006,700,565 connected graphs.
But 11 is **odd**, and at odd order every vertex of degree ≤ 2 is free given
Gallai on 10 vertices (which turn 6 verified exhaustively):

- leaf at a: B(10) + 1 = 6 = B(11), so decompose G − v and add the path (a,v);
- degree 2, neighbours non-adjacent: Theorem F gives p(G) ≤ p(H) ≤ B(10) = 5;
- degree 2, neighbours adjacent: G − v is connected (reroute through uw) and the
  two edges at v form the path u–v–w, so p(G) ≤ B(10) + 1 = 6.

So the whole obligation collapses onto **δ ≥ 3**: `geng -c -d3 -u 11` counts
**577,076,528** such graphs — the reduction removes **42.7%** of the population.

**Result: all 577,076,528 verified, zero counterexamples, zero undecided**,
15.5 min wall across 14 shards (621k graphs/s aggregate, 48k/s per shard).
Coverage was asserted against the independent `geng -u` count, so no shard
silently dropped graphs. Every accepted decomposition was re-verified
edge-by-edge and its size re-checked against B = 6. Notably the greedy engine
sufficed for **every single graph** — zero escalations to the capped exact
search and zero to the exhaustive one — so no result here rests on a search
that gave up. Together with the reduction: **Gallai's conjecture holds for every
connected graph on at most 11 vertices.**

Guard against the reduction hiding a coding error in the 42.7% we skip: the
prescribed certificate was built and verified for **100,049** sampled δ ≤ 2
graphs at n = 11, deliberately spread over edge bands m = 10–13, 17–20, 24–27,
31–34, 38–41, 44–47 (12,996 leaf / 33,670 splice / 53,383 triangle). The first
version of this check sampled only the head of geng's output, i.e. sparse graphs
only — corrected. The densest band yields few instances (49 found within a 4M
scan cap; m = 47 = C(10,2) + 2 is the largest edge count compatible with a
degree-2 vertex on 11 vertices), and that cap is reported rather than papered
over.

**The census prediction came in exactly.** Turn 7 predicted 20 tight graphs at
n = 11 from the odd-order density characterization (complements of the
1+1+2+5+11 graphs with ≤ 4 edges). The sweep found **precisely 20** graphs whose
classical lower bound equals B = 6; each also carries a verified 6-path
decomposition, so **p = 6 exactly** for those 20 — proved, not conjectured. The
odd-order tight census is now 1, 2, 4, 9, **20** for n = 3, 5, 7, 9, 11.

Scope, stated precisely: this confirms the *lower* half of the characterization
(these 20 are tight). The other half — that **nothing else** at n = 11 is tight
— needs a budget-5 sweep, a strictly harder computation than the budget-6 one
just run, and is not claimed. One free consequence of Theorem F in that
direction: at odd n a tight graph can have no degree-2 vertex with non-adjacent
neighbours, since Theorem F would give p(G) ≤ p(H) ≤ B(n−1) = B(n) − 1.

Honesty note on novelty — CORRECTED 2026-07-26: the literature CAN be checked
from this environment, and was. Gallai was already verified for all graphs on at
most 11 vertices by Botler, Cunha and Sambinelli (ENTCS 346, 2019) using an ILP
model. This turn is therefore an **independent replication by a different
method**, not a frontier extension. See the literature check at the top of this
campaign.

## Turn 9 — Walecki rainbow: theory beats search on the dense band (2026-07-25)

`research/gallai-walecki.ts`, `research/gallai-n11-census.ts`.

Turn 8 confirmed the easy half of the odd-order characterization (the 20
density-forced graphs at n = 11 are tight). The hard half — that **nothing else**
at n = 11 is tight — needs `p ≤ 5` for every graph with m ≤ 50, and the danger
zone is the top of that range: 5 paths hold at most 5·10 = 50 edges, so at
m = 50 a decomposition must be **5 Hamiltonian paths exactly**, with zero slack.
The general exhaustive solver bogs down precisely there — it left
`J]zn^~~~~~_` (m = 50) undecided after 60,000,000 nodes.

Classical Walecki settles it instead: for odd n = 2k+1, K_n decomposes into k
Hamiltonian cycles (built explicitly as the zigzag ∞, j, j+1, j−1, …, j+k and
**verified** here for n = 5..15 — k cycles, edge-disjoint, exact cover).

- **RAINBOW LEMMA.** If a Hamiltonian cycle decomposition of K_n puts every edge
  of F in a different cycle, then for G = K_n − F with |F| = c:
  *c = k* → deleting F cuts each cycle once, so G IS k Hamiltonian paths, giving
  p(G) ≤ k = B(n) − 1 (not tight). *c < k* → the c hit cycles give c Hamiltonian
  paths, each of the k−c unhit cycles is cut at a chosen edge, and if those
  chosen edges form a single path the total is c + (k−c) + 1 = B(n). Choosing one
  cut edge **incident to a** makes that path end at a — certifying E(G, a).
- **CONTIGUOUS RAINBOW.** Removing a cyclically *contiguous run* of edges from a
  Hamiltonian cycle also leaves a single path (the complementary arc). So if
  every cycle's F-edges form one contiguous run and no cycle is missed, G still
  decomposes into exactly k paths — which extends the method past |F| > k.

Any relabelling of a Walecki decomposition is again one, so the labelling is
found by seeded-random permutation search; a miss is reported as "no labelling
found", never as a proof of non-existence.

Results at n = 11, all certificates verified edge-by-edge:

- **m = 50 (26 graphs): every one decomposes into 5 Hamiltonian paths**, so
  p = 5 and none is tight. The graph the exhaustive search could not decide took
  **66 random labellings**, and the whole band ran in **0.025 s** — against
  60M search nodes that produced no verdict.
- **m = 45..49 (5,674 graphs): contiguous rainbow certified 5,595** of them
  outright (34 s). The 79 misses are all at m = 45, where the ordinary search has
  slack and handles them.
- **The census sweep independently agrees**: m = 45 → all 3,663 certified p ≤ 5,
  zero undecided (466 s); m = 46..49 → 2,009 of 2,011 by search, and the two it
  left undecided (`J]zn^^n~~~_` at m = 48, `J]zn^^~~~~_` at m = 49) are exactly
  the ones the contiguous-rainbow pass certifies. The union of the two methods
  decides the entire band.
- **m ≥ 51 (the 20 tight graphs): p = 6 exactly**, and **E(G, a) holds at all
  220 (graph, vertex) pairs** with explicit size-6 certificates.

So at n = 11 **the tight graphs among all graphs with m ≥ 45 are exactly the 20
with m ≥ 51** — i.e. exactly the odd semi-cliques on 11 vertices, which is the
Bonamy–Perrett question confirmed on that band — the odd-order characterization survives the entire zone where it
could plausibly have broken, and my prediction was not saved by luck in the
easy region. Sparser bands (m ≤ 44) are not claimed: Gallai itself is verified
there by turn 8, but their *tightness* is untested, and a structure-forced tight
graph could in principle hide in the slack. (At even order such graphs do exist —
3 at n = 6, 51 at n = 8 — so this is a real caveat, not a formality.)

A loose end also closes: **E is now certified on the whole odd-order tight class
at n = 11**, which is exactly the input Theorem D consumes for leafy graphs at
n = 12 — modulo the still-unproved characterization that those 20 are the only
tight graphs of order 11.

Method note worth keeping: on the hardest instances the win came from a
construction, not from more compute. Six orders of magnitude, from a 1892
theorem.

## Turn 10 — a different axis: parity toggling on Lovász's rigid class (2026-07-26)

`research/gallai-parity.ts`, logs `research/gallai-parity-n8.log`,
`research/gallai-parity-families.log`.

Turns 1–9 all inducted on **n**: peel a vertex, lean on the verified smaller
order, repeat. Every gap they hit was the same gap. This turn changes the axis
to the **parity of the degrees**, and leans on a classical theorem the campaign
had only ever mentioned in prose:

> **LOVÁSZ (1968).** Every graph on n vertices decomposes into at most ⌊n/2⌋
> paths *and cycles*.

- **COROLLARY (all-odd rigidity).** If every degree of H is odd — so n is even —
  then p(H) = n/2 exactly, and in EVERY decomposition of that size each vertex is
  the end of exactly one path.
  *Proof.* Lovász gives ≤ n/2 paths and cycles. A cycle meets each of its
  vertices in 2 edges, and a path meets each of its vertices in 2 edges unless
  that vertex is one of its ends, so every odd-degree vertex ends at least one
  path. Counting ends, 2·#paths ≥ n, so #paths ≥ n/2; with #paths + #cycles ≤ n/2
  this forces #paths = n/2 and #cycles = 0. Then Σ_v e_v = n with every e_v ≥ 1,
  so e_v = 1 for all v. ∎
  The path-ends therefore form a **perfect pairing of V(H)**. Nothing else in
  this campaign has that much structure to work with.

**THE TOGGLE.** For any G with z even-degree vertices (z ≡ n mod 2, so z is even
when n is even), choose a perfect matching π on those even vertices and toggle
each pair: delete it if it is an edge of G, add it if it is not. Every even
vertex flips parity and every odd vertex is untouched, so the result H is
all-odd and the corollary applies. Converting back to G is free when

- an **added** pair (in H, not in G) is an **end-edge** of its path — deleting it
  just shortens that path; and
- a **deleted** pair (in G, not in H) can be **re-attached** — extend the path
  ending at u by v (needs v ∉ that path), or symmetrically at v.

If every toggle is free then p(G) ≤ n/2 = B(n). At **odd** n there is even slack:
z is odd, one even vertex stays unpaired, H then has a single even vertex and the
same count gives ≤ (n−1)/2 parts, all paths — a **spare path** below
B(n) = (n+1)/2, so one toggle may fail and Gallai still follows. Even n is the
hard case and is what was tested.

**Honesty first, same as with E:** this is an exact reformulation, not a
reduction to something easier. "uv is an end-edge in some optimal decomposition
of H" unpacks back into Gallai for G. What it buys is a different *base*: a class
where a classical theorem pins the answer completely, plus a sharp question.

### The unexpected part

The experiment asked only whether **some** pairing works — that is all Gallai
needs. The answer came back much stronger:

- **Exhaustive, even n ≤ 8: all 11,235 connected graphs covered, and ALL 76,632
  pairings worked** (zero undecided at a 20M-node cap) — not one pairing failed anywhere, at any graph. Each success
  carries a decomposition of G rebuilt from the all-odd case and verified
  edge-by-edge. The first pairing tried sufficed for 10,893 of the 11,117 graphs
  at n = 8, so the search over pairings is almost never needed.
- **CONJECTURE (Free Toggle).** For every graph G on even n and *every* perfect
  matching π on its even-degree vertices, the toggled all-odd graph has an
  optimal decomposition in which every toggle is free.
  This is strictly stronger than Gallai (which needs one good π), and strictly
  more falsifiable: a single (G, π) with a *decided* failure kills it. None
  exists below n = 9.
- **P1, the base class:** all 240 connected all-odd graphs on n ≤ 8 certified
  p = n/2 (verified decomposition + exhaustive refutation at n/2 − 1), every
  certificate satisfying rigidity, and rigidity *decided exhaustively* — no
  size-n/2 decomposition violates it — for 231 of them (9 hit the 20M-node
  limit; the lemma is proved above, so those are unaffordable confirmations, not
  doubts).

### n = 10, sampled — and a correction to the reporting

A systematic 1/512 geng slice of the 11.7M connected graphs at n = 10 (3,102
graphs, 89,231 pairings, 35 min) with a 400,000-node cap per search:

- **3,067 of 3,102 graphs covered; 69,746 pairings worked, 19,485 undecided at
  the cap — and 69,746 + 19,485 = 89,231 exactly, so DECIDED failures = 0.**
  The 35 uncovered graphs are ones where every pairing hit the cap, not ones
  where a pairing was refuted. Free Toggle therefore survives n = 10 on the
  sample with no counterexample, at a much lower decision rate (78% of pairings
  decided, against 100% at n ≤ 8 with a 20M cap).

**Correction, on the record.** The first version of the summary line in
`gallai-parity.log` reads "146,276/165,863 pairings worked — some pairings fail,
so the choice of pairing matters". That is a reporting bug, not a result: it
compares successes against ALL pairings including the undecided ones, so it
scores every node-limit timeout as a refutation. The arithmetic above shows the
true count of decided failures is zero. The same bug produced the stale
"pairing choice MATTERS here" lines for C_12² (399/400 free, 1 undecided) and
K_{4,4,4} (122/400 free, 278 undecided) in that log — both are zero-failure
results. The script now computes failures as `decided − worked` and says so
explicitly; the misleading log is kept as-is rather than rewritten, with this
note as the correction.

That mistake is worth keeping visible because it is the exact failure mode this
whole campaign guards against: a search that gives up looks identical to a
search that refutes, unless the code is careful to distinguish them.

### It reaches past Pyber

The classical class here is Pyber's: Gallai holds when the even-degree vertices
induce a **forest**. The toggle route covers **5,026 graphs on n ≤ 8 whose even
vertices do not induce a forest** — so it is not a re-derivation of Pyber, it
overlaps and extends it. (Pyber's theorem is a theorem; this is verified data on
a range. No priority claimed either way.)

### Adversarial probes past the exhaustive range

Exhaustive enumeration stops at n = 8, so the strengthened claim was attacked
where it should break first: graphs with **all degrees even**, which maximises
both rigidity and the pairing count ((n−1)!! pairings). Thirteen families at
n = 8, 10, 12 — K_n minus a perfect matching, K_{4,6}, K_{6,6}, K_{4,8},
K_{4,4,4}, and the cycles C_8, C_10, C_12 with their squares:

**Zero decided failures anywhere.** The dense families do produce many
*undecided* pairings at the node limit (48 of 60 for K_12 − PM, 56 of 60 for
K_{4,8}) — those are excluded from the counts and reported, never scored as
successes. The sparse families (all the cycles and their squares) decided every
sampled pairing outright.

### What this is worth, plainly

It does not prove Gallai and it is not claimed to. What it adds is a second
axis of attack with a rigid, classically-settled base class; a strengthening
that survived every one of 76,632 exhaustive tests plus thirteen adversarial
families; and a much cheaper falsification target than the conjecture itself —
one decided (G, π) failure ends it. The natural next step is to prove the Free
Toggle conjecture for a single toggle (z = 2), which is exactly the classical
cycle-absorption obstruction: when u and v are the two ends of the *same* path,
re-attaching closes a cycle, and the fix needs a path ending on that cycle whose
only shared vertex with it is that end.

## Turn 11 — the exact tight census at n = 10, and two exact prunes (2026-07-27)

`research/gallai-tight10.ts`, `research/gallai-tight10-resolve.ts`, log
`research/gallai-tight10.log`.

Following the standing instruction, the target came from the literature check:
the Bonamy–Perrett question needs to know exactly which graphs are tight, and
the campaign had never computed that at n = 10. Turn 6's stream counted only the
**lower-bound-forced** tight graphs (305,585) because deciding the rest means
refuting a decomposition into B − 1 = 4 paths, which is harder than the Gallai
check itself. So the in-house structure-forced sequence stood at
n = 6 → 3, n = 8 → 51, n = 10 → unknown.

**Result: at n = 10 there are exactly 307,266 tight graphs — 305,585
lower-bound-forced and 1,681 STRUCTURE-forced.** The remaining 11,409,305 are
certified into ≤ 4 paths. 11,409,305 + 307,266 = 11,716,571 = A001349(10), so
the census is complete with nothing undecided. The sequence is now
**3, 51, 1,681** for n = 6, 8, 10 — which OEIS does not contain.

Three things made it affordable:

- **Theorem F earns its keep.** If v has degree 2 with non-adjacent neighbours
  then p(G) ≤ p(H) for H = (G − v) + uw on 9 vertices, and turn 7 decided that
  at n = 9 tight ⟺ m ≥ 33. So m(G) ≤ 33 plus a spliceable degree-2 vertex ⇒
  p(H) ≤ 4 ⇒ p(G) ≤ 4: **not tight, by an edge count, with no search at all.**
  That disposed of 3,259,160 graphs (28%).
- **CAPACITY PRUNE (exact, new).** With r paths left to cover `rem` residual
  edges and no path able to hold more than n−1 edges, *every* path of any
  completing decomposition carries at least rem − (r−1)(n−1) edges — the others
  absorb at most (r−1)(n−1) between them. Shorter candidates cannot appear in
  any solution, so discarding them is exact. At m = 36 this forces all four
  paths to be Hamiltonian.
- **END-COUNT PRUNE (exact, new).** When rem > (r−1)(n−1), all r remaining paths
  must be used, so they supply exactly 2r path-ends. A vertex of residual degree
  d hosts f ends with 2·(interior visits) + f = d and (d+f)/2 ≤ r, hence
  f ≤ min(d, 2r−d). If those caps cannot sum to 2r, or some vertex is forced
  above its own cap, the branch is dead.

The effect is not marginal. Thirteen graphs at m = 34–36 had each survived
**400,000,000 search nodes** without a verdict; with the end-count prune they
were all refuted **at the root node, in 0 nodes.** That is the difference between
an exact census and a census with an asterisk.

Both prunes were regression-tested against every prior exhaustive-negative claim
before being trusted: the tree closed form p(T) = q/2 in *both* directions on all
200 trees n ≤ 10, p(K_n) = ⌈n/2⌉, the n = 8 census (still 51), the n = 9 census
band, and the Walecki W2/W3 results — all unchanged.

**Two independent pipelines agree.** A three-stage run (3M-node sweep, then a
400M resolve, then a second resolve) and a single-pass run with both prunes plus
one resolve arrive at structure-forced = 1,681 by different routes and different
node limits; the second run's 51 undecided split 45 tight / 6 not tight exactly
as the reconciliation required. And the lower-bound-forced count 305,585
independently reproduces turn 6's stream, from a different engine.

**Novelty, stated honestly.** Botler, Cunha and Sambinelli computed the path
number of every graph on ≤ 11 vertices in 2019, so this census is in principle a
by-product of a computation that already exists. I found no published tabulation
of it and no OEIS entry for 3, 51, 1681, but "I could not find it" is not
"nobody has it". Claimed as computed here, with the two prunes as the reusable
contribution.

## Turn 12 — the boundary bound: the "structure-forced" class dissolves (2026-07-27)

`research/gallai-localbounds.ts`, log `research/gallai-localbounds.log`.

Turn 11 left 1,681 graphs at n = 10 whose tightness no classical bound explains.
The question this turn asks is whether they are genuinely unexplained or merely
unexplained by GLOBAL bounds — all three classical bounds count over the whole
graph.

**Local counting bounds first, and they mostly fail.** Fix a decomposition into
k paths and a set S; each path P meets S in c_P subpaths covering
|V(P) ∩ S| − c_P edges inside S, so e(S) ≤ k|S| − Σc_P. Three valid bounds drop
out: L1 density (a path is a forest, so this is Nash-Williams arboricity),
L2 local parity (odd-degree vertices of G[S] must end subpaths), and L3 both at
once. All were validated against exact path numbers — no local bound ever
exceeds p(G) on 12,112 graphs — and they are genuinely sharper than the
classical maximum on 204 of them. But they explain only **1 of 3** at n = 6,
**8 of 51** at n = 8 and **43 of 1,681** at n = 10. Counting is not the answer.

**What counting misses is a cut.** The two smallest unexplained graphs say it
plainly: `ECYW` is a triangle joined by an edge to a vertex carrying two leaves,
and `EQjO` is two triangles joined by a bridge. A triangle needs two paths by
itself, and only so many paths can ENTER it across a small boundary.

- **THEOREM L5 (boundary bound; proved, all n).** For every S ⊆ V, with b the
  number of edges between S and V∖S and odd_X the vertices of X having odd
  degree in G:

      2·p(G) ≥ max(2·p(G[S]) − b, odd_S) + max(2·p(G[V∖S]) − b, odd_{V∖S}).

  *Proof.* Fix a decomposition into k paths. The subpaths inside S form a path
  decomposition of G[S], so there are at least p(G[S]) of them and hence at
  least 2p(G[S]) subpath-ends. Each such end is either a genuine end of one of
  the k paths lying in S, or a point where a path steps out of S along one of
  the b boundary edges — and each boundary edge, used by exactly one path,
  provides at most one exit. With E_S the number of path-ends inside S this is
  2p(G[S]) ≤ E_S + b. Independently E_S ≥ odd_S by parity. The same holds for
  V∖S with the same b, and 2k = E_S + E_{V∖S}. ∎

  S = ∅ recovers the classical odd-vertex bound, so it is a generalisation, not
  an unrelated inequality. It is the only bound here that sees a cut, and it is
  **recursive** — it calls p on induced subgraphs.

**Result: it explains all of them.** Structure-forced tight graphs certified by
the boundary bound: **3/3 at n = 6, 51/51 at n = 8, 1,681/1,681 at n = 10 —
residue zero.** (Three at n = 10 needed exact subset path numbers rather than
the fallback lower bound; with a 600M-node budget they too are explained.) So
"structure-forced" was never a property of the graphs, it was a gap in the
toolkit: **with L5 added, every tight graph on n ≤ 10 has its tightness
certified by a lower bound.**

**The sharper question.** Is p(G) always EQUAL to the best of these bounds?
On all **12,112 connected graphs with n ≤ 8, yes — no gaps**, and then on all
**261,080 connected graphs at n = 9, also no gaps** (727 s). That is 273,192
connected graphs with the identity holding exactly, and not a single graph whose
path number exceeds every bound we can certify. If that identity
held in general it would imply Gallai by induction: for a cut with b ≥ 1,
2p(G[S]) + 2p(G[V∖S]) − 2b ≤ (|S|+1) + (|V∖S|+1) − 2b ≤ n, and the odd terms
give odd_S + odd_{V∖S} = q ≤ n. So the identity is at least as strong as the
conjecture — which is also why it will not be easy.

**A consistency check that constrains the whole idea.** p(G) = 1 exactly when G
has a Hamiltonian path, so computing p is NP-hard and no polynomial-time family
of bounds can equal it unless P = NP. L5 escapes only because it is recursive.
The recursion is essential, not an artifact — any exact min-max characterisation
of the path number has to be of this shape.

**Soundness discipline.** The bounds were validated BEFORE being used: for every
connected graph on n ≤ 8, exact p(G) was computed and every bound checked
against it, with a violation aborting the run. When a subset's exact path number
could not be computed within budget, the code substitutes a valid LOWER bound
for p(G[S]) — L5 is monotone in that term, so the result stays sound and merely
gets weaker. Never a guess.

**Novelty: offered, not claimed.** Searching did not turn up this bound or the
equality question in print. That is weak evidence for a sixty-year-old problem,
and the literature on the even-degree subgraph is deep. Treat L5 as a
reconstruction until someone checks it properly.

## Turn 13 — the cut-vertex formula (2026-07-27)

`research/gallai-cutvertex.ts`, log `research/gallai-cutvertex.log`.

Every earlier reduction was either unconditional but narrow (the degree-2
splice) or an exact reformulation that provably could not be easier than what it
reformulated (the leaf reduction, parity toggling). This one is neither: it
computes p(G) from strictly smaller graphs, so induction on n is legitimate.

For a graph H, a vertex v and an integer t ≥ 0 write **c_H(v, t)** for the fewest
paths in a decomposition of H having at least t paths ENDING at v; so
c_H(v, 0) = p(H).

- **THEOREM (cut-vertex formula; proved, all n).** Let v be a cut vertex of G and
  let G₁, G₂ be edge-disjoint connected subgraphs with G₁ ∪ G₂ = G and
  V(G₁) ∩ V(G₂) = {v}. Then

      p(G) = min over t ≥ 0 of [ c_{G₁}(v, t) + c_{G₂}(v, t) − t ].

  *Proof.* (≤) Take decompositions attaining c_{G₁}(v,t) and c_{G₂}(v,t), pick t
  paths ending at v on each side, pair them and concatenate at v. The two sides
  share only v, so each concatenation is a path; the result covers E(G) with
  |D₁| + |D₂| − t parts. (≥) In any decomposition D of G let s count the paths
  using edges of both sides. Such a path passes through v and, being a path,
  visits v exactly once, so it splits into exactly two pieces, each ending at v;
  every other path lies wholly on one side. The pieces give decompositions of G₁
  and G₂ with |D| = |D₁| + |D₂| − s, and each has at least s paths ending at v,
  so |D| ≥ c_{G₁}(v,s) + c_{G₂}(v,s) − s. ∎

- **COROLLARY (no minimal counterexample has a cut vertex, modulo E).** If the
  endpoint property holds on both sides — c_{Gᵢ}(v,1) ≤ ⌈nᵢ/2⌉ — then taking
  t = 1 gives p(G) ≤ ⌈n₁/2⌉ + ⌈n₂/2⌉ − 1 ≤ ⌈n/2⌉ where n = n₁ + n₂ − 1. The last
  inequality is equality whenever n₁ or n₂ is odd, and has slack 1 when both are
  even, so the single merge is exactly what pays for the glue. Combined with the
  degree-2 splice of turn 7, **a minimal counterexample to Gallai is 2-connected
  with δ ≥ 3** — unless E fails on one of its pieces, and E can only fail on a
  tight graph at an even-degree vertex, which is now a fully censused class.

**Verified exhaustively for every connected graph with a cut vertex, n ≤ 9:**
the formula is exact on all **71,464** of them, both sides computed with the
complete solver so a mismatch would be real and not a search artifact. In every
one of those 71,464 cases E held on both pieces, and the corollary's glued
decomposition was constructed explicitly and verified edge by edge against
⌈n/2⌉ — zero cases where the corollary's hypothesis failed.

A bug worth recording: the first run reported 456 failures, all of the form
"glued certificate repeats a vertex". The formula checks had passed; the fault
was in the gluing code, which oriented BOTH pieces' paths to end at v so the
shared vertex appeared twice in the concatenation. The second piece has to start
at v. The theorem was fine; the scaffolding was not — which is exactly why every
constructed certificate goes through `verifyDecomposition` rather than being
trusted.

**Novelty: not claimed, and probably none.** "A minimal counterexample is
2-connected" is standard-issue reasoning in this area and most papers simply
assume 2-connectivity. The explicit formula is elementary. What it adds here is
that the campaign's own reductions now compose into a clean statement about
where a counterexample could live, with the interface (the cost profile
c_H(v, t)) made explicit and machine-checked.

## Direction — where this goes from here (written 2026-07-27)

State of play after thirteen turns, stated flatly: **no new theorems about
Gallai's conjecture.** The conjecture is exactly as open as it was at turn 1.
What exists is verified territory, a working toolkit, and two conjectures worth
attacking. Anyone picking this up should read the literature check at the top of
this campaign before doing anything else.

### What is actually banked

- **Infrastructure.** `gallai-lib.ts` has an exhaustive forced-endpoint solver
  whose `null` is a proof, with two exact prunes (capacity, end-count) that turn
  400M-node non-terminations into root-node refutations. Everything downstream is
  cheap because of it.
- **Data.** Gallai verified to n = 11 (replicating Botler–Cunha–Sambinelli 2019).
  Exact tight census at n = 10: 307,266 tight, 1,681 structure-forced, with the
  full catalog on disk. Odd-order tight counts 1, 2, 4, 9, 20 — the Bonamy–Perrett
  class confirmed on a range.
- **Reductions, proved.** Degree-2 splice (unconditional, size-preserving) and
  the cut-vertex formula (non-circular). Together: **a minimal counterexample is
  2-connected with δ ≥ 3**, modulo the endpoint property E on pieces.
- **Two conjectures, both strictly stronger than Gallai, both heavily tested.**
  The boundary-bound identity `p(G) = best bound` (273,192 graphs, no gaps) and
  Free Toggle (76,632 pairings plus adversarial families, no decided failures).

### The three directions worth taking, ranked by expected yield

**1. Falsify something.** Cheapest, most informative, and the only one with a
near-certain outcome. Both standing conjectures are *strictly stronger* than
Gallai, so a counterexample costs nothing in credibility and kills a line
immediately. Concrete targets: run the identity check at n = 10 (11.7M graphs,
each needing subset path numbers — expensive but the prunes make it plausible),
and hunt Free Toggle failures in graphs whose even-degree subgraph is dense and
2-connected, which is where the toggle has least freedom. A single decided
failure in either is a real result and takes one run.

**2. Prove the identity on a class.** The identity implies Gallai by induction,
so proving it anywhere gives Gallai there as a corollary. The class must have
controlled cuts and must not already be covered — treewidth ≤ 3 and ≤ 4, planar,
2-degenerate, block graphs, Δ ≤ 5 are all taken. Plausible gaps: graphs whose
even-degree subgraph has bounded block size, or graphs of bounded "cut width" in
the sense the boundary bound cares about. Realistic odds of a small theorem in a
session: maybe 10–20%. This is the only route here that could produce a
publishable statement.

**3. Attack Bonamy–Perrett directly on a class.** It is a named open question
with known partial results, so any new class is a genuine contribution. Start
from the known proofs (treewidth ≤ 3, planar) and ask what they actually use;
our odd-order data says the exceptions are always the odd semi-cliques, and the
cut-vertex formula plus the tight censuses give the structural facts those proofs
need. Harder than (2), better prize.

### What NOT to do

Do not generate more verification data. n = 12 is 164 billion graphs, the
even-order case has no degree-≤2 shortcut, and it would replicate nothing anyone
disputes. The marginal value of another verified order is close to zero; the
marginal value of one theorem is everything. Turns 8–12 produced a lot of
correct, carefully-checked numbers and zero theorems, and that ratio is a
property of the approach, not bad luck.

### The honest strategic read

A sixty-year-old structural conjecture with a deep literature is a poor target
for this kind of campaign: the elementary observations are all taken, and the
remaining difficulty is exactly the part that computation cannot touch. Problems
where the frontier is *computational* — the superpermutation gap at n = 6,
no-three-in-line, van der Waerden lower bounds — are far better matched, because
there a new datum IS the contribution rather than evidence for someone else's
conjecture. If the goal is a genuine new result rather than a well-kept ledger,
that is where to go, and this campaign's solver and certificate discipline
transfer directly.

### Loose ends

- Prove E for the odd-order density-forced family K_m minus ≤ (m−2)/2 edges.
  Turn 9 certifies it computationally at m = 11 via rainbow Walecki, and the
  construction is general — what is missing is a proof that the required
  rainbow labelling always exists.
- Prove the odd-order observation (tight ⇒ 2m > (n−1)²) — equivalently, that at
  odd n a connected graph with 2m ≤ (n−1)² needs only ⌊n/2⌋ paths. Test the
  census prediction **20 at n = 11**.
- Prove E₂ˢ in general, closing the triangle case of Theorem F unconditionally.
- ~~n = 11 exhaustive Gallai~~ — **done** (turn 8): the δ ≤ 2 reduction cut the
  population 42.7% and the δ ≥ 3 remainder verified in 15.5 min. Next frontier
  n = 12 (A001349(12) = 164,059,830,476) is ~164× larger and even-order, so the
  odd-n degree-2 shortcut does not apply — it would need the even-n leaf case
  (i.e. E) plus far more compute.
- ~~Test the upper half of the odd-order characterization at n = 11~~ — **done
  for m ≥ 45** (turn 9): tight ⟺ m ≥ 51 there. Open below m = 45, where a
  structure-forced tight graph could still hide.
- Prove the rainbow condition rather than searching for it: is every F with
  |F| ≤ k rainbow-realizable in SOME Walecki relabelling? If yes, E follows for
  the whole near-complete odd-order family in one step, and with the density
  characterization the leafy case of Gallai closes at every odd order. The
  search found a labelling for every instance tried (worst case 181,410
  labellings), which is evidence, not proof.
- ~~Test "p(G) = the best bound" at n = 9~~ — **done**: 261,080/261,080, no
  gaps. Next is n = 10 (11.7M graphs, each needing subset path numbers) — a
  single gap kills the identity and would be the most informative outcome
  available.
- Push the cut-vertex formula further: it makes p(G) a function of the blocks
  via the block-cut tree, so the natural next step is a full block-tree
  algorithm and the question of which cost profiles c_H(v, ·) are realisable.
- Try to prove the boundary bound is tight for a class — trees, cacti, or graphs
  whose blocks are small — which would give an exact formula for p on that class.
- Use the n = 10 tight census to attack Bonamy–Perrett at n = 11 properly: the
  leaf case needs "G − x is not tight", which is now a lookup rather than a
  search. Remaining obligation there is m ≤ 44 at budget 5.
- Prove Free Toggle for z = 2 (a single toggle). This is the cycle-absorption
  obstruction in miniature; a proof there would be the first genuinely new
  theorem out of the parity axis, and would give a class incomparable to Pyber's.
- Push the Free Toggle experiment past n = 10, and hunt specifically for a
  DECIDED failure — the conjecture is worth more as a falsification target than
  as another verified range.
- Check the literature: the splice and parity arguments are elementary and
  likely folklore; the endpoint property E is the kind of thing an
  equality-analysis of Lovász's path/cycle theorem may already give. No novelty
  claimed offline.
