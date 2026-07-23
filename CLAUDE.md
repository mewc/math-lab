# Math Lab — Claude notes

Standalone open-source repo (`github.com/mewc/math-lab`): own `bun.lock`,
Next.js + React + TypeScript, **zero runtime deps beyond Next/React**. It was
extracted from the `drummerduck-apps` monorepo (2026-07-23) and now lives on its
own — keep it self-contained (no external package deps, no DB, no server).

- Next.js App Router + React, TypeScript, no other runtime deps. Port **4708**.
- One searchable index of open math problems. The homepage is a search bar over
  `lib/problems.ts` (the registry); `/p/[slug]` renders a dossier scaffold per
  problem.
- The **Collatz dossier is a copy**, not a dependency: `app/p/collatz/` and the
  shared components/lib were imported from the original Collatz Lab. There is no
  runtime dependency on it — keep it self-contained.
- To tackle a new problem: add notes / promote `stage` in its registry entry;
  when it earns real instruments, graduate it to its own `app/p/<slug>/`
  directory (which shadows the generic `[slug]` route — that's how Collatz and
  the 1/3–2/3 dossier work; set `href` on the entry too).
- Research campaigns live in `research/` (Bun scripts, run with
  `bun run research/iterationN.ts`; log in `research/RESEARCH.md`). Checked-in
  datasets for instruments are generated (e.g. `research/emit-data.ts` →
  `lib/onethird-data.ts`) — regenerate, don't hand-edit.
- No database, no auth — client-side computation only (Collatz math is
  BigInt-exact in `lib/collatz.ts`; keep it that way). The **one** server seam
  is `app/api/feedback/route.ts`: the Submit/feedback modal relays a note to
  Slack via a bot token that must stay server-side (env `SLACK_BOT_TOKEN` +
  `SLACK_FEEDBACK_CHANNEL`; see `.env.example`). No new deps — plain `fetch`.
  Keep server code confined to that route.
- Charts are hand-rolled inline SVG; don't add a chart library.
- Content accuracy matters more than usual: statements and statuses in
  `lib/problems.ts` are honest research claims. "Open" means open; partial
  results get named; keep quantifiers precise (almost all ≠ all) when editing.
- Dev: `bun install && bun run dev`. Checks: `bun run typecheck`, `bun run build`.
