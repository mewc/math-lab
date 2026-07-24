import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import type { RunState, Verdict } from "./types.ts";

export async function writeReport(state: RunState): Promise<{ mdPath: string; jsonPath: string }> {
  const mdPath = join(state.runDir, "report.md");
  const jsonPath = join(state.runDir, "report.json");

  const verdict = state.finalVerdict ?? lastVerdict(state) ?? "open";
  const md = renderMarkdown(state, verdict);
  const json = {
    runId: state.runId,
    runDir: state.runDir,
    title: state.campaign.title,
    goal: state.campaign.goal,
    finalVerdict: verdict,
    startedAt: state.startedAt,
    endedAt: state.endedAt,
    limitedAdapters: state.limitedAdapters,
    turns: state.turns,
    problem: state.campaign.problem,
  };

  await writeFile(mdPath, md, "utf8");
  await writeFile(jsonPath, JSON.stringify(json, null, 2) + "\n", "utf8");
  return { mdPath, jsonPath };
}

function lastVerdict(state: RunState): Verdict | null {
  if (!state.turns.length) return null;
  return state.turns[state.turns.length - 1].verdict;
}

function renderMarkdown(state: RunState, verdict: Verdict): string {
  const lines: string[] = [];
  lines.push(`# mathsmasher report — ${state.campaign.title}`);
  lines.push("");
  lines.push(`- **Run id:** \`${state.runId}\``);
  lines.push(`- **Run dir:** \`${state.runDir}\``);
  lines.push(`- **Final verdict:** **${verdict}**`);
  lines.push(`- **Goal:** ${state.campaign.goal}`);
  lines.push(`- **Started:** ${state.startedAt}`);
  lines.push(`- **Ended:** ${state.endedAt ?? "(in progress)"}`);
  lines.push(`- **Turns:** ${state.turns.length}`);
  if (state.limitedAdapters.length) {
    lines.push(`- **Limited adapters:** ${state.limitedAdapters.join(", ")}`);
  }
  lines.push("");
  lines.push("## Problem");
  lines.push("");
  lines.push(state.campaign.problem.trim());
  lines.push("");
  lines.push("## Turns");
  lines.push("");
  lines.push("| # | Role | Adapter | Verdict | Verifier exit | Summary |");
  lines.push("|---|------|---------|---------|---------------|---------|");
  for (const t of state.turns) {
    const v =
      t.verifierExitCode === null || t.verifierExitCode === undefined
        ? "—"
        : String(t.verifierExitCode);
    const sum = t.summary.replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 120);
    const role = t.role ?? "solo";
    lines.push(`| ${t.index} | ${role} | ${t.adapter} | ${t.verdict} | ${v} | ${sum} |`);
  }
  lines.push("");

  const best = [...state.turns]
    .reverse()
    .find((t) => t.verdict === "proven" || t.verdict === "disproven");
  if (best?.claimedVerifier) {
    lines.push("## Certificate");
    lines.push("");
    lines.push(`- Verifier: \`${best.claimedVerifier}\``);
    lines.push(`- Claimed by turn ${best.index} (${best.adapter})`);
    lines.push("");
  }

  if (verdict === "open" || verdict === "partial") {
    lines.push("## Jump-in prompt (still open)");
    lines.push("");
    lines.push("```");
    lines.push(
      "Please continue research and find a complete unconditional proof or counterexample. " +
        "Partial results are not enough. Exact-integer exhaustive certificate required.",
    );
    lines.push("```");
    lines.push("");
    lines.push(`Resume: \`mathsmasher resume ${state.runId} --extra-turns 5\``);
    lines.push("");
  }

  lines.push("## Artifacts");
  lines.push("");
  lines.push(`- Progress: \`${join(state.runDir, "progress.md")}\``);
  lines.push(`- Turns: \`${join(state.runDir, "turns")}\``);
  lines.push(`- Artifacts: \`${join(state.runDir, "artifacts")}\``);
  lines.push("");

  return lines.join("\n");
}

export function exitCodeForVerdict(verdict: Verdict): number {
  if (verdict === "proven" || verdict === "disproven") return 0;
  if (verdict === "blocked") return 0;
  if (verdict === "error") return 1;
  // open / partial — budget exhausted without terminal success
  return 2;
}
