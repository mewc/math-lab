---
title: DGG / Goemans — stronger or complete CE
goal: either
adapters: [claude, grok]
context:
  - research/dgg-goemans.md
  - research/dgg-counterexample.ts
---

Construct a counterexample to the general (non-planar) case of the
Dinitz–Garg–Goemans / Goemans **cost** conjecture, or strengthen the existing
certificate frontier (smaller instance, or close series-parallel / planar
2D→D gaps). Prefer a **structured**, exact-integer, exhaustive machine
verifier.

Background (do not re-report as new success): a planar 7-vertex counterexample
already exists in `research/dgg-counterexample.ts` (demands 15,10,15; K₄
subdivision; min good cost 60 > 58 = cᵀx). Congestion-only DGG stands; the
*simultaneous cost* strengthening is what fails.

Rules:

- No floating point in the certificate.
- Enumerate or exact-price **all** routings; partial LPs give spurious positives.
- Path systems must be splice-closed.
- Deliver a runnable Bun verifier under `research/`, or an honest named obstruction.

If you only get partial results, keep going — partials are not wins.
