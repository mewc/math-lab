export interface AdapterRunInput {
  prompt: string;
  cwd: string;
  runDir: string;
  turn: number;
  timeoutMs?: number;
  noTools?: boolean;
}

export interface AdapterRunResult {
  text: string;
  exitCode: number;
  limited?: boolean;
}

export interface AgentAdapter {
  name: string;
  available(): Promise<boolean>;
  run(input: AdapterRunInput): Promise<AdapterRunResult>;
}

/** Shared rate-limit phrase detection for CLI adapters. */
export function looksLimited(text: string): boolean {
  return /hit your limit|usage limit|rate[_\s-]?limit|resource_exhausted|requests limit|quota exceeded|too many requests|429/i.test(
    text,
  );
}
