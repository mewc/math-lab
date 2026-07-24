/** Shared types for mathsmasher — multi-model conjecture attack loop. */

export type Verdict =
  | "open"
  | "partial"
  | "proven"
  | "disproven"
  | "blocked"
  | "error";

export type Goal = "prove" | "disprove" | "either";

export type NudgeMode = "aggressive" | "gentle";

export interface Campaign {
  id: string;
  title: string;
  problem: string;
  goal: Goal;
  successCriteria?: string;
  contextPaths: string[];
  maxTurns: number;
  /**
   * Agents that do research turns (round-robin).
   * When set, preferred over plain `adapters` for brains selection.
   */
  brains: string[];
  /**
   * Optional judge adapter — runs after each brains turn and may override status.
   * e.g. "opencode". Not counted as a research adapter in round-robin.
   */
  judge?: string;
  /** @deprecated Prefer brains; kept as alias for brains when brains empty. */
  adapters: string[];
  nudgeMode: NudgeMode;
  /** Working directory agents may edit (repo root). */
  cwd: string;
  /** Root for run directories (default ~/.mathsmasher/runs). */
  runRoot: string;
  dryRun?: boolean;
  noTools?: boolean;
  /** Per-turn agent timeout ms (default 30 min). */
  timeoutMs?: number;
}

export interface TurnStatus {
  verdict: Verdict;
  summary: string;
  claimedVerifier: string | null;
  artifacts: string[];
  nextHint: string;
  /** If true and verdict is blocked, stop the loop. */
  terminal: boolean;
}

export interface TurnRecord {
  index: number;
  adapter: string;
  /** brains | judge — who produced the final status for this turn. */
  role: "brains" | "judge" | "solo";
  startedAt: string;
  endedAt: string;
  promptPath: string;
  transcriptPath: string;
  statusPath: string;
  /** Brains transcript path when a judge overrode status. */
  brainsTranscriptPath?: string;
  verdict: Verdict;
  summary: string;
  claimedVerifier: string | null;
  verifierExitCode: number | null;
  nextHint: string;
  limited: boolean;
  exitCode: number;
}

export interface RunState {
  runId: string;
  runDir: string;
  campaign: Campaign;
  turns: TurnRecord[];
  /** Adapters that hit rate/usage limits this run. */
  limitedAdapters: string[];
  /** Next adapter index into campaign.adapters (round-robin). */
  nextAdapterIndex: number;
  finalVerdict: Verdict | null;
  startedAt: string;
  endedAt: string | null;
}

export interface RunResult {
  runId: string;
  runDir: string;
  verdict: Verdict;
  turns: TurnRecord[];
  reportPath: string;
  exitCode: number;
}

export interface CampaignInput {
  title?: string;
  problem: string;
  goal?: Goal;
  successCriteria?: string;
  contextPaths?: string[];
  maxTurns?: number;
  /** Research agents (e.g. ["grok"]). */
  brains?: string[];
  /** Judge agent (e.g. "opencode") — reviews each brains turn. */
  judge?: string;
  /** Alias for brains when brains not set. */
  adapters?: string[];
  nudgeMode?: NudgeMode;
  cwd?: string;
  runRoot?: string;
  dryRun?: boolean;
  noTools?: boolean;
  timeoutMs?: number;
  /** Resume an existing run id (directory name under runRoot). */
  resumeId?: string;
  /** Extra turns when resuming (overrides remaining budget). */
  extraTurns?: number;
}
