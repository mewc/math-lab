import { ImageResponse } from "next/og";
import { PROBLEMS } from "@/lib/problems";

// Site-wide social card. Also the fallback OG for any page without its own
// image (the hand-built dossiers, hub pages). Rendered with next/og — part of
// Next, no extra dependency.

export const alt = "Math Lab — the open problems index";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  const tackled = PROBLEMS.filter((p) => p.stage !== "untouched").length;
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
          padding: "72px 80px",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#c9a15a",
              color: "#0f0e0c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            M
          </div>
          <div style={{ fontSize: 30, letterSpacing: 2 }}>Math Lab</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, lineHeight: 1.05, maxWidth: 900 }}>
            Every problem worth throwing tokens at
          </div>
          <div style={{ fontSize: 30, color: "#b7b0a2", maxWidth: 940 }}>
            One searchable index of open, computationally approachable math problems — precise
            statement, honest status, attack plan.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#8f887a", letterSpacing: 1 }}>
          {PROBLEMS.length} open problems · {tackled} tackled · mathlab.drummerduck.com
        </div>
      </div>
    ),
    size,
  );
}
