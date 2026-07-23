---
name: tackle-conjecture
description: >-
  Take an open math conjecture (or a result a reasoning model just produced) and
  land it in Math Lab honestly: reproduce it with an exact-integer machine
  verifier, add a precise registry entry with correct status/quantifiers,
  cross-link references, and leave a jump-in prompt for the next person. Use when
  adding a new problem to lib/problems.ts, recording a proof/counterexample/search
  result, or graduating a problem's dossier. The Dinitz–Garg–Goemans / Goemans
  cost-conjecture counterexample is the worked template.
---

# Tackle a conjecture in Math Lab

This lab tracks open problems worth throwing compute at, and **content accuracy
matters more than usual** — statements and statuses in `lib/problems.ts` are
honest research claims. A "solved" mark must be backed by a certificate someone
can re-run, not by a model's say-so. This skill is the repeatable pipeline that
produced the `goemans-unsplittable-flow` entry.

## The pipeline

1. **State it precisely.** Write the conjecture in one to three sentences with
   exact quantifiers. Separate what is *proven* from what is *conjectured*
   (e.g. the DGG congestion bound is a theorem; the *simultaneous cost* version
   is Goemans' open conjecture). "Almost all" ≠ "all". "Open" means open.

2. **Reproduce before you believe.** A shared chat, a paper, or your own
   reasoning is a *claim*, not a result, until it runs. Build an exhaustive,
   **exact-integer** verifier as a Bun script in `research/` (BigInt or plain
   integers — never floating point for the decisive comparison). It must:
   - rebuild the input object from its own description and check consistency
     (e.g. that a fractional flow really is feasible),
   - enumerate the **entire** finite universe, not a sample — and prove it is the
     whole universe (for SSUF: exactly two s→tᵢ paths per terminal ⇒ no splice
     hybrids ⇒ 8 routings is everything). Partial LPs / sampled searches give
     spurious positives; say so if you must use one.
   - assert the decisive inequality and fail loudly otherwise.
   Run it. Only a passing verifier earns "solved".
   Template: `research/dgg-counterexample.ts`.

3. **Add the registry entry** in `lib/problems.ts`:
   - `slug`, `title`, `aka` (all the names people search), `category`.
   - `statement` — precise; `status` — honest (what's proven, what's open, the
     external-audit caveat if it isn't peer-reviewed yet).
   - `attack` — how compute/reasoning cracks it or would.
   - `stage`: `solved` (proved/disproved with a certificate), `live` (built-out
     dossier), `started` (notes/partial), or `untouched`.
   - `notes` — dated log entries including the **dead ends** (they're results).
   - `refs` — cross-link sources: the writeup/share URL, the in-lab verifier
     path, and the primary literature citation. Entries with a `url` render as
     links; citation-only entries omit `url` (don't invent URLs).

4. **Cross-link.** In `status`/`attack`/`notes`, point at the verifier by path
   (`research/<name>.ts`) and at the companion log (`research/<slug>.md`). In the
   TUI, always write **absolute** paths so they're clickable.

5. **Leave a jump-in prompt.** End the companion `research/<slug>.md` with a
   ready-to-paste prompt so the next person (or model) can push further —
   name the open sub-frontiers, and restate the certificate rules (exact
   arithmetic, exhaustive enumeration, splice-closed path systems).

6. **Verify the app still builds:** `bun run typecheck && bun run build`.
   If you added a new `stage` value, update `STAGE_LABEL`, the search-rank in
   `components/SearchHome.tsx`, and the badge CSS in `app/globals.css`.

## Honesty rules (non-negotiable)

- No fabricated steps. If a construction collapsed, log it as a dead end.
- A counterexample is only "solved" when the certificate is finite, exact, and
  exhaustive — and even then, if the literature still lists the problem open,
  the status says "pending external audit".
- Keep corrections on the record rather than editing history silently.

## Worked example — Goemans' cost conjecture (2026)

Iterations 1–3 chased abstract cube gadgets; each collapsed to zero separation
once graph hybrids were counted, and a five-terminal "δ≈0.152" fell to ~1e-14
after exact pricing. Iteration 4 flipped the strategy — instead of deleting
hybrids, make the +D capacity slack forbid the cheap detours: a 7-vertex K₄
subdivision with three zero-cost detours that are pairwise capacity-incompatible,
forcing ≥2 cost-30 direct paths (min good cost 60 > 58 = cᵀx). Verified
exhaustively over all 8 routings in `research/dgg-counterexample.ts`; logged in
`research/dgg-goemans.md`; registry entry `goemans-unsplittable-flow`, stage
`solved`, with the open-conjecture audit caveat kept on the record.
