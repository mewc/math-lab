"use client";

import { useMemo, useState } from "react";
import {
  emptyPoset,
  close,
  withRelation,
  countExtensions,
  pairStats,
  coverEdges,
  type Poset,
} from "@/lib/poset";

// Instrument: the balance lab. Pick a poset, get every incomparable pair's
// exact order probability (BigInt fractions, no floating point in any
// mathematical claim) and the best balanced pair, checked against 1/3.

function gcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b];
  return a;
}
function frac(num: bigint, den: bigint): string {
  if (num === 0n) return "0";
  const g = gcd(num, den);
  return `${num / g}/${den / g}`;
}

function build(n: number, edges: Array<[number, number]>): Poset {
  let p = emptyPoset(n);
  for (const [a, b] of edges) p = withRelation(p, a, b);
  return close(p);
}

const PRESETS: Array<{ key: string; label: string; make: () => Poset }> = [
  { key: "onetwo", label: "1 + 2 (the extremal seed)", make: () => build(3, [[0, 2]]) },
  { key: "hook4", label: "hook H(4)", make: () => build(6, [[2, 3], [3, 4], [4, 5], [0, 2], [1, 3]]) },
  { key: "v", label: "V (one below two)", make: () => build(3, [[0, 1], [0, 2]]) },
  { key: "n", label: "N poset", make: () => build(4, [[0, 2], [1, 2], [1, 3]]) },
  { key: "twotwo", label: "2 + 2", make: () => build(4, [[0, 1], [2, 3]]) },
  { key: "antichain4", label: "antichain(4)", make: () => build(4, []) },
  { key: "chain4", label: "chain(4)", make: () => build(4, [[0, 1], [1, 2], [2, 3]]) },
  {
    key: "grid23",
    label: "grid 2 × 3",
    make: () => build(6, [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 4], [2, 5]]),
  },
  {
    key: "cube",
    label: "Boolean cube B₃",
    make: () =>
      build(8, [
        [0, 1], [0, 2], [0, 3],
        [1, 4], [1, 5], [2, 4], [2, 6], [3, 5], [3, 6],
        [4, 7], [5, 7], [6, 7],
      ]),
  },
  {
    key: "fence",
    label: "fence (zigzag, 6)",
    make: () => build(6, [[0, 1], [2, 1], [2, 3], [4, 3], [4, 5]]),
  },
];

function randomPoset(n: number): Poset {
  const p = emptyPoset(n);
  const density = 0.15 + Math.random() * 0.35;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) if (Math.random() < density) p.lt[b] |= 1 << a;
  return close(p);
}

function HasseDiagram({ p, highlight }: { p: Poset; highlight: [number, number] | null }) {
  const { positions, edges, H } = useMemo(() => {
    // level = longest chain strictly below
    const level = new Array<number>(p.n).fill(0);
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < p.n; i++) {
        for (let j = 0; j < p.n; j++) {
          if (p.lt[i] & (1 << j) && level[j] + 1 > level[i]) {
            level[i] = level[j] + 1;
            changed = true;
          }
        }
      }
    }
    const maxLevel = Math.max(...level);
    const byLevel = new Map<number, number[]>();
    for (let i = 0; i < p.n; i++) {
      const g = byLevel.get(level[i]) ?? [];
      g.push(i);
      byLevel.set(level[i], g);
    }
    const W = 360;
    const H = 70 + maxLevel * 70;
    const positions = new Array<{ x: number; y: number }>(p.n);
    for (const [lv, els] of byLevel) {
      els.forEach((el, idx) => {
        positions[el] = {
          x: (W * (idx + 1)) / (els.length + 1),
          y: H - 36 - lv * 70,
        };
      });
    }
    return { positions, edges: coverEdges(p), H };
  }, [p]);

  const isHi = (i: number) => highlight !== null && (i === highlight[0] || i === highlight[1]);

  return (
    <svg className="chart-svg" viewBox={`0 0 360 ${H}`} style={{ maxWidth: 380 }}>
      {edges.map(([j, i], k) => (
        <line
          key={k}
          x1={positions[j].x}
          y1={positions[j].y}
          x2={positions[i].x}
          y2={positions[i].y}
          stroke="var(--line)"
          strokeWidth={1.6}
        />
      ))}
      {positions.map((pos, i) => (
        <g key={i}>
          <circle
            cx={pos.x}
            cy={pos.y}
            r={14}
            fill={isHi(i) ? "var(--accent)" : "var(--bg-raised)"}
            stroke={isHi(i) ? "var(--accent)" : "var(--ink-dim)"}
            strokeWidth={1.5}
          />
          <text
            x={pos.x}
            y={pos.y + 4.5}
            textAnchor="middle"
            fontSize={13}
            fontFamily="var(--mono)"
            fill={isHi(i) ? "#14161c" : "var(--ink)"}
          >
            {i}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function BalanceLab() {
  const [presetKey, setPresetKey] = useState("hook4");
  const [randomN, setRandomN] = useState(6);
  const [poset, setPoset] = useState<Poset>(() => PRESETS.find((p) => p.key === "hook4")!.make());

  const analysis = useMemo(() => {
    const e = countExtensions(poset);
    const pairs = pairStats(poset, e).map((s) => {
      const minSide = s.aFirst < s.bFirst ? s.aFirst : s.bFirst;
      return { ...s, minSide };
    });
    // sort by minSide/e descending — e is shared across pairs, so compare minSide directly
    pairs.sort((x, y) => (y.minSide > x.minSide ? 1 : y.minSide < x.minSide ? -1 : 0));
    const best = pairs[0] ?? null;
    return { e, pairs, best };
  }, [poset]);

  const { e, pairs, best } = analysis;
  const holds = best ? 3n * best.minSide >= e : null; // b(P) ≥ 1/3 exactly?

  return (
    <div className="panel">
      <div className="panel-title">Instrument · the balance lab — exact pair probabilities</div>
      <div className="controls">
        <select
          value={presetKey}
          onChange={(ev) => {
            const key = ev.target.value;
            setPresetKey(key);
            const preset = PRESETS.find((p) => p.key === key);
            if (preset) setPoset(preset.make());
          }}
        >
          {PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          className="btn ghost"
          type="button"
          onClick={() => {
            setPresetKey("random");
            setPoset(randomPoset(randomN));
          }}
        >
          random poset
        </button>
        <label style={{ fontSize: 13, color: "var(--ink-dim)" }}>
          n = {randomN}{" "}
          <input
            type="range"
            min={3}
            max={9}
            value={randomN}
            onChange={(ev) => setRandomN(Number(ev.target.value))}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "flex-start" }}>
        <HasseDiagram p={poset} highlight={best ? [best.a, best.b] : null} />
        <div style={{ flex: "1 1 320px", minWidth: 280 }}>
          <div className="statgrid">
            <div className="stat">
              <div className="k">linear extensions</div>
              <div className="v accent">{e.toString()}</div>
            </div>
            <div className="stat">
              <div className="k">incomparable pairs</div>
              <div className="v">{pairs.length}</div>
            </div>
            <div className="stat">
              <div className="k">b(P) — best balance</div>
              <div className="v">{best ? frac(best.minSide, e) : "— (chain)"}</div>
            </div>
          </div>
          {pairs.length === 0 ? (
            <div className="verdict">
              This poset is a chain — no incomparable pairs, the conjecture says nothing about it.
            </div>
          ) : (
            <div className="verdict ok" style={holds ? {} : { borderColor: "rgba(239,71,111,0.4)", color: "var(--odd)" }}>
              {holds
                ? `b(P) = ${frac(best!.minSide, e)} ≥ 1/3 — the conjecture holds here (exact comparison: 3·${best!.minSide} ≥ ${e}).`
                : `b(P) = ${frac(best!.minSide, e)} < 1/3 — if you are seeing this on a real poset, check the code, then call a mathematician.`}
            </div>
          )}
          {pairs.length > 0 && (
            <div className="steps-scroll" style={{ maxHeight: 240 }}>
              <table className="steps">
                <thead>
                  <tr>
                    <th>pair</th>
                    <th>P(a &lt; b)</th>
                    <th>≈</th>
                    <th>min side</th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.map((s) => {
                    const isBest = best && s.a === best.a && s.b === best.b;
                    return (
                      <tr key={`${s.a}-${s.b}`}>
                        <td className="val" style={isBest ? { color: "var(--accent)" } : {}}>
                          ({s.a}, {s.b}){isBest ? " ★" : ""}
                        </td>
                        <td>{frac(s.aFirst, e)}</td>
                        <td>{(Number(s.aFirst) / Number(e)).toFixed(4)}</td>
                        <td>{frac(s.minSide, e)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
