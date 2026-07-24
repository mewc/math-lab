import { spawn } from "node:child_process";
import { looksLimited, type AgentAdapter, type AdapterRunInput, type AdapterRunResult } from "./types.ts";

function bin(): string {
  return process.env.MATHSMASHER_GROK_BIN?.trim() || "grok";
}

function extraArgs(): string[] {
  const raw = process.env.MATHSMASHER_GROK_ARGS?.trim();
  if (!raw) return [];
  return raw.split(/\s+/).filter(Boolean);
}

export const grokAdapter: AgentAdapter = {
  name: "grok",

  async available() {
    return await commandExists(bin());
  },

  async run(input: AdapterRunInput): Promise<AdapterRunResult> {
    const args = [
      "-p",
      input.prompt,
      "--output-format",
      "plain",
      "--cwd",
      input.cwd,
      ...extraArgs(),
    ];

    if (!input.noTools) {
      args.push("--always-approve");
    }

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
