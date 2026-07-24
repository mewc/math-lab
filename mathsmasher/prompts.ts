import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RunState, TurnRecord } from "./types.ts";
import { pathExists } from "./state.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROMPT_DIR = join(HERE, "prompts");

const MAX_CONTEXT_CHARS = 12_000;
const MAX_TRANSCRIPT_TAIL = 8_000;
const MAX_PROGRESS_CHARS = 10_000;

async function loadTemplate(name: string): Promise<string> {
  return readFile(join(PROMPT_DIR, name), "utf8");
}

async function readContextFile(cwd: string, rel: string): Promise<string> {
  const abs = resolve(cwd, rel);
  if (!(await pathExists(abs))) {
    return `### ${rel}\n_(missing: ${abs})_\n`;
  }
  const body = await readFile(abs, "utf8");
  const clipped =
    body.length > MAX_CONTEXT_CHARS
      ? body.slice(0, MAX_CONTEXT_CHARS) + "\n\n…[truncated]\n"
      : body;
  return `### ${rel}\n\n${clipped}\n`;
}

export async function buildTurnPrompt(
  state: RunState,
  turnIndex: number,
  lastTurn: TurnRecord | null,
): Promise<string> {
  const system = await loadTemplate("system.md");
  const first = turnIndex === 1;
  const nudgeName =
    first
      ? "nudge-first.md"
      : state.campaign.nudgeMode === "gentle"
        ? "nudge-gentle.md"
        : "nudge-continue.md";
  const nudge = await loadTemplate(nudgeName);

  const parts: string[] = [];
  parts.push("# System\n\n" + system.trim());
  parts.push(
    `# Campaign\n\n- **Title:** ${state.campaign.title}\n- **Goal:** ${state.campaign.goal}\n- **Turn:** ${turnIndex} / budget ${state.campaign.maxTurns} (this invocation)\n- **Run dir:** ${state.runDir}\n- **Repo cwd:** ${state.campaign.cwd}\n`,
  );

  if (state.campaign.successCriteria) {
    parts.push(`# Success criteria\n\n${state.campaign.successCriteria}\n`);
  }

  parts.push(`# Problem\n\n${state.campaign.problem}\n`);

  if (state.campaign.contextPaths.length) {
    const chunks: string[] = ["# Context files\n"];
    for (const p of state.campaign.contextPaths) {
      chunks.push(await readContextFile(state.campaign.cwd, p));
    }
    parts.push(chunks.join("\n"));
  }

  const progressPath = join(state.runDir, "progress.md");
  if (await pathExists(progressPath)) {
    let progress = await readFile(progressPath, "utf8");
    if (progress.length > MAX_PROGRESS_CHARS) {
      progress = progress.slice(-MAX_PROGRESS_CHARS);
      progress = "…[earlier progress truncated]\n\n" + progress;
    }
    parts.push(`# Progress log\n\n${progress}\n`);
  }

  if (lastTurn) {
    let tail = "";
    try {
      const full = await readFile(lastTurn.transcriptPath, "utf8");
      tail =
        full.length > MAX_TRANSCRIPT_TAIL
          ? full.slice(-MAX_TRANSCRIPT_TAIL)
          : full;
    } catch {
      tail = lastTurn.summary;
    }
    parts.push(
      `# Previous turn (${lastTurn.adapter}, verdict=${lastTurn.verdict})\n\n` +
        `Summary: ${lastTurn.summary}\n\n` +
        `Transcript tail:\n\n\`\`\`\n${tail}\n\`\`\`\n`,
    );
  }

  parts.push(`# Instructions for this turn\n\n${nudge.trim()}\n`);

  return parts.join("\n---\n\n");
}
