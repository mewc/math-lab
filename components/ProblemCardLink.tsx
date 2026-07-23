import Link from "next/link";
import { problemHref, STAGE_LABEL, type Problem } from "@/lib/problems";

// Server-rendered problem card for the hub pages (/problems/[category],
// /tags/[tag]). Mirrors the client card in SearchHome but ships as static HTML
// so every card is a real crawlable <a>. Reuses the same CSS classes.

export default function ProblemCardLink({ p }: { p: Problem }) {
  return (
    <div className="problem-card">
      <Link href={problemHref(p)} className="card-hitbox" aria-label={p.title} />
      <div className="card-top">
        <span className="card-title">{p.title}</span>
        <span className="card-cat">{p.category}</span>
        <span className="stage-badge" data-stage={p.stage}>
          {STAGE_LABEL[p.stage]}
        </span>
      </div>
      <p className="card-statement">{p.statement}</p>
      {p.aka && p.aka.length > 0 && <div className="card-aka">a.k.a. {p.aka.join(" · ")}</div>}
    </div>
  );
}
