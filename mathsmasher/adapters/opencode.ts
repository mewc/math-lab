import { spawn } from "node:child_process";
import { looksLimited, type AgentAdapter, type AdapterRunInput, type AdapterRunResult } from "./types.ts";

function bin(): string {
  return process.env.MATHSMASHER_OPENCODE_BIN?.trim() || "opencode";
}

function extraArgs(): string[] {
  const raw = process.env.MATHSMASHER_OPENCODE_ARGS?.trim();
  if (!raw) return [];
  return raw.split(/\s+/).filter(Boolean);
}

function model(): string | undefined {
  return process.env.MATHSMASHER_OPENCODE_MODEL?.trim() || undefined;
}

export const opencodeAdapter: AgentAdapter = {
  name: "opencode",

  async available() {
    return await commandExists(bin());
  },

  async run(input: AdapterRunInput): Promise<AdapterRunResult> {
    // opencode run [message..] — pass prompt as positional message parts
    // Prefer --auto so unattended tool use works when judging/fixing files.
    const args = [
      "run",
      "--dir",
      input.cwd,
      "--format",
      "default",
      ...extraArgs(),
    ];

    if (!input.noTools) {
      args.push("--auto");
    }

    const m = model();
    if (m) {
      args.push("-m", m);
    }

    args.push("--title", `mathsmasher-t${input.turn}`);
    // Message last: single string argument
    args.push(input.prompt);

    const { text, exitCode } = await runCommand(bin(), args, {
      cwd: input.cwd,
      timeoutMs: input.timeoutMs ?? 30 * 60 * 1000,
    });

    return {
      text,
      exitCode,
      limited: looksLimited(text),
    };
  },
};

async function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("which", [command], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

function runCommand(
  command: string,
  args: string[],
  opts: { cwd: string; timeoutMs: number },
): Promise<{ text: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2000);
    }, opts.timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      const s = chunk.toString();
      out += s;
      process.stderr.write(s);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      const s = chunk.toString();
      err += s;
      process.stderr.write(s);
    });

    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({
        text: `Failed to spawn ${command}: ${e.message}\n${err}`,
        exitCode: 127,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const text = out || err;
      resolve({ text, exitCode: code ?? 1 });
    });
  });
}
