"use client";

import { useState } from "react";
import { ONETHIRD_LEVELS, ONETHIRD_RANGE } from "@/lib/onethird-data";
import { enumeratePosets, balance, isChain } from "@/lib/poset";

// Instrument: the verification ledger. Shows the exhaustive campaign's exact
// results (computed by research/iteration1.ts, checked in as data), and lets
// the browser re-derive the small cases from scratch — trust, then verify.

export default function BalanceSpectrum() {
  const [reverify, setReverify] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const runLive = () => {
    setRunning(true);
    // let the button repaint before the synchronous math
    setTimeout(() => {
      const t0 = performance.now();
      const lines: string[] = [];
      let allMatch = true;
      for (let n = 3; n <= 7; n++) {
        const posets = enumeratePosets(n);
        let minNum = 1n;
        let minDen = 1n;
        let below = 0;
        let exact = 0;
        let nonChain = 0;
        for (const p of posets) {
          if (isChain(p)) continue;
          nonChain++;
          const b = balance(p)!;
          if (3n * b.num < b.den) below++;
          if (3n * b.num === b.den) exact++;
          if (b.num * minDen < minNum * b.den) {
            minNum = b.num;
            minDen = b.den;
          }
        }
        const shipped = ONETHIRD_LEVELS.find((l) => l.n === n);
        const match =
          !!shipped &&
          shipped.posets === posets.length &&
          shipped.nonChain === nonChain &&
          shipped.atExactThird === exact &&
          shipped.below === below &&
          3n * minNum === minDen;
        if (!match) allMatch = false;
        lines.push(
          `n=${n}: ${posets.length} posets, min balance ${minNum}/${minDen}, ${exact} at exactly 1/3, ${below} below — ${match ? "matches shipped data" : "MISMATCH vs shipped data"}`,
        );
      }
      const ms = Math.round(performance.now() - t0);
      lines.push(
        allMatch
          ? `Recomputed from scratch in your browser in ${ms}ms. Everything matches.`
          : `MISMATCH FOUND (${ms}ms) — the shipped data and this recomputation disagree; distrust both until resolved.`,
      );
      setReverify(lines.join("\n"));
      setRunning(false);
    }, 30);
  };

  const [lo, hi] = ONETHIRD_RANGE;
  return (
    <div className="panel">
      <div className="panel-title">Instrument · the verification ledger — exhaustive, exact</div>
      <div className="steps-scroll" style={{ maxHeight: "none" }}>
        <table className="steps">
          <thead>
            <tr>
              <th>n</th>
              <th>posets</th>
              <th>non-chain</th>
              <th>min b(P)</th>
              <th>exactly 1/3</th>
              <th>runner-up</th>
              <th>below 1/3</th>
              <th>spectrum of b(P) in [1/3, 1/2]</th>
            </tr>
          </thead>
          <tbody>
            {ONETHIRD_LEVELS.map((l) => {
              const max = Math.max(...l.bins, 1);
              return (
                <tr key={l.n}>
                  <td className="val">{l.n}</td>
                  <td>{l.posets.toLocaleString()}</td>
                  <td>{l.nonChain.toLocaleString()}</td>
                  <td className="val" style={{ color: "var(--accent)" }}>
                    {l.min}
                  </td>
                  <td>{l.atExactThird}</td>
                  <td>{l.runnerUp ? `${l.runnerUp.frac} ≈ ${l.runnerUp.value.toFixed(4)}` : "—"}</td>
                  <td style={{ color: l.below === 0 ? "var(--even)" : "var(--odd)" }}>
                    {l.below === 0 ? "0 ✓" : l.below}
                  </td>
                  <td>
                    <svg width={190} height={26} style={{ display: "block" }}>
                      {l.bins.map((c, i) => {
                        const h = c === 0 ? 0 : Math.max(2, (24 * Math.log1p(c)) / Math.log1p(max));
                        return (
                          <rect
                            key={i}
                            x={(i * 190) / l.bins.length}
                            y={26 - h}
                            width={Math.max(1.5, 190 / l.bins.length - 1)}
                            height={h}
                            fill={i === 0 ? "var(--accent)" : "var(--even)"}
                            opacity={i === 0 ? 1 : 0.75}
                          />
                        );
                      })}
                    </svg>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--ink-faint)", margin: "10px 0 0" }}>
        Spectrum bins span b(P) ∈ [{lo.toFixed(4)}, {hi.toFixed(4)}], log-scaled; the gold spike is
        the exactly-1/3 class. Data computed by <span className="mono">research/iteration1.ts</span>{" "}
        (BigInt-exact; enumeration counts cross-checked against OEIS A000112 at every size).
      </p>
      <div className="controls" style={{ marginTop: 12, marginBottom: 0 }}>
        <button className="btn ghost" type="button" onClick={runLive} disabled={running}>
          {running ? "recomputing…" : "re-verify n ≤ 7 from scratch, in this browser"}
        </button>
      </div>
      {reverify && (
        <pre
          className="mono"
          style={{
            fontSize: 12,
            color: "var(--ink-dim)",
            background: "var(--bg-inset)",
            border: "1px solid var(--line-soft)",
            borderRadius: 8,
            padding: "10px 14px",
            whiteSpace: "pre-wrap",
            marginTop: 10,
          }}
        >
          {reverify}
        </pre>
      )}
    </div>
  );
}
