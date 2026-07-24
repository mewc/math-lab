import { spawn } from "node:child_process";
import { resolve, isAbsolute } from "node:path";
import { access } from "node:fs/promises";
import type { TurnStatus, Verdict } from "./types.ts";

const DEFAULT_STATUS: TurnStatus = {
  verdict: "open",
  summary: "(no <status> footer — treated as open)",
  claimedVerifier: null,
  artifacts: [],
  nextHint: "",
  terminal: false,
};

const VALID: Set<Verdict> = new Set([
  "open",
  "partial",
  "proven",
  "disproven",
  "blocked",
  "error",
]);

/** Extract the last `<status>...</status>` JSON block from agent output. */
export function parseStatus(text: string): TurnStatus {
  const re = /<status>\s*([\s\S]*?)\s*<\/status>/gi;
  let match: RegExpExecArray | null = null;
  let last: string | null = null;
  while ((match = re.exec(text)) !== null) {
    last = match[1];
  }
  if (!last) return { ...DEFAULT_STATUS };

  try {
    const obj = JSON.parse(last) as Record<string, unknown>;
    const verdictRaw = String(obj.verdict ?? "open").toLowerCase() as Verdict;
    const verdict = VALID.has(verdictRaw) ? verdictRaw : "open";
    return {
      verdict,
      summary: String(obj.summary ?? "").trim() || DEFAULT_STATUS.summary,
      claimedVerifier:
        obj.claimedVerifier == null || obj.claimedVerifier === ""
          ? null
          : String(obj.claimedVerifier),
      artifacts: Array.isArray(obj.artifacts)
        ? obj.artifacts.map(String)
        : [],
      nextHint: String(obj.nextHint ?? ""),
      terminal: Boolean(obj.terminal),
    };
  } catch {
    return {
      ...DEFAULT_STATUS,
      summary: "(malformed <status> JSON — treated as open)",
    };
  }
}

export async function runVerifier(
  claimedPath: string,
  cwd: string,
  timeoutMs = 120_000,
): Promise<{ exitCode: number; output: string }> {
  const abs = isAbsolute(claimedPath) ? claimedPath : resolve(cwd, claimedPath);
  try {
    await access(abs);
  } catch {
    return { exitCode: 127, output: `Verifier not found: ${abs}` };
  }

  return new Promise((resolvePromise) => {
    const child = spawn("bun", ["run", abs], {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 1000);
    }, timeoutMs);

    child.stdout?.on("data", (c: Buffer) => {
      output += c.toString();
    });
    child.stderr?.on("data", (c: Buffer) => {
      output += c.toString();
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      resolvePromise({ exitCode: 127, output: e.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({ exitCode: code ?? 1, output });
    });
  });
}

/**
 * Apply verifier gate: proven/disproven only stick if verifier exits 0.
 * Otherwise force partial.
 */
export async function gateStatus(
  status: TurnStatus,
  cwd: string,
): Promise<{ status: TurnStatus; verifierExitCode: number | null }> {
  if (status.verdict !== "proven" && status.verdict !== "disproven") {
    return { status, verifierExitCode: null };
  }

  if (!status.claimedVerifier) {
    return {
      status: {
        ...status,
        verdict: "partial",
        summary:
          status.summary +
          " [mathsmasher: claimed proven/disproven without claimedVerifier — downgraded to partial]",
        terminal: false,
      },
      verifierExitCode: null,
    };
  }

  const { exitCode, output } = await runVerifier(status.claimedVerifier, cwd);
  if (exitCode === 0) {
    return { status: { ...status, terminal: true }, verifierExitCode: exitCode };
  }

  const tail = output.trim().slice(-500);
  return {
    status: {
      ...status,
      verdict: "partial",
      summary:
        status.summary +
        ` [mathsmasher: verifier \`${status.claimedVerifier}\` exited ${exitCode}; downgraded to partial${tail ? `: ${tail}` : ""}]`,
      terminal: false,
    },
    verifierExitCode: exitCode,
  };
}
