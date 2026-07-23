"use client";

import { useMemo, useState } from "react";
import { totalStoppingTimes, stoppingTimeRecords } from "@/lib/collatz";

// The statistical landscape: total stopping time σ∞(n) for every n up to a
// chosen limit, computed live with a memoized sieve. The banded, quasi-random
// cloud — with slow logarithmic drift and record-holders poking out of it —
// is the visual form of the "Collatz behaves like a biased random walk"
// heuristic discussed in the surrounding text.

const LIMITS = [2000, 5000, 10000, 20000] as const;

export default function StoppingTimeScatter() {
  const [limit, setLimit] = useState<number>(5000);

  const { times, records, maxT, mean } = useMemo(() => {
    const times = totalStoppingTimes(limit);
    const records = stoppingTimeRecords(times);
    let maxT = 0;
    let sum = 0;
    for (let n = 1; n <= limit; n++) {
      if (times[n] > maxT) maxT = times[n];
      sum += times[n];
    }
    return { times, records, maxT, mean: sum / limit };
  }, [limit]);

  const W = 800;
  const H = 340;
  const PAD = { l: 42, r: 12, t: 12, b: 28 };
  const x = (n: number) => PAD.l + (n / limit) * (W - PAD.l - PAD.r);
  const y = (t: number) => H - PAD.b - (t / maxT) * (H - PAD.t - PAD.b);

  // theoretical mean curve: E[σ∞(n)] ≈ 2 ln n / ln(4/3)
  const meanCurve = useMemo(() => {
    const pts: string[] = [];
    for (let i = 1; i <= 100; i++) {
      const n = (i / 100) * limit;
      if (n < 2) continue;
      const t = (2 * Math.log(n)) / Math.log(4 / 3);
      pts.push(`${pts.length === 0 ? "M" : "L"}${x(n).toFixed(1)},${y(t).toFixed(1)}`);
    }
    return pts.join("");
  }, [limit, maxT]); // eslint-disable-line react-hooks/exhaustive-deps

  const yTicks = useMemo(() => {
    const step = maxT > 400 ? 100 : 50;
    const out: number[] = [];
    for (let t = 0; t <= maxT; t += step) out.push(t);
    return out;
  }, [maxT]);

  const recordSet = useMemo(() => new Set(records), [records]);

  // one <path> of zero-length dots for the whole cloud — 20k circles would
  // swamp the DOM, a single stroked path renders instantly
  const cloudPath = useMemo(() => {
    const parts: string[] = [];
    for (let n = 1; n <= limit; n++) {
      if (recordSet.has(n)) continue;
      parts.push(`M${x(n).toFixed(1)},${y(times[n]).toFixed(1)}h0.01`);
    }
    return parts.join("");
  }, [limit, times, recordSet, maxT]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="panel">
      <p className="panel-title">
        Instrument 2 · Total stopping times, computed live for all{" "}
        <span style={{ textTransform: "none" }}>n</span> ≤ {limit.toLocaleString()}
      </p>
      <div className="controls">
        <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>range:</span>
        {LIMITS.map((L) => (
          <button key={L} className="btn ghost" data-active={limit === L} onClick={() => setLimit(L)}>
            {L.toLocaleString()}
          </button>
        ))}
        <span style={{ fontSize: 13, color: "var(--ink-faint)", marginLeft: "auto" }}>
          empirical mean {mean.toFixed(1)} · predicted 2 ln n / ln(4/3)
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Scatter plot of total stopping times">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line-soft)" />
            <text x={PAD.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--ink-faint)" fontFamily="monospace">
              {t}
            </text>
          </g>
        ))}
        <path
          d={cloudPath}
          stroke="var(--link)"
          strokeWidth="2.1"
          strokeLinecap="round"
          opacity="0.42"
          fill="none"
        />
        <path d={meanCurve} fill="none" stroke="var(--even)" strokeWidth="1.8" strokeDasharray="5 4" />
        {records.map((n) => (
          <g key={n}>
            <circle cx={x(n)} cy={y(times[n])} r="3.4" fill="var(--accent)">
              <title>{`record: n=${n}, ${times[n]} steps`}</title>
            </circle>
          </g>
        ))}
        <text x={W - PAD.r} y={H - 8} textAnchor="end" fontSize="10" fill="var(--ink-faint)" fontFamily="monospace">
          n →
        </text>
      </svg>
      <div className="statgrid">
        <div className="stat">
          <div className="k">record holders (gold)</div>
          <div className="v accent" style={{ fontSize: 13 }}>
            {records.slice(-6).map((n) => n.toLocaleString()).join(" · ")}
          </div>
        </div>
        <div className="stat">
          <div className="k">longest flight in range</div>
          <div className="v">
            {records.length > 0 && `n = ${records[records.length - 1].toLocaleString()} → ${times[records[records.length - 1]]} steps`}
          </div>
        </div>
        <div className="stat">
          <div className="k">dashed curve</div>
          <div className="v even" style={{ fontSize: 13 }}>
            2 ln n / ln(4/3) ≈ 6.95 ln n
          </div>
        </div>
      </div>
    </div>
  );
}
