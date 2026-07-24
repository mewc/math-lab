import { getAdapter } from "./adapters/registry.ts";
import { gateStatus, parseStatus } from "./judge.ts";
import { buildJudgePrompt, buildTurnPrompt } from "./prompts.ts";
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
 * Each turn: brains agent researches → optional judge reviews → verifier gate.
 */
export async function runCampaign(input: CampaignInput): Promise<RunResult> {
  let state: RunState;
  let turnsThisInvocation: number;

  if (input.resumeId) {
    const runRoot = input.runRoot ?? defaultRunRoot();
    state = await loadRun(runRoot, input.resumeId);
    if (input.nudgeMode) state.campaign.nudgeMode = input.nudgeMode;
    if (input.noTools !== undefined) state.campaign.noTools = input.noTools;
    if (input.timeoutMs) state.campaign.timeoutMs = input.timeoutMs;
    if (input.brains?.length) {
      state.campaign.brains = input.brains;
      state.campaign.adapters = input.brains;
    } else if (input.adapters?.length && !input.dryRun) {
      state.campaign.adapters = input.adapters;
      state.campaign.brains = input.adapters;
    }
    if (input.judge !== undefined) state.campaign.judge = input.judge || undefined;
    if (input.dryRun) {
      state.campaign.brains = ["mock"];
      state.campaign.adapters = ["mock"];
      state.campaign.judge = undefined;
      state.campaign.dryRun = true;
    }
    // backfill brains on older runs
    if (!state.campaign.brains?.length) {
      state.campaign.brains = state.campaign.adapters?.length
        ? state.campaign.adapters
        : ["grok"];
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

  const brainsList = brainsOf(state);
  log(`mathsmasher — ${state.campaign.title}`);
  log(`  run:    ${state.runDir}`);
  log(`  cwd:    ${state.campaign.cwd}`);
  log(`  brains: ${brainsList.join(" → ")}`);
  log(`  judge:  ${state.campaign.judge ?? "(none — machine verifier only)"}`);
  log(`  turns this run: ${turnsThisInvocation}`);

  let stop = false;
  let hardError = false;

  for (let i = 0; i < turnsThisInvocation; i++) {
    const turnIndex = state.turns.length + 1;
    const brainsName = await pickBrains(state);
    if (!brainsName) {
      log("All brains adapters limited or unavailable — stopping.");
      hardError = true;
      state.finalVerdict = "error";
      break;
    }

    const brains = getAdapter(brainsName);
    const lastTurn = state.turns.length ? state.turns[state.turns.length - 1] : null;
    const prompt = await buildTurnPrompt(state, turnIndex, lastTurn);
    const paths = turnPaths(state.runDir, turnIndex, brainsName);

    log(`\n═══ Turn ${turnIndex} · brains=${brainsName} ═══`);

    const startedAt = new Date().toISOString();
    let brainsText = "";
    let brainsExit = 1;
    let limited = false;

    try {
      const result = await brains.run({
        prompt,
        cwd: state.campaign.cwd,
        runDir: state.runDir,
        turn: turnIndex,
        timeoutMs: state.campaign.timeoutMs,
        noTools: state.campaign.noTools,
      });
      brainsText = result.text;
      brainsExit = result.exitCode;
      limited = Boolean(result.limited);
    } catch (e) {
      brainsText = `Adapter error: ${e instanceof Error ? e.message : String(e)}`;
      brainsExit = 1;
    }

    if (limited) {
      if (!state.limitedAdapters.includes(brainsName)) {
        state.limitedAdapters.push(brainsName);
      }
      log(`  ⚠ ${brainsName} hit a usage limit — will skip later.`);
      const alt = await pickBrains(state);
      if (alt && alt !== brainsName) {
        log(`  retrying turn with brains=${alt}…`);
        state.nextAdapterIndex =
          (brainsList.indexOf(brainsName) + 1) % Math.max(brainsList.length, 1);
        i -= 1;
        await saveState(state);
        continue;
      }
    }

    // Persist brains raw output
    await writeTurnFiles(
      state,
      {
        index: turnIndex,
        adapter: brainsName,
        role: "brains",
        startedAt,
        endedAt: new Date().toISOString(),
        promptPath: paths.promptPath,
        transcriptPath: paths.transcriptPath,
        statusPath: paths.statusPath.replace(".status.json", ".brains-status.json"),
        verdict: "open",
        summary: "",
        claimedVerifier: null,
        verifierExitCode: null,
        nextHint: "",
        limited,
        exitCode: brainsExit,
      },
      prompt,
      brainsText,
      parseStatus(brainsText),
    );

    let finalText = brainsText;
    let finalAdapter = brainsName;
    let role: TurnRecord["role"] = state.campaign.judge ? "brains" : "solo";
    let judgePaths: ReturnType<typeof turnPaths> | null = null;

    // --- optional judge pass ---
    if (state.campaign.judge) {
      const judgeName = state.campaign.judge;
      try {
        const judgeAdapter = getAdapter(judgeName);
        if (!(await judgeAdapter.available())) {
          log(`  judge ${judgeName} unavailable — using brains status only`);
        } else {
          log(`  · judge=${judgeName} reviewing…`);
          const brainsStatus = parseStatus(brainsText);
          const judgePrompt = await buildJudgePrompt(
            state,
            turnIndex,
            brainsText,
            brainsStatus,
          );
          judgePaths = turnPaths(state.runDir, turnIndex, `judge-${judgeName}`);
          const jStarted = new Date().toISOString();
          const jResult = await judgeAdapter.run({
            prompt: judgePrompt,
            cwd: state.campaign.cwd,
            runDir: state.runDir,
            turn: turnIndex,
            timeoutMs: state.campaign.timeoutMs,
            noTools: state.campaign.noTools,
          });
          await writeTurnFiles(
            state,
            {
              index: turnIndex,
              adapter: judgeName,
              role: "judge",
              startedAt: jStarted,
              endedAt: new Date().toISOString(),
              promptPath: judgePaths.promptPath,
              transcriptPath: judgePaths.transcriptPath,
              statusPath: judgePaths.statusPath,
              verdict: "open",
              summary: "",
              claimedVerifier: null,
              verifierExitCode: null,
              nextHint: "",
              limited: Boolean(jResult.limited),
              exitCode: jResult.exitCode,
            },
            judgePrompt,
            jResult.text,
            parseStatus(jResult.text),
          );
          if (jResult.limited) {
            log(`  ⚠ judge limited — keeping brains status`);
          } else if (jResult.text.trim()) {
            finalText = jResult.text;
            finalAdapter = judgeName;
            role = "judge";
          }
        }
      } catch (e) {
        log(
          `  judge error: ${e instanceof Error ? e.message : String(e)} — keeping brains status`,
        );
      }
    }

    const parsed = parseStatus(finalText);
    const gated = await gateStatus(parsed, state.campaign.cwd);
    const status = gated.status;
    const endedAt = new Date().toISOString();

    const record: TurnRecord = {
      index: turnIndex,
      adapter: finalAdapter,
      role,
      startedAt,
      endedAt,
      promptPath: paths.promptPath,
      transcriptPath:
        role === "judge" && judgePaths
          ? judgePaths.transcriptPath
          : paths.transcriptPath,
      brainsTranscriptPath: paths.transcriptPath,
      statusPath: paths.statusPath,
      verdict: status.verdict,
      summary: status.summary,
      claimedVerifier: status.claimedVerifier,
      verifierExitCode: gated.verifierExitCode,
      nextHint: status.nextHint,
      limited,
      exitCode: brainsExit,
    };

    // Final combined status for the turn
    const { writeFile } = await import("node:fs/promises");
    await writeFile(paths.statusPath, JSON.stringify(status, null, 2) + "\n", "utf8");

    state.turns.push(record);
    advanceBrains(state, brainsName);

    await appendProgress(
      state,
      `## Turn ${turnIndex} (brains=${brainsName}` +
        (role === "judge" ? `, judge=${finalAdapter}` : "") +
        `) — ${status.verdict}\n\n` +
        `${status.summary}\n\n` +
        (status.nextHint ? `**Next:** ${status.nextHint}\n\n` : "") +
        (status.claimedVerifier
          ? `**Verifier:** \`${status.claimedVerifier}\` (exit ${gated.verifierExitCode ?? "n/a"})\n\n`
          : ""),
    );

    log(`  verdict: ${status.verdict} [${role}]`);
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

    if (status.verdict === "error" && brainsExit !== 0 && limited === false) {
      if (!brainsText.trim()) {
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

function brainsOf(state: RunState): string[] {
  if (state.campaign.brains?.length) return state.campaign.brains;
  if (state.campaign.adapters?.length) return state.campaign.adapters;
  return ["grok"];
}

function deriveOpenVerdict(state: RunState): Verdict {
  const last = state.turns[state.turns.length - 1];
  if (!last) return "open";
  if (last.verdict === "partial") return "partial";
  if (last.verdict === "error") return "error";
  return "open";
}

async function pickBrains(state: RunState): Promise<string | null> {
  const names = brainsOf(state);
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
      log(`  brains ${name} not available on PATH — skipping`);
    } catch {
      log(`  unknown brains adapter ${name} — skipping`);
    }
  }
  return null;
}

function advanceBrains(state: RunState, used: string): void {
  const names = brainsOf(state);
  const i = names.indexOf(used);
  state.nextAdapterIndex =
    ((i >= 0 ? i : state.nextAdapterIndex) + 1) % Math.max(names.length, 1);
}

function log(msg: string): void {
  console.error(msg);
}
