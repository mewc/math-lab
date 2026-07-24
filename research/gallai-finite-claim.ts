/**
 * Finite Gallai claim package: re-verify n≤9 (geng) + assert n=10 stream
 * artifact if present; also re-run constructive families.
 *
 * Exit 0 only if:
 *   - unlabeled connected n=1..9 all have p ≤ ceil(n/2) (or load prior summary)
 *   - optional --require-n10: stream artifact complete with checked==A001349
 *   - constructions (stars, completes, density identity) pass
 *
 * Run:
 *   bun research/gallai-finite-claim.ts
 *   bun research/gallai-finite-claim.ts --require-n10
 *   bun research/gallai-finite-claim.ts --n 8   # quick
 */

import {
  allPairs,
  buildAdj,
  degrees,
  edgeCount,
  gallaiBound,
  parseGraph6,
  pathLowerBound,
  pathNumberAtMost,
  exactPathNumber,
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

const MAX_N = Number(opt("n", "9"));
const REQUIRE_N10 = flag("require-n10");
const RUN_DIR =
  opt(
    "run-dir",
    process.env.MATHSMASHER_RUN_DIR ??
      "/Users/mewc/.mathsmasher/runs/2026-07-24T01-08-34-gallai-paths-v1",
  );

const A001349: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 6,
  5: 21,
  6: 112,
  7: 853,
  8: 11117,
  9: 261080,
  10: 11716571,
};

const geng = Bun.which("geng");
if (!geng) throw new Error("geng not on PATH");

console.log(`Gallai finite claim: re-verify unlabeled n≤${MAX_N}`);
let failures = 0;

for (let n = 1; n <= MAX_N; n++) {
  const B = gallaiBound(n);
  const t0 = performance.now();
  let graphs: string[];
  if (n === 1) {
    graphs = ["@"];
  } else {
    const proc = Bun.spawn([geng, "-c", "-q", String(n)], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const out = await new Response(proc.stdout).text();
    const code = await proc.exited;
    if (code !== 0) throw new Error(`geng n=${n} exit ${code}`);
    graphs = out.split("\n").map((l) => l.trim()).filter(Boolean);
  }
  const exp = A001349[n];
  if (exp !== undefined && graphs.length !== exp) {
    console.log(`FAIL n=${n}: count ${graphs.length} ≠ A001349 ${exp}`);
    failures++;
    continue;
  }
  const pairs = allPairs(n);
  let cex = 0;
  let tight = 0;
  for (const g6 of graphs) {
    const { edgeMask } = parseGraph6(g6);
    const adj = buildAdj(n, edgeMask, pairs);
    const deg = degrees(adj);
    const m = edgeCount(edgeMask);
    const lb = pathLowerBound(deg, m, n);
    if (lb > B) {
      cex++;
      continue;
    }
    const r = pathNumberAtMost(n, edgeMask, pairs, B);
    if (!r.ok) {
      const full = exactPathNumber(n, edgeMask, pairs, B + 4);
      if (full.num > B) {
        cex++;
        console.log(`COUNTEREXAMPLE n=${n} g6=${g6} p=${full.num}`);
      } else {
        const v = verifyDecomposition(n, edgeMask, pairs, full.paths);
        if (!v.ok) throw new Error(v.reason);
        if (full.num === B) tight++;
      }
    } else {
      if (r.num === B) tight++;
    }
  }
  const ms = performance.now() - t0;
  if (cex > 0) {
    console.log(`FAIL n=${n}: ${cex} counterexamples`);
    failures++;
  } else {
    console.log(
      `OK n=${n}: ${graphs.length} graphs, tight≤bound count(path==B)≈${tight}, ${ms.toFixed(0)}ms`,
    );
  }
}

// n=10 artifact
const n10path = `${RUN_DIR}/artifacts/gallai-stream-n10.json`;
const n10file = Bun.file(n10path);
if (await n10file.exists()) {
  const sum = await n10file.json();
  console.log("\nn=10 stream artifact:");
  console.log(
    `  checked=${sum.checked} expected=${A001349[10]} cex=${sum.counterexamples} complete=${sum.complete}`,
  );
  if (sum.checked !== A001349[10] || sum.counterexamples !== 0) {
    console.log("FAIL n=10 artifact incomplete or has counterexamples");
    failures++;
  } else {
    console.log("OK n=10 full A001349 coverage, no counterexample");
  }
} else if (REQUIRE_N10) {
  console.log(`FAIL --require-n10 but missing ${n10path}`);
  failures++;
} else {
  console.log(`\n(no n=10 artifact at ${n10path}; run gallai-n10-stream.ts)`);
}

// constructions subprocess
console.log("\nRunning constructions…");
const c = Bun.spawn(
  ["bun", "research/gallai-constructions.ts", "--complete-n", "21", "--leaf-n", "7", "--no-artifacts"],
  { stdout: "pipe", stderr: "pipe", cwd: process.cwd() },
);
const cOut = await new Response(c.stdout).text();
const cErr = await new Response(c.stderr).text();
const cCode = await c.exited;
if (cCode !== 0) {
  console.log("FAIL constructions");
  console.log(cOut.slice(-500));
  console.log(cErr.slice(-500));
  failures++;
} else {
  console.log("OK constructions (stars, K_n≤21, density id, leaf n≤7, density-forced n≤9)");
}

const summary = {
  maxNVerified: MAX_N,
  n10Artifact: (await n10file.exists()) ? n10path : null,
  failures,
  note:
    "Finite verification only. Not a general proof of Gallai's conjecture.",
};

await Bun.write(
  `${RUN_DIR}/artifacts/gallai-finite-claim.json`,
  JSON.stringify(summary, null, 2),
);

if (failures > 0) {
  console.log(`\nFAILED (${failures})`);
  process.exit(1);
}
console.log("\nFinite Gallai claim package OK. Conjecture remains open in general.");
process.exit(0);
