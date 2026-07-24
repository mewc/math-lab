import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AgentAdapter, AdapterRunInput, AdapterRunResult } from "./types.ts";

/**
 * Deterministic adapter for dry-run / tests.
 * Turn 1 → open, turn 2 → partial, turn 3+ → disproven with a real verifier
 * written into the campaign cwd under research/ (or runDir artifacts).
 */
export const mockAdapter: AgentAdapter = {
  name: "mock",

  async available() {
    return true;
  },

  async run(input: AdapterRunInput): Promise<AdapterRunResult> {
    const turn = input.turn;

    if (turn <= 1) {
      return {
        text: mockBody(
          "open",
          "Sketched the problem space; no certificate yet.",
          null,
          "Try a finite gadget with exhaustive enumeration.",
          false,
        ),
        exitCode: 0,
      };
    }

    if (turn === 2) {
      return {
        text: mockBody(
          "partial",
          "Found a promising construction but enumeration is incomplete.",
          null,
          "Close the path system and write an exact-integer verifier.",
          false,
        ),
        exitCode: 0,
      };
    }

    // Turn 3+: write a trivial always-pass verifier under the run dir only
    // (never pollute the repo's research/ on dry-run).
    const artDir = join(input.runDir, "artifacts");
    await mkdir(artDir, { recursive: true });
    const verifierAbs = join(artDir, "mock-verifier.ts");
    await writeFile(
      verifierAbs,
      `// Mock verifier written by mathsmasher mock adapter — always succeeds.
console.log("mathsmasher mock verifier: OK");
process.exit(0);
`,
      "utf8",
    );
    await writeFile(
      join(artDir, "mock-note.md"),
      "Mock run produced a trivial certificate for loop testing only.\n",
      "utf8",
    );

    return {
      text: mockBody(
        "disproven",
        "Mock unconditional counterexample certificate (loop test only).",
        verifierAbs,
        "n/a",
        true,
      ),
      exitCode: 0,
    };
  },
};

function mockBody(
  verdict: string,
  summary: string,
  claimedVerifier: string | null,
  nextHint: string,
  terminal: boolean,
): string {
  return `## Mock agent output

${summary}

<status>
${JSON.stringify(
  {
    verdict,
    summary,
    claimedVerifier,
    artifacts: claimedVerifier ? [claimedVerifier] : [],
    nextHint,
    terminal,
  },
  null,
  2,
)}
</status>
`;
}
