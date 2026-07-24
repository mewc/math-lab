# mathsmasher

Terminal-only multi-model loop for attacking open math problems. Yeet a
conjecture at **Claude** and **Grok** (adapter-based) for **N turns**, ignore
partial celebrations, stop only on a machine-checkable proof/counterexample (or
budget / honest block).

No website. No app routes. Just a tool.

## Quick start

```bash
# Offline smoke (mock adapter — no API)
bun run mathsmasher -- run --dry-run --turns 3 --problem "test smash"

# Brains (Grok Build) + judge (OpenCode) — recommended
bun run mathsmasher -- run \
  --brains grok \
  --judge opencode \
  --turns 8 \
  --campaign mathsmasher/campaigns/gallai-paths.md

# Free-text problem
bun run mathsmasher -- run \
  --brains grok \
  --judge opencode \
  --turns 10 \
  --problem "Prove or disprove … with an exact Bun verifier"
```

After a few turns of partial noise, the continue nudge is the same energy as:

> please continue research and find a complete unconditional counterexample  
> it's enough of partial results. let's finish with a complete unconditional counterexample

## Install on PATH (optional)

From this repo:

```bash
bun link
# or
alias mathsmasher='bun /Users/mewc/code/mewc/math-lab/mathsmasher/cli.ts'
```

`package.json` exposes `"bin": { "mathsmasher": "./mathsmasher/cli.ts" }`.

## Commands

| Command | What |
|--------|------|
| `run` | Start a campaign |
| `resume <id>` | More turns on an existing run |
| `status <id>` | JSON snapshot |
| `report <id>` | Print report.md |
| `list` | Run ids under run root |
| `adapters` | Known adapter names |

### Useful flags

| Flag | Default | |
|------|---------|--|
| `--turns N` | 10 | Max turns |
| `--adapters a,b` | `claude,grok` | Round-robin |
| `--nudge aggressive\|gentle` | aggressive | Partials ignored when aggressive |
| `--dry-run` | off | Mock adapter only |
| `--cwd DIR` | process cwd | Where agents may write research code |
| `--run-root DIR` | `~/.mathsmasher/runs` | Run bookkeeping |
| `--problem-stdin` | | Read problem from stdin |

## How it works

1. Creates a run directory under `~/.mathsmasher/runs/<id>/`.
2. Each turn: pick next adapter → build prompt (system + problem + context + progress + nudge) → run CLI agent → parse `<status>` footer.
3. If agent claims `proven`/`disproven`, **mathsmasher runs the claimed verifier with Bun**. Exit 0 required or the claim is downgraded to `partial`.
4. Aggressive nudge keeps pushing past partials until success, block, or budget.
5. Writes `report.md` + `report.json`.

Exit codes: `0` success/blocked, `2` budget exhausted still open/partial, `1` hard error.

## Adapters

Implement `AgentAdapter` in `adapters/` and register in `adapters/registry.ts`.

| Name | Command (default) |
|------|-------------------|
| `claude` | `claude -p --dangerously-skip-permissions --output-format text` |
| `grok` | `grok -p … --always-approve --output-format plain` |
| `mock` | In-process scripted turns (dry-run) |

Env overrides: `MATHSMASHER_CLAUDE_BIN`, `MATHSMASHER_CLAUDE_ARGS`, `MATHSMASHER_GROK_BIN`, `MATHSMASHER_GROK_ARGS`, `MATHSMASHER_RUN_ROOT`.

## Programmatic

```ts
import { runCampaign } from "./mathsmasher/loop.ts";

const result = await runCampaign({
  title: "DGG",
  problem: "Construct a counterexample to …",
  maxTurns: 12,
  adapters: ["claude", "grok"],
  contextPaths: ["research/dgg-goemans.md"],
  goal: "disprove",
});
```

## Landing a win in Math Lab

mathsmasher does **not** edit the website registry. When a report shows a green
verifier, use the `tackle-conjecture` skill to land `lib/problems.ts` + notes
honestly.

## Example campaign

See `campaigns/dgg-general-counterexample.md`.
