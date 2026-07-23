# Contributing to Math Lab

Thanks for your interest! Math Lab is **one searchable index of open,
computationally approachable math problems** — each with a precise statement, an
honest status, and an attack plan. Tackled problems grow into live dossiers.

## Ground rules

- **Be a good citizen.** By contributing you agree to the [MIT License](LICENSE)
  and to keep discussion respectful and on-topic.
- **Content accuracy is paramount.** The statements and statuses in
  `lib/problems.ts` are honest research claims. "Open" means open; partial
  results must be named; keep quantifiers precise (**almost all ≠ all**). A PR
  that overstates a result will be sent back regardless of how nice the code is.
- **Keep it self-contained.** This repo has **zero runtime dependencies beyond
  Next and React** — no database, no auth, no server code, no chart library
  (charts are hand-rolled inline SVG), no analytics. Please don't add runtime
  deps without opening an issue to discuss first.
- **Math is BigInt-exact.** Numeric instruments (e.g. `lib/collatz.ts`) use
  exact `BigInt` arithmetic — keep it that way; no floats for exact claims.

## Local development

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev        # http://localhost:4708
```

Before opening a PR, make sure both checks pass (CI runs the same two):

```bash
bun run typecheck
bun run build
```

## How to add or advance a problem

1. Add or edit the registry entry in `lib/problems.ts` (statement, status,
   stage, attack notes). For most problems, that's all you need — the generic
   dossier route at `app/p/[slug]/page.tsx` renders it automatically.
2. When a problem earns real, hand-built instruments, graduate it to its own
   `app/p/<slug>/` directory (which shadows the generic route) and set `href`
   on its registry entry. Collatz and the 1/3–2/3 dossier work this way.
3. Research campaigns live in `research/` (Bun scripts). Any checked-in dataset
   consumed by an instrument is **generated** (e.g. `research/emit-data.ts` →
   `lib/onethird-data.ts`) — regenerate it, don't hand-edit.

## Pull request process

- Fork the repo and open your PR against `main`.
- Every PR gets a **Vercel Preview Deployment** so reviewers can click through
  your changes before merge.
- Keep PRs focused; describe *what* changed and *why*. If you're changing a
  research claim, cite your reasoning or computation.
- CI (typecheck + build) must be green. A maintainer review is requested
  automatically via CODEOWNERS.

Questions or a problem you'd like to see indexed? Open an issue — see the
templates under **New issue**.
