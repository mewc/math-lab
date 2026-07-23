import { ImageResponse } from "next/og";
import { getProblem, PROBLEMS, STAGE_LABEL } from "@/lib/problems";

// Per-problem social card. Generated for every generic dossier (the hand-built
// collatz / one-third pages carry their own metadata and fall back to the
// site OG). Mirrors app/p/[slug]/page.tsx's static params.

export const alt = "Math Lab problem dossier";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return PROBLEMS.filter((p) => !p.href).map((p) => ({ slug: p.slug }));
}

// satori's embedded font covers Latin (incl. diacritics — Erdős, Kühn stay
// intact) but not math glyphs; unmapped ones trigger a flaky build-time font
// fetch. Transliterate the symbols the registry actually uses, drop the rest.
const OG_GLYPHS: Record<string, string> = {
  "′": "'", "″": '"', "…": "...", "−": "-", "—": "-", "–": "-",
  "≈": "~", "≤": "<=", "≥": ">=", "ᵀ": "T", "₂": "2", "∅": "{}",
  "ζ": "zeta", "μ": "mu", "Δ": "Delta", "⌈": "", "⌉": "", "⌊": "", "⌋": "",
};
function ogText(s: string): string {
  return [...s]
    .map((ch) => (ch in OG_GLYPHS ? OG_GLYPHS[ch] : ch.codePointAt(0)! > 0x24f ? "" : ch))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

const STAGE_COLOR: Record<string, string> = {
  solved: "#8ab87a",
  live: "#c9a15a",
  started: "#c9a15a",
  untouched: "#8f887a",
};

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProblem(slug);
  const title = ogText(p?.title ?? "Math Lab");
  const category = p?.category ?? "Open problems";
  const statement = ogText(p?.statement ?? "");
  const stage = p?.stage ?? "untouched";
  const clipped = statement.length > 220 ? `${statement.slice(0, 217)}...` : statement;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0f0e0c",
          color: "#f4f1ea",
          padding: "64px 76px",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 24,
            letterSpacing: 2,
            color: "#b7b0a2",
          }}
        >
          <div style={{ display: "flex" }}>Math Lab · {category}</div>
          <div style={{ display: "flex", color: STAGE_COLOR[stage] }}>{STAGE_LABEL[stage]}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 62, lineHeight: 1.05, maxWidth: 1040 }}>{title}</div>
          <div style={{ fontSize: 28, color: "#b7b0a2", lineHeight: 1.4, maxWidth: 1040 }}>
            {clipped}
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#8f887a", letterSpacing: 1 }}>
          mathlab.drummerduck.com
        </div>
      </div>
    ),
    size,
  );
}
