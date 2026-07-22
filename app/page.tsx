import SearchHome from "@/components/SearchHome";
import { PROBLEMS } from "@/lib/problems";

export default function Page() {
  const live = PROBLEMS.filter((p) => p.stage === "live").length;
  const started = PROBLEMS.filter((p) => p.stage !== "untouched").length;
  return (
    <>
      <header className="topbar">
        <span className="wordmark">
          <b>Math</b> Lab
        </span>
        <span style={{ color: "var(--ink-faint)", fontSize: 13 }}>the open problems index</span>
        <span className="status-chip" style={{ color: "var(--even)", borderColor: "rgba(38, 198, 162, 0.4)" }}>
          {PROBLEMS.length} problems · {live} live · {started} tackled
        </span>
      </header>
      <div className="home-shell">
        <SearchHome />
      </div>
    </>
  );
}
