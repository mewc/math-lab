"use client";

import { useMemo, useState } from "react";
import { trajectory, formatBig, type TrajectoryResult } from "@/lib/collatz";

const PRESETS: { label: string; value: string }[] = [
  { label: "27 — the classic wild ride", value: "27" },
  { label: "97 — long glide", value: "97" },
  { label: "703 — early path record", value: "703" },
  { label: "6,171 — stopping-time record", value: "6171" },
  { label: "77,671 — huge excursion", value: "77671" },
  { label: "837,799 — champion below 10⁶", value: "837799" },
  { label: "2⁶⁸ + 1 — just past the verified frontier", value: String((1n << 68n) + 1n) },
  { label: "10¹⁰⁰ + 1 — a googol, why not", value: "1" + "0".repeat(99) + "1" },
];

function TrajectoryChart({ result }: { result: TrajectoryResult }) {
  const W = 800;
  const H = 300;
  const PAD = { l: 46, r: 12, t: 14, b: 26 };
  const steps = result.steps;
  if (steps.length < 2) return null;

  const maxLog = Math.max(...steps.map((s) => s.log2), 1);
  const x = (i: number) =>
    PAD.l + (i / (steps.length - 1)) * (W - PAD.l - PAD.r);
  const y = (log2: number) =>
    H - PAD.b - (log2 / maxLog) * (H - PAD.t - PAD.b);

  const path = steps
    .map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s.log2).toFixed(1)}`)
    .join("");

  // y-axis gridlines at round powers of two
  const tickStep = Math.max(1, Math.ceil(maxLog / 6));
  const ticks: number[] = [];
  for (let t = 0; t <= maxLog; t += tickStep) ticks.push(t);

  const showDots = steps.length <= 220;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Trajectory chart, log scale">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#1a2030" strokeWidth="1" />
          <text x={PAD.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="#5d6575" fontFamily="monospace">
            2^{t}
          </text>
        </g>
      ))}
      <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="#232a3a" />
      <path d={path} fill="none" stroke="#f0b429" strokeWidth="1.6" strokeLinejoin="round" />
      {showDots &&
        steps.map((s) => (
          <circle
            key={s.index}
            cx={x(s.index)}
            cy={y(s.log2)}
            r="2.4"
            fill={s.parity === "odd" ? "#ef476f" : "#26c6a2"}
          >
            <title>{`step ${s.index}: ${s.value.toString()} (${s.parity})`}</title>
          </circle>
        ))}
      <circle cx={x(result.peakIndex)} cy={y(steps[result.peakIndex].log2)} r="4.5" fill="none" stroke="#f0b429" strokeWidth="1.5" />
      <text x={W - PAD.r} y={H - 8} textAnchor="end" fontSize="10" fill="#5d6575" fontFamily="monospace">
        step →
      </text>
    </svg>
  );
}

export default function HailstoneExplorer() {
  const [input, setInput] = useState("27");
  const [seed, setSeed] = useState(27n);
  const [error, setError] = useState<string | null>(null);
  const [showBinary, setShowBinary] = useState(false);

  const result = useMemo(() => trajectory(seed, { maxSteps: 5000 }), [seed]);

  function run(raw: string) {
    const cleaned = raw.replace(/[,\s_]/g, "");
    if (!/^\d+$/.test(cleaned) || cleaned === "" ) {
      setError("Enter a positive integer (any size — this computes in exact BigInt arithmetic).");
      return;
    }
    const n = BigInt(cleaned);
    if (n < 1n) {
      setError("The conjecture is about positive integers — try n ≥ 1.");
      return;
    }
    setError(null);
    setSeed(n);
  }

  const glideRatio =
    result.totalStoppingTime !== null && result.oddSteps > 0
      ? (result.evenSteps / result.oddSteps).toFixed(3)
      : null;

  return (
    <div className="panel">
      <p className="panel-title">Instrument 1 · Hailstone trajectory explorer — exact BigInt arithmetic</p>
      <div className="controls">
        <input
          type="text"
          value={input}
          size={30}
          style={{ flex: "1 1 220px" }}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(input)}
          aria-label="Starting integer"
          placeholder="Enter any positive integer…"
        />
        <button className="btn" onClick={() => run(input)}>
          Drop the hailstone
        </button>
        <select
          aria-label="Presets"
          value=""
          onChange={(e) => {
            if (!e.target.value) return;
            setInput(e.target.value);
            run(e.target.value);
          }}
        >
          <option value="">famous seeds…</option>
          {PRESETS.map((p) => (
            <option key={p.label} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      {error && <div className="verdict bad">{error}</div>}

      <TrajectoryChart result={result} />

      <div className="statgrid">
        <div className="stat">
          <div className="k">total stopping time</div>
          <div className="v accent">
            {result.totalStoppingTime !== null
              ? `${result.totalStoppingTime} steps`
              : result.overflowed
                ? "overflowed"
                : "> 5000 (cap)"}
          </div>
        </div>
        <div className="stat">
          <div className="k">stopping time (first drop below n)</div>
          <div className="v">{result.stoppingTime ?? "—"}</div>
        </div>
        <div className="stat">
          <div className="k">peak value</div>
          <div className="v">{formatBig(result.peak)}</div>
        </div>
        <div className="stat">
          <div className="k">odd steps (3n+1)</div>
          <div className="v odd">{result.oddSteps}</div>
        </div>
        <div className="stat">
          <div className="k">even steps (n/2)</div>
          <div className="v even">{result.evenSteps}</div>
        </div>
        <div className="stat">
          <div className="k">halvings per tripling</div>
          <div className="v">{glideRatio ?? "—"}</div>
        </div>
      </div>

      {result.reachedOne && (
        <div className="verdict ok">
          Reached 1 after {result.totalStoppingTime} steps — consistent with the conjecture, as every
          integer ever tested has been. The ratio of halvings to triplings ({glideRatio}) hovering near
          log 3 / log 2 ≈ 1.585 is exactly the balance the heuristic in §4 predicts: any orbit that
          returns to 1 must undo, in factors of 2, everything its odd steps multiplied in.
        </div>
      )}
      {!result.reachedOne && !result.overflowed && (
        <div className="verdict bad">
          Hit the 5,000-step display cap before reaching 1. No positive integer is known to do this
          forever — raise the cap in code if you suspect you have found immortality (you have not).
        </div>
      )}

      <div className="controls" style={{ marginTop: 16, marginBottom: 0 }}>
        <button className="btn ghost" data-active={showBinary} onClick={() => setShowBinary((b) => !b)}>
          {showBinary ? "hide" : "show"} binary column
        </button>
        <span style={{ fontSize: 13, color: "var(--ink-faint)" }}>
          In base 2 the map is: even → delete trailing 0; odd → (n + n≪1) + 1. The struggle between
          appending bits (×3) and truncating them (÷2) is the whole conjecture.
        </span>
      </div>

      <div className="steps-scroll">
        <table className="steps">
          <thead>
            <tr>
              <th>step</th>
              <th>rule</th>
              <th>value</th>
              {showBinary && <th>binary</th>}
            </tr>
          </thead>
          <tbody>
            {result.steps.slice(0, 600).map((s) => (
              <tr key={s.index} data-parity={s.parity}>
                <td>{s.index}</td>
                <td className="rule">{s.index === 0 ? "seed" : s.parity === "odd" ? "→ 3n+1 next" : "→ n/2 next"}</td>
                <td className="val">{formatBig(s.value)}</td>
                {showBinary && (
                  <td className="bin">
                    {s.value.toString(2).length > 64
                      ? `${s.value.toString(2).slice(0, 64)}… (${s.value.toString(2).length} bits)`
                      : s.value.toString(2)}
                  </td>
                )}
              </tr>
            ))}
            {result.steps.length > 600 && (
              <tr>
                <td colSpan={showBinary ? 4 : 3}>… {result.steps.length - 600} more steps not shown</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
