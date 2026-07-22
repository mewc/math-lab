"use client";

import { useMemo, useState } from "react";
import { trajectory, formatBig, VARIANTS } from "@/lib/collatz";

// The two ways Collatz could fail — a nontrivial cycle, or a divergent orbit —
// both actually happen in the map's nearest siblings. This lab lets you watch
// them happen: 3n−1 falls into genuinely different cycles, 5n+1 blasts off.
// Any proof of the conjecture must "feel" the difference between these maps.

const SUGGESTIONS: Record<string, { seeds: string[]; blurb: string }> = {
  "3n+1": {
    seeds: ["7", "27", "97"],
    blurb: "Every seed ever tried lands in the one known cycle 1 → 4 → 2.",
  },
  "3n-1": {
    seeds: ["5", "17", "7"],
    blurb:
      "Flip one sign and three distinct cycles appear: {1,2}, {5,14,7,20,10}, and an 18-element cycle through 17. Seed 5 and seed 17 land in different ones.",
  },
  "5n+1": {
    seeds: ["13", "17", "7"],
    blurb:
      "Make the odd step slightly stronger and the random-walk drift flips positive: 13 and 17 hit cycles, but 7 climbs apparently forever (thousands of digits and counting — divergence is presumed, though even here unproven).",
  },
};

export default function VariantLab() {
  const [variantKey, setVariantKey] = useState<keyof typeof VARIANTS>("3n-1");
  const [seedStr, setSeedStr] = useState("5");

  const result = useMemo(() => {
    let n: bigint;
    try {
      n = BigInt(seedStr.replace(/[,\s_]/g, ""));
    } catch {
      return null;
    }
    if (n < 1n) return null;
    return trajectory(n, { maxSteps: 600, variant: VARIANTS[variantKey] });
  }, [seedStr, variantKey]);

  const sugg = SUGGESTIONS[variantKey];

  return (
    <div className="panel">
      <p className="panel-title">Instrument 3 · Failure-mode lab — watch the siblings of 3n+1 actually fail</p>
      <div className="controls">
        <select value={variantKey} onChange={(e) => setVariantKey(e.target.value as keyof typeof VARIANTS)} aria-label="Rule variant">
          {Object.entries(VARIANTS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={seedStr}
          size={12}
          onChange={(e) => setSeedStr(e.target.value)}
          aria-label="Seed"
        />
        <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>try:</span>
        {sugg.seeds.map((s) => (
          <button key={s} className="btn ghost" data-active={seedStr === s} onClick={() => setSeedStr(s)}>
            {s}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 14, color: "var(--ink-dim)", marginTop: 0 }}>{sugg.blurb}</p>

      {result === null ? (
        <div className="verdict bad">Enter a positive integer seed.</div>
      ) : result.cycle ? (
        <div className="verdict bad">
          <b>Nontrivial cycle captured</b> after {result.steps.length - 1 - result.cycle.length} steps — period{" "}
          {result.cycle.length}: {result.cycle.map((v) => formatBig(v)).join(" → ")} → …
          {variantKey === "3n+1"
            ? " (this should be impossible — please publish)"
            : " This is failure mode A. For 3n+1, cycles of period below ~10¹¹ are provably impossible (§5)."}
        </div>
      ) : result.reachedOne ? (
        <div className="verdict ok">
          Converged: reached 1 after {result.totalStoppingTime} steps (then cycles 1 → {VARIANTS[variantKey].mult === 3n && VARIANTS[variantKey].add === 1n ? "4 → 2" : "…"} forever). Peak {formatBig(result.peak)}.
        </div>
      ) : (
        <div className="verdict bad">
          <b>No convergence within {result.steps.length} steps.</b> Current value has{" "}
          {result.steps[result.steps.length - 1].value.toString().length} digits and is still climbing —
          this is failure mode B (presumed divergence). For 3n+1 not a single seed does this; for 5n+1
          almost all seeds should, by the drift heuristic in §4.
        </div>
      )}

      <svg viewBox="0 0 800 200" className="chart-svg" style={{ marginTop: 14 }} role="img" aria-label="Variant trajectory, log scale">
        {result &&
          (() => {
            const steps = result.steps;
            const maxLog = Math.max(...steps.map((s) => s.log2), 1);
            const x = (i: number) => 46 + (i / Math.max(steps.length - 1, 1)) * 742;
            const y = (l: number) => 186 - (l / maxLog) * 172;
            const path = steps.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s.log2).toFixed(1)}`).join("");
            return (
              <>
                <text x="42" y="18" textAnchor="end" fontSize="10" fill="#5d6575" fontFamily="monospace">
                  2^{Math.round(maxLog)}
                </text>
                <line x1="46" x2="788" y1="186" y2="186" stroke="#232a3a" />
                <path d={path} fill="none" stroke={result.cycle ? "#ef476f" : result.reachedOne ? "#26c6a2" : "#ef476f"} strokeWidth="1.6" />
              </>
            );
          })()}
      </svg>
    </div>
  );
}
