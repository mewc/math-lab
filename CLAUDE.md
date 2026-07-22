# Math Lab — Claude notes

Standalone **island** app (see root `CLAUDE.md`): own `bun.lock`, outside the
root Bun workspace, zero `@grokx/*` deps. Keep it portable — it must be liftable
out of this monorepo as-is. Do not import from `packages/*`.

- Next.js App Router + React, TypeScript, no other runtime deps. Port **4708**.
- Generalization of `apps/collatz-lab`: one searchable index of open math
  problems. The homepage is a search bar over `lib/problems.ts` (the registry);
  `/p/[slug]` renders a dossier scaffold per problem.
- The **Collatz dossier is a copy**, not a dependency: `app/p/collatz/` and the
  shared components/lib were imported from `apps/collatz-lab`, which remains its
  own untouched island. Don't create cross-app imports between the two.
- To tackle a new problem: add notes / promote `stage` in its registry entry;
  when it earns real instruments, graduate it to its own `app/p/<slug>/`
  directory (which shadows the generic `[slug]` route — that's how Collatz and
  the 1/3–2/3 dossier work; set `href` on the entry too).
- Research campaigns live in `research/` (Bun scripts, run with
  `bun run research/iterationN.ts`; log in `research/RESEARCH.md`). Checked-in
  datasets for instruments are generated (e.g. `research/emit-data.ts` →
  `lib/onethird-data.ts`) — regenerate, don't hand-edit.
- No database, no auth, no server code — client-side computation only
  (Collatz math is BigInt-exact in `lib/collatz.ts`; keep it that way).
- Charts are hand-rolled inline SVG; don't add a chart library.
- Content accuracy matters more than usual: statements and statuses in
  `lib/problems.ts` are honest research claims. "Open" means open; partial
  results get named; keep quantifiers precise (almost all ≠ all) when editing.
- Dev: `bun install && bun run dev`. Checks: `bun run typecheck`, `bun run build`.
