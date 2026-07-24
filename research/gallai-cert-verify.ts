/**
 * Standalone re-verifier for Gallai induction certificates.
 *
 * Loads artifacts from a prior `gallai-induction.ts` run and re-checks:
 *   - I1 analytic odd-n leaf identity
 *   - every structure-forced core: path decomp valid, size = B, no size B−1
 *   - density-forced n≤10 (geng edge filter, short)
 *
 * Exit 0 only if all checks pass. Does not claim a general proof.
 *
 * Run: bun research/gallai-cert-verify.ts
 *      bun research/gallai-cert-verify.ts --skip-density
 */

import {
  allPairs,
  buildAdj,
  degrees,
  edgeCount,
  gallaiBound,
  maskFromEdges,
  parseGraph6,
  pathLowerBound,
  pathNumberAtMost,
  verifyDecomposition,
} from "./gallai-lib.ts";

const args = process.argv.slice(2);
function opt(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
}
function flag(name: string): boolean {
  return args.includes(`--${name}`);
}

const RUN_DIR =
  opt(
    "run-dir",
    process.env.MATHSMASHER_RUN_DIR ??
      "/Users/mewc/.mathsmasher/runs/2026-07-24T01-08-34-gallai-paths-v1",
  );
const SKIP_DENSITY = flag("skip-density");

let failures = 0;
function ok(msg: string) {
  console.log(`  OK  ${msg}`);
}
function fail(msg: string) {
  console.log(`  FAIL ${msg}`);
  failures++;
}

// I1
console.log("── I1 analytic odd-n leaf ──");
for (let n = 3; n <= 500; n += 2) {
  if (gallaiBound(n - 1) + 1 !== gallaiBound(n)) {
    fail(`n=${n}: B_H+1 ≠ B`);
  }
}
for (let n = 2; n <= 500; n += 2) {
  if (gallaiBound(n - 1) !== gallaiBound(n)) fail(`even n=${n}: B_H ≠ B`);
}
if (failures === 0) ok("B(n−1)+1=B(n) for odd n≤500; B(n−1)=B(n) for even n≤500");

// Structure cores
const coresPath = `${RUN_DIR}/artifacts/gallai-structure-cores.json`;
const coresFile = Bun.file(coresPath);
if (!(await coresFile.exists())) {
  fail(`missing ${coresPath} — run gallai-induction.ts first`);
} else {
  console.log("\n── structure-forced core certificates ──");
  const data = await coresFile.json();
  const cores = data.cores as Array<{
    n: number;
    m: number;
    deg: number[];
    lb: number;
    p: number;
    bound: number;
    g6: string;
    edges: Array<[number, number]>;
    paths: number[][];
    edgeMinimal: boolean;
  }>;
  let checked = 0;
  let minimal = 0;
  for (const c of cores) {
    const pairs = allPairs(c.n);
    const mask = maskFromEdges(c.n, c.edges);
    if (edgeCount(mask) !== c.m) {
      fail(`${c.g6}: m`);
      continue;
    }
    const adj = buildAdj(c.n, mask, pairs);
    const deg = degrees(adj);
    const lb = pathLowerBound(deg, c.m, c.n);
    if (lb !== c.lb || lb >= c.bound) {
      fail(`${c.g6}: lb`);
      continue;
    }
    const v = verifyDecomposition(c.n, mask, pairs, c.paths);
    if (!v.ok) {
      fail(`${c.g6}: ${v.reason}`);
      continue;
    }
    if (c.paths.length !== c.bound) {
      fail(`${c.g6}: size ${c.paths.length}≠${c.bound}`);
      continue;
    }
    const better = pathNumberAtMost(c.n, mask, pairs, c.bound - 1);
    if (better.ok) {
      fail(`${c.g6}: not tight`);
      continue;
    }
    if (c.edgeMinimal) minimal++;
    checked++;
  }
  ok(
    `re-verified ${checked}/${cores.length} cores (${minimal} edge-minimal); byN=${JSON.stringify(data.byN)}`,
  );
  if (checked !== cores.length) fail("core re-check incomplete");
  // Expected inventory from induction campaign
  if (data.byN?.["6"] !== 3 || data.byN?.["8"] !== 51) {
    fail(`unexpected byN ${JSON.stringify(data.byN)} (expect 6→3, 8→51)`);
  }
  if ((data.byN?.["9"] ?? 0) !== 0 && data.byN?.["9"] !== undefined) {
    // n=9 may be absent from older artifacts
  }
}

// Density-forced recheck n≤10
if (!SKIP_DENSITY) {
  console.log("\n── density-forced n≤10 ──");
  const geng = Bun.which("geng");
  if (!geng) {
    fail("geng not on PATH");
  } else {
    let total = 0;
    for (let n = 2; n <= 10; n++) {
      const B = gallaiBound(n);
      const thresh = (n - 1) * (B - 1);
      const maxM = (n * (n - 1)) / 2;
      const mine = thresh + 1;
      if (mine > maxM) continue;
      const proc = Bun.spawn(
        [geng, "-c", "-q", String(n), `${mine}:${maxM}`],
        { stdout: "pipe", stderr: "pipe" },
      );
      const out = await new Response(proc.stdout).text();
      await proc.exited;
      const graphs = out.split("\n").map((l) => l.trim()).filter(Boolean);
      const pairs = allPairs(n);
      for (const g6 of graphs) {
        const { edgeMask } = parseGraph6(g6);
        const r = pathNumberAtMost(n, edgeMask, pairs, B);
        if (!r.ok) {
          fail(`density CEX ${g6}`);
        } else {
          const v = verifyDecomposition(n, edgeMask, pairs, r.paths);
          if (!v.ok) fail(`density cert ${g6}: ${v.reason}`);
        }
      }
      total += graphs.length;
      console.log(`  n=${n}: ${graphs.length} density-forced ok`);
    }
    ok(`density-forced total ${total} (expect 844 for n≤10)`);
    if (total !== 844) fail(`density count ${total} ≠ 844`);
  }
}

// Summary artifact consistency
const sumPath = `${RUN_DIR}/artifacts/gallai-induction-summary.json`;
if (await Bun.file(sumPath).exists()) {
  const s = await Bun.file(sumPath).json();
  console.log("\n── induction summary ──");
  console.log(
    `  I2 leafy=${s.I2?.leafy} evenLiftMiss=${s.I2?.evenLiftMissExactOk}`,
  );
  console.log(
    `  I3 density=${s.I3?.densityForcedTotal} I4 cores=${s.I4?.structureForcedTight}`,
  );
  ok("summary present");
}

console.log("\n── Verdict ──");
if (failures > 0) {
  console.log(`FAILED (${failures})`);
  process.exit(1);
}
console.log(
  "Certificate package re-verified. Gallai remains open for general graphs.",
);
process.exit(0);
