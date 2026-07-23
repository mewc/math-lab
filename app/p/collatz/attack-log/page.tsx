import type { Metadata } from "next";
import Link from "next/link";
import AttackLog from "@/components/AttackLog";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Math Lab — Collatz: the attack log",
  description:
    "Four real lines of attack on the Collatz conjecture, executed live in exact arithmetic and logged depth-by-depth to their terminal states.",
};

export default function AttackLogPage() {
  return (
    <>
      <header className="topbar">
        <span className="wordmark">
          <Link href="/" style={{ color: "inherit" }}>
            <b>Math</b> Lab
          </Link>
        </span>
        <Link href="/p/collatz" style={{ fontSize: 13 }}>
          ← the dossier
        </Link>
        <span className="status-chip">status: unsolved · 89 years</span>
        <ThemeToggle />
      </header>
      <div className="shell" style={{ gridTemplateColumns: "minmax(0, 1fr)", maxWidth: 1000 }}>
        <main>
          <div className="hero">
            <div className="kicker">Live execution · every number computed in this browser</div>
            <h1>
              The <em>attack log</em>
            </h1>
            <p className="lede">
              You asked for the paths, walked, logged, deeper. Here they are — the four serious lines of attack on the
              conjecture, <strong>actually executed</strong>: ranking-function candidates killed at computed
              counterexamples, the cycle gauntlet run through exact convergents of log₂3, the covering induction pushed
              to modulus 2¹⁰²⁴, the divergence bias measured across real orbits. Each log ends at the same place the
              field&apos;s best mathematicians ended: a terminal wall, precisely characterized. What no honest log can
              end with is a proof — the conjecture is open, and these instruments show <em>exactly why</em>.
            </p>
          </div>
          <div style={{ marginTop: 36 }}>
            <AttackLog />
          </div>
        </main>
      </div>
    </>
  );
}
