import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { mkdir, readFile, writeFile, readdir, access } from "node:fs/promises";
import type { Campaign, CampaignInput, RunState, TurnRecord } from "./types.ts";

const DEFAULT_RUN_ROOT = join(homedir(), ".mathsmasher", "runs");

export function defaultRunRoot(): string {
  return process.env.MATHSMASHER_RUN_ROOT?.trim() || DEFAULT_RUN_ROOT;
}

export function defaultCwd(explicit?: string): string {
  if (explicit) return resolve(explicit);
  return process.cwd();
}

export function slugify(text: string, max = 40): string {
  const s = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
  return s || "run";
}

export function makeRunId(title: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${ts}-${slugify(title)}`;
}

export function normalizeCampaign(input: CampaignInput): Campaign {
  const adapters =
    input.dryRun || input.adapters?.includes("mock")
      ? input.adapters?.length
        ? input.adapters
        : ["mock"]
      : input.adapters?.length
        ? input.adapters
        : ["claude", "grok"];

  return {
    id: input.resumeId ?? makeRunId(input.title ?? "smash"),
    title: input.title ?? "mathsmasher run",
    problem: input.problem,
    goal: input.goal ?? "either",
    successCriteria: input.successCriteria,
    contextPaths: input.contextPaths ?? [],
    maxTurns: input.maxTurns ?? 10,
    adapters: input.dryRun ? ["mock"] : adapters,
    nudgeMode: input.nudgeMode ?? "aggressive",
    cwd: defaultCwd(input.cwd),
    runRoot: resolve(input.runRoot ?? defaultRunRoot()),
    dryRun: input.dryRun,
    noTools: input.noTools,
    timeoutMs: input.timeoutMs ?? 30 * 60 * 1000,
  };
}

export async function createRun(campaign: Campaign): Promise<RunState> {
  const runId = campaign.id.includes("/") ? slugify(campaign.id) : campaign.id;
  const runDir = join(campaign.runRoot, runId);
  await mkdir(join(runDir, "turns"), { recursive: true });
  await mkdir(join(runDir, "artifacts"), { recursive: true });

  const state: RunState = {
    runId,
    runDir,
    campaign: { ...campaign, id: runId },
    turns: [],
    limitedAdapters: [],
    nextAdapterIndex: 0,
    finalVerdict: null,
    startedAt: new Date().toISOString(),
    endedAt: null,
  };

  await writeFile(join(runDir, "PROBLEM.md"), campaign.problem + "\n", "utf8");
  await writeFile(join(runDir, "progress.md"), `# Progress — ${campaign.title}\n\n`, "utf8");
  await saveState(state);
  return state;
}

export async function loadRun(runRoot: string, runId: string): Promise<RunState> {
  const runDir = join(resolve(runRoot), runId);
  const raw = await readFile(join(runDir, "state.json"), "utf8");
  return JSON.parse(raw) as RunState;
}

export async function saveState(state: RunState): Promise<void> {
  await writeFile(
    join(state.runDir, "state.json"),
    JSON.stringify(state, null, 2) + "\n",
    "utf8",
  );
  await writeFile(
    join(state.runDir, "campaign.json"),
    JSON.stringify(state.campaign, null, 2) + "\n",
    "utf8",
  );
}

export async function appendProgress(state: RunState, block: string): Promise<void> {
  const path = join(state.runDir, "progress.md");
  const prev = await readFile(path, "utf8").catch(() => "");
  await writeFile(path, prev + block + "\n", "utf8");
}

export async function writeTurnFiles(
  state: RunState,
  turn: TurnRecord,
  prompt: string,
  transcript: string,
  statusJson: unknown,
): Promise<void> {
  await writeFile(turn.promptPath, prompt, "utf8");
  await writeFile(turn.transcriptPath, transcript, "utf8");
  await writeFile(turn.statusPath, JSON.stringify(statusJson, null, 2) + "\n", "utf8");
}

export function turnPaths(runDir: string, index: number, adapter: string) {
  const pad = String(index).padStart(3, "0");
  const base = join(runDir, "turns", `${pad}-${adapter}`);
  return {
    promptPath: `${base}.prompt.md`,
    transcriptPath: `${base}.transcript.md`,
    statusPath: `${base}.status.json`,
  };
}

export async function findRun(runRoot: string, runId: string): Promise<string | null> {
  const dir = join(resolve(runRoot), runId);
  try {
    await access(join(dir, "state.json"));
    return dir;
  } catch {
    return null;
  }
}

export async function listRuns(runRoot: string): Promise<string[]> {
  const root = resolve(runRoot);
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort().reverse();
  } catch {
    return [];
  }
}

export async function readText(path: string): Promise<string> {
  return readFile(path, "utf8");
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
