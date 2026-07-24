import { getAdapter } from "./adapters/registry.ts";
import { gateStatus, parseStatus } from "./judge.ts";
import { buildTurnPrompt } from "./prompts.ts";
import { writeReport, exitCodeForVerdict } from "./report.ts";
import {
  appendProgress,
  createRun,
  loadRun,
  normalizeCampaign,
  saveState,
  turnPaths,
  writeTurnFiles,
  defaultRunRoot,
} from "./state.ts";
import type { CampaignInput, RunResult, RunState, TurnRecord, Verdict } from "./types.ts";

export type { CampaignInput, RunResult } from "./types.ts";

/**
 * Run (or resume) a mathsmasher campaign.
 */
export async function runCampaign(input: CampaignInput): Promise<RunResult> {
  let state: RunState;
  let turnsThisInvocation: number;

  if (input.resumeId) {
    const runRoot = input.runRoot ?? defaultRunRoot();
    state = await loadRun(runRoot, input.resumeId);
    // Allow overriding a few knobs on resume
    if (input.nudgeMode) state.campaign.nudgeMode = input.nudgeMode;
    if (input.noTools !== undefined) state.campaign.noTools = input.noTools;
    if (input.timeoutMs) state.campaign.timeoutMs = input.timeoutMs;
    if (input.adapters?.length && !input.dryRun) {
      state.campaign.adapters = input.adapters;
    }
    if (input.dryRun) {
      state.campaign.adapters = ["mock"];
      state.campaign.dryRun = true;
    }
    turnsThisInvocation = input.extraTurns ?? input.maxTurns ?? state.campaign.maxTurns;
    state.campaign.maxTurns = state.turns.length + turnsThisInvocation;
  } else {
    if (!input.problem?.trim()) {
      throw new Error("runCampaign requires problem text (or resumeId)");
    }
    const campaign = normalizeCampaign(input);
    state = await createRun(campaign);
    turnsThisInvocation = campaign.maxTurns;
  }

  log(`mathsmasher — ${state.campaign.title}`);
  log(`  run:    ${state.runDir}`);
  log(`  cwd:    ${state.campaign.cwd}`);
  log(`  adapters: ${state.campaign.adapters.join(" → ")}`);
  log(`  turns this run: ${turnsThisInvocation}`);

  let stop = false;
  let hardError = false;

  for (let i = 0; i < turnsThisInvocation; i++) {
    const turnIndex = state.turns.length + 1;
    const adapterName = await pickAdapter(state);
    if (!adapterName) {
      log("All adapters limited or unavailable — stopping.");
      hardError = true;
      state.finalVerdict = "error";
      break;
    }

    const adapter = getAdapter(adapterName);
    const lastTurn = state.turns.length ? state.turns[state.turns.length - 1] : null;
    const prompt = await buildTurnPrompt(state, turnIndex, lastTurn);
    const paths = turnPaths(state.runDir, turnIndex, adapterName);

    log(`\n═══ Turn ${turnIndex} · ${adapterName} ═══`);

    const startedAt = new Date().toISOString();
    let text = "";
    let exitCode = 1;
    let limited = false;

    try {
      const result = await adapter.run({
        prompt,
        cwd: state.campaign.cwd,
        runDir: state.runDir,
        turn: turnIndex,
        timeoutMs: state.campaign.timeoutMs,
        noTools: state.campaign.noTools,
      });
      text = result.text;
      exitCode = result.exitCode;
      limited = Boolean(result.limited);
    } catch (e) {
      text = `Adapter error: ${e instanceof Error ? e.message : String(e)}`;
      exitCode = 1;
    }

    if (limited) {
      if (!state.limitedAdapters.includes(adapterName)) {
        state.limitedAdapters.push(adapterName);
      }
      log(`  ⚠ ${adapterName} hit a usage limit — will skip later.`);
      // Retry this turn slot with next adapter if possible
      const alt = await pickAdapter(state);
      if (alt && alt !== adapterName) {
        log(`  retrying turn with ${alt}…`);
        // don't record the limited attempt as a full research turn; advance index only
        state.nextAdapterIndex =
          (state.campaign.adapters.indexOf(adapterName) + 1) %
          Math.max(state.campaign.adapters.length, 1);
        i -= 1; // re-do this iteration slot
        await saveState(state);
        continue;
      }
    }

    const parsed = parseStatus(text);
    const gated = await gateStatus(parsed, state.campaign.cwd);
    const status = gated.status;
    const endedAt = new Date().toISOString();

    const record: TurnRecord = {
      index: turnIndex,
      adapter: adapterName,
      startedAt,
      endedAt,
      promptPath: paths.promptPath,
      transcriptPath: paths.transcriptPath,
      statusPath: paths.statusPath,
      verdict: status.verdict,
      summary: status.summary,
      claimedVerifier: status.claimedVerifier,
      verifierExitCode: gated.verifierExitCode,
      nextHint: status.nextHint,
      limited,
      exitCode,
    };

    await writeTurnFiles(state, record, prompt, text, status);
    state.turns.push(record);
    advanceAdapter(state, adapterName);

    await appendProgress(
      state,
      `## Turn ${turnIndex} (${adapterName}) — ${status.verdict}\n\n` +
        `${status.summary}\n\n` +
        (status.nextHint ? `**Next:** ${status.nextHint}\n\n` : "") +
        (status.claimedVerifier
          ? `**Verifier:** \`${status.claimedVerifier}\` (exit ${gated.verifierExitCode ?? "n/a"})\n\n`
          : ""),
    );

    log(`  verdict: ${status.verdict}`);
    if (status.summary) log(`  ${status.summary.slice(0, 200)}`);

    await saveState(state);

    if (
      (status.verdict === "proven" || status.verdict === "disproven") &&
      gated.verifierExitCode === 0
    ) {
      state.finalVerdict = status.verdict;
      stop = true;
      log(`\n✓ Terminal success: ${status.verdict}`);
      break;
    }

    if (status.verdict === "blocked" && status.terminal) {
      state.finalVerdict = "blocked";
      stop = true;
      log(`\n■ Blocked (terminal): ${status.summary.slice(0, 200)}`);
      break;
    }

    if (status.verdict === "error" && exitCode !== 0 && limited === false) {
      // non-fatal: keep going unless adapter completely failed and no text
      if (!text.trim()) {
        hardError = true;
        state.finalVerdict = "error";
        break;
      }
    }
  }

  if (!stop && !hardError) {
    state.finalVerdict = deriveOpenVerdict(state);
    log(`\nTurn budget done — final verdict: ${state.finalVerdict}`);
  }

  state.endedAt = new Date().toISOString();
  await saveState(state);
  const { mdPath } = await writeReport(state);

  const verdict = state.finalVerdict ?? "open";
  const code = hardError ? 1 : exitCodeForVerdict(verdict);

  log(`\nReport: ${mdPath}`);
  log(`Exit: ${code} (${verdict})`);

  return {
    runId: state.runId,
    runDir: state.runDir,
    verdict,
    turns: state.turns,
    reportPath: mdPath,
    exitCode: code,
  };
}

function deriveOpenVerdict(state: RunState): Verdict {
  const last = state.turns[state.turns.length - 1];
  if (!last) return "open";
  if (last.verdict === "partial") return "partial";
  if (last.verdict === "error") return "error";
  return "open";
}

async function pickAdapter(state: RunState): Promise<string | null> {
  const names = state.campaign.adapters;
  if (!names.length) return null;

  for (let attempt = 0; attempt < names.length; attempt++) {
    const idx = (state.nextAdapterIndex + attempt) % names.length;
    const name = names[idx];
    if (state.limitedAdapters.includes(name)) continue;

    try {
      const adapter = getAdapter(name);
      if (await adapter.available()) {
        state.nextAdapterIndex = idx;
        return name;
      }
      log(`  adapter ${name} not available on PATH — skipping`);
    } catch {
      log(`  unknown adapter ${name} — skipping`);
    }
  }
  return null;
}

function advanceAdapter(state: RunState, used: string): void {
  const names = state.campaign.adapters;
  const i = names.indexOf(used);
  state.nextAdapterIndex = ((i >= 0 ? i : state.nextAdapterIndex) + 1) % Math.max(names.length, 1);
}

function log(msg: string): void {
  console.error(msg);
}
