---
title: Gallai path decomposition — small-n certificates & tight families
goal: either
brains: [grok]
judge: opencode
context: []
---

Attack **Gallai's path decomposition conjecture** (niche graph theory — not a
social-media favorite):

> The edges of every connected graph on n vertices can be decomposed into at
> most ⌈n/2⌉ paths.

Status in Math Lab (`gallai-paths`): open. Known for several classes (even-degree
vertices forming a forest; planar announced; etc.). The full statement for all
connected graphs remains open.

## What to deliver this campaign

Prefer **machine-checkable** progress over popularization:

1. **Exact small-n verification engine** (Bun/TS, exact): for every connected
   graph on n ≤ N (start N=6 or 7, push if feasible), either find a path
   decomposition with ≤ ⌈n/2⌉ paths or emit a counterexample certificate.
2. **Tight examples**: graphs that need exactly ⌈n/2⌉ paths — catalog and prove
   tightness (drives induction strategy).
3. If you claim a full proof or counterexample: exhaustive exact certificate only.

## Rules

- No fabricated enumeration counts.
- Prefer adjacency-list certificates and path lists checkable in Bun.
- Write verifiers under `research/gallai-*.ts` or the run `artifacts/` dir.
- Partials (heuristics that usually work) are not wins.

Registry slug: `gallai-paths`.
