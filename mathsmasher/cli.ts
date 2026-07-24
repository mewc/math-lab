#!/usr/bin/env bun
/**
 * mathsmasher — multi-model conjecture attack loop (CLI).
 *
 *   bun run mathsmasher -- run --problem "..." --turns 10
 *   bun run mathsmasher -- run --campaign path.md --turns 20
 *   bun run mathsmasher -- run --dry-run --turns 3 --problem "test"
 *   bun run mathsmasher -- resume <run-id> --extra-turns 5
 *   bun run mathsmasher -- status <run-id>
 *   bun run mathsmasher -- report <run-id>
 */

import { readFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCampaign } from "./loop.ts";
import {
  defaultRunRoot,
  findRun,
  listRuns,
  loadRun,
  defaultCwd,
} from "./state.ts";
import type { CampaignInput, Goal, NudgeMode } from "./types.ts";
import { writeReport } from "./report.ts";
import { listAdapters } from "./adapters/registry.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    printHelp();
    process.exit(0);
  }

  const cmd = argv[0];
  const rest = argv.slice(1);

  try {
    switch (cmd) {
      case "run":
        process.exit(await cmdRun(rest));
      case "resume":
        process.exit(await cmdResume(rest));
      case "status":
        process.exit(await cmdStatus(rest));
      case "report":
        process.exit(await cmdReport(rest));
      case "list":
        process.exit(await cmdList(rest));
      case "adapters":
        console.log(listAdapters().join("\n"));
        process.exit(0);
      default:
        // Allow `mathsmasher --problem ...` as alias for run
        if (cmd.startsWith("-")) {
          process.exit(await cmdRun(argv));
        }
        console.error(`Unknown command: ${cmd}`);
        printHelp();
        process.exit(1);
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

async function cmdRun(args: string[]): Promise<number> {
  const flags = parseFlags(args);
  let problem = str(flags.problem) ?? "";
  let title = str(flags.title);
  let contextPaths = multi(flags.context);
  let goal = str(flags.goal) as Goal | undefined;
  let adapters = str(flags.adapters)
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let brains = str(flags.brains)
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let judge = str(flags.judge);
  let successCriteria: string | undefined;
  let campaignProblem = "";

  if (flags.campaign) {
    const loaded = await loadCampaignFile(String(flags.campaign));
    campaignProblem = loaded.problem;
    title = title ?? loaded.title;
    contextPaths = contextPaths.length ? contextPaths : loaded.context;
    goal = goal ?? loaded.goal;
    adapters = adapters ?? loaded.adapters;
    brains = brains ?? loaded.brains;
    judge = judge ?? loaded.judge;
    successCriteria = loaded.successCriteria;
  }

  if (flags["problem-stdin"] || flags.problemStdin) {
    problem = await readStdin();
  }

  if (!problem.trim() && campaignProblem.trim()) {
    problem = campaignProblem;
  } else if (problem.trim() && campaignProblem.trim()) {
    // Free-text problem overrides body but keep meta from campaign
    // (user yeeted a follow-up)
  } else if (!problem.trim()) {
    throw new Error("Provide --problem, --problem-stdin, or --campaign");
  }

  const input: CampaignInput = {
    title: title ?? "mathsmasher run",
    problem,
    goal: goal ?? "either",
    successCriteria,
    contextPaths,
    maxTurns: num(flags.turns) ?? 10,
    brains: brains ?? adapters,
    judge,
    adapters,
    nudgeMode: (str(flags.nudge) as NudgeMode) ?? "aggressive",
    cwd: str(flags.cwd),
    runRoot: str(flags["run-root"] ?? flags.runRoot),
    dryRun: Boolean(flags["dry-run"] ?? flags.dryRun),
    noTools: Boolean(flags["no-tools"] ?? flags.noTools),
    timeoutMs: num(flags.timeout) ? num(flags.timeout)! * 1000 : undefined,
  };

  const result = await runCampaign(input);
  console.log(JSON.stringify({ runId: result.runId, runDir: result.runDir, verdict: result.verdict }, null, 2));
  return result.exitCode;
}

async function cmdResume(args: string[]): Promise<number> {
  const runId = args.find((a) => !a.startsWith("-"));
  if (!runId) throw new Error("usage: mathsmasher resume <run-id> [--extra-turns N]");
  const flags = parseFlags(args.filter((a) => a !== runId));
  const runRoot = str(flags["run-root"] ?? flags.runRoot) ?? defaultRunRoot();

  const found = await findRun(runRoot, runId);
  if (!found) throw new Error(`Run not found: ${runId} under ${runRoot}`);

  const result = await runCampaign({
    problem: "", // unused on resume
    resumeId: runId,
    runRoot,
    extraTurns: num(flags["extra-turns"] ?? flags.extraTurns) ?? num(flags.turns) ?? 5,
    adapters: str(flags.adapters)
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    nudgeMode: str(flags.nudge) as NudgeMode | undefined,
    dryRun: Boolean(flags["dry-run"] ?? flags.dryRun),
    noTools: Boolean(flags["no-tools"] ?? flags.noTools),
  });
  console.log(JSON.stringify({ runId: result.runId, verdict: result.verdict }, null, 2));
  return result.exitCode;
}

async function cmdStatus(args: string[]): Promise<number> {
  const runId = args.find((a) => !a.startsWith("-"));
  if (!runId) throw new Error("usage: mathsmasher status <run-id>");
  const flags = parseFlags(args.filter((a) => a !== runId));
  const runRoot = str(flags["run-root"] ?? flags.runRoot) ?? defaultRunRoot();
  const state = await loadRun(runRoot, runId);
  console.log(
    JSON.stringify(
      {
        runId: state.runId,
        runDir: state.runDir,
        title: state.campaign.title,
        finalVerdict: state.finalVerdict,
        turns: state.turns.length,
        limitedAdapters: state.limitedAdapters,
        last: state.turns[state.turns.length - 1] ?? null,
      },
      null,
      2,
    ),
  );
  return 0;
}

async function cmdReport(args: string[]): Promise<number> {
  const runId = args.find((a) => !a.startsWith("-"));
  if (!runId) throw new Error("usage: mathsmasher report <run-id>");
  const flags = parseFlags(args.filter((a) => a !== runId));
  const runRoot = str(flags["run-root"] ?? flags.runRoot) ?? defaultRunRoot();
  const state = await loadRun(runRoot, runId);
  const { mdPath } = await writeReport(state);
  const md = await readFile(mdPath, "utf8");
  console.log(md);
  return 0;
}

async function cmdList(args: string[]): Promise<number> {
  const flags = parseFlags(args);
  const runRoot = str(flags["run-root"] ?? flags.runRoot) ?? defaultRunRoot();
  const runs = await listRuns(runRoot);
  if (!runs.length) {
    console.log(`(no runs under ${runRoot})`);
    return 0;
  }
  for (const id of runs) console.log(id);
  return 0;
}

interface CampaignFile {
  title?: string;
  problem: string;
  goal?: Goal;
  adapters?: string[];
  brains?: string[];
  judge?: string;
  context: string[];
  successCriteria?: string;
}

async function loadCampaignFile(path: string): Promise<CampaignFile> {
  const abs = resolve(defaultCwd(), path);
  const raw = await readFile(abs, "utf8");
  const { front, body } = splitFrontmatter(raw);
  const title = front.title ? String(front.title) : undefined;
  const goal = front.goal as Goal | undefined;
  let adapters: string[] | undefined;
  if (Array.isArray(front.adapters)) {
    adapters = front.adapters.map(String);
  } else if (typeof front.adapters === "string") {
    adapters = front.adapters.split(",").map((s) => s.trim());
  }
  let brains: string[] | undefined;
  if (Array.isArray(front.brains)) {
    brains = front.brains.map(String);
  } else if (typeof front.brains === "string") {
    brains = front.brains.split(",").map((s) => s.trim());
  }
  const judge = front.judge ? String(front.judge) : undefined;
  let context: string[] = [];
  if (Array.isArray(front.context)) {
    context = front.context.map(String);
  }
  return {
    title,
    problem: body.trim(),
    goal,
    adapters,
    brains,
    judge,
    context,
    successCriteria: front.successCriteria
      ? String(front.successCriteria)
      : front.success_criteria
        ? String(front.success_criteria)
        : undefined,
  };
}

/** Minimal YAML-ish frontmatter: key: value or key: [a, b] */
function splitFrontmatter(raw: string): { front: Record<string, unknown>; body: string } {
  if (!raw.startsWith("---")) {
    return { front: {}, body: raw };
  }
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return { front: {}, body: raw };
  const fm = raw.slice(4, end).trim();
  const body = raw.slice(end + 4).replace(/^\s*\n/, "");
  const front: Record<string, unknown> = {};
  let listKey: string | null = null;
  let listAcc: string[] = [];

  const flushList = () => {
    if (listKey) {
      front[listKey] = listAcc;
      listKey = null;
      listAcc = [];
    }
  };

  for (const line of fm.split("\n")) {
    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && listKey) {
      listAcc.push(listItem[1].replace(/^["']|["']$/g, "").trim());
      continue;
    }
    flushList();
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2].trim();
    if (val === "" || val === "|" || val === ">") {
      listKey = key;
      listAcc = [];
      continue;
    }
    if (val.startsWith("[") && val.endsWith("]")) {
      front[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
      continue;
    }
    front[key] = val.replace(/^["']|["']$/g, "");
  }
  flushList();
  return { front, body };
}

function parseFlags(args: string[]): Record<string, string | boolean | string[]> {
  const out: Record<string, string | boolean | string[]> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = args[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = true;
    } else if (key === "context") {
      const arr = (out[key] as string[] | undefined) ?? [];
      arr.push(next);
      out[key] = arr;
      i++;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function str(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  return undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
}

function multi(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") return [v];
  return [];
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function printHelp() {
  const campaignExample = join(HERE, "campaigns", "dgg-general-counterexample.md");
  console.log(`mathsmasher — multi-model conjecture attack loop

USAGE:
  mathsmasher run [options]
  mathsmasher resume <run-id> [--extra-turns N]
  mathsmasher status <run-id>
  mathsmasher report <run-id>
  mathsmasher list
  mathsmasher adapters

RUN OPTIONS:
  --problem <text>         Problem statement
  --problem-stdin          Read problem from stdin
  --campaign <file.md>     Campaign markdown (YAML frontmatter + body)
  --title <text>           Run title
  --turns <n>              Max turns (default 10)
  --brains a,b             Research agents, round-robin (default grok)
  --judge <name>           Review each turn (e.g. opencode)
  --adapters a,b           Alias for --brains
  --nudge aggressive|gentle
  --context <path>         Extra context file (repeatable)
  --goal prove|disprove|either
  --cwd <dir>              Repo agents may edit (default: cwd)
  --run-root <dir>         Run state root (default: ~/.mathsmasher/runs)
  --dry-run                Use mock adapter only (no API calls)
  --no-tools               Safer agent flags (less write power)
  --timeout <seconds>      Per-turn timeout (default 1800)

EXAMPLES:
  bun run mathsmasher -- run --dry-run --turns 3 --problem "test smash"
  bun run mathsmasher -- run --campaign mathsmasher/campaigns/gallai-paths.md --turns 8
  bun run mathsmasher -- run --brains grok --judge opencode --turns 10 --problem "…"

ENV:
  MATHSMASHER_RUN_ROOT, MATHSMASHER_GROK_BIN, MATHSMASHER_GROK_ARGS,
  MATHSMASHER_OPENCODE_BIN, MATHSMASHER_OPENCODE_ARGS, MATHSMASHER_OPENCODE_MODEL,
  MATHSMASHER_CLAUDE_BIN, MATHSMASHER_CLAUDE_ARGS

Adapters: ${listAdapters().join(", ")}
`);
}

main();
