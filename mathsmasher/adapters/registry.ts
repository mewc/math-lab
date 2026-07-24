import { claudeAdapter } from "./claude.ts";
import { grokAdapter } from "./grok.ts";
import { mockAdapter } from "./mock.ts";
import { opencodeAdapter } from "./opencode.ts";
import type { AgentAdapter } from "./types.ts";

const BUILTIN: Record<string, AgentAdapter> = {
  claude: claudeAdapter,
  grok: grokAdapter,
  opencode: opencodeAdapter,
  mock: mockAdapter,
};

export function getAdapter(name: string): AgentAdapter {
  const key = name.trim().toLowerCase();
  const adapter = BUILTIN[key];
  if (!adapter) {
    const known = Object.keys(BUILTIN).join(", ");
    throw new Error(`Unknown adapter "${name}". Known: ${known}`);
  }
  return adapter;
}

export function listAdapters(): string[] {
  return Object.keys(BUILTIN);
}
