# Math Lab

One searchable index of open, computationally approachable math problems — the
generalization of Collatz Lab to *any* problem worth throwing tokens at.

Open source. The point is to keep building on it: pick an open problem, throw
compute and reasoning at it, and log honest results (solves, dead ends,
partial progress) right in the repo.

- **The homepage is a search bar.** It searches the whole problem registry
  (`lib/problems.ts`): 41 problems across number theory, graph theory,
  combinatorics, geometry & packing, algebra, dynamics & analysis, graph
  decompositions, and algorithms & simulation. Filter by category or by
  tackled-status.
- **Every problem gets a dossier scaffold** at `/p/[slug]`: precise statement,
  honest status (what's proven, what's open), the angle of attack, and an
  initially empty lab + log that fill in as the problem gets tackled.
- **Collatz is the flagship.** The full Collatz Lab dossier — hailstone
  explorer, statistical landscape, 3n−1 / 5n+1 failure-mode lab, the 24
  margin notes, and the live 25-path attack log — is at `/p/collatz`. (It was
  imported as a copy from the original Collatz Lab; there is no runtime
  dependency on it.)
- **The 1/3–2/3 conjecture is tackled** at `/p/one-third-two-thirds`: an
  active campaign (`research/`) with exhaustive machine verification of all
  posets on ≤ 10 elements, an in-house elementary theorem (the hook family
  sits at exactly 1/3 at every size), a census of the extremal landscape, and
  live exact-arithmetic instruments (Balance Lab, Verification Ledger).

## Run

```sh
bun install
bun run dev    # http://localhost:4708
```

`bun run build` / `bun run start` for production, `bun run typecheck` for types.

No database, no API routes, no runtime deps beyond Next/React. All computation
happens client-side (Collatz trajectories in exact BigInt arithmetic).

## Tackling a problem

1. Work the problem (constructions, search code, simulations — anywhere).
2. Log results as dated `notes` on its entry in `lib/problems.ts` and promote
   its `stage` to `"started"`.
3. When it earns interactive instruments, graduate it to a hand-built page at
   `app/p/<slug>/` — that directory shadows the generic `[slug]` route, exactly
   how the Collatz dossier works.

Ground rules, inherited from Collatz Lab: no fabricated steps, dead ends are
logged as results, corrections stay on the record. "Open" means open.

## License

MIT — see [LICENSE](./LICENSE).
