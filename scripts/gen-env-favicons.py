#!/usr/bin/env python3
"""Generate environment-badged favicon sets from the production abacus icons.

The base favicon stack in public/ (generated with favicontools.com) is the
PRODUCTION icon. favicontools.com's own env-badge feature is inert on the
current public API — every variant returns the identical abacus — so we composite
the env badge locally instead: a small corner dot in the environment's colour,
readable down to 16px, laid over the existing icons.

Outputs (same filenames as the root set, so layout.tsx just swaps the base path):
  public/preview/  — amber  badge  (Vercel preview deploys)
  public/dev/      — emerald badge  (local `next dev`)

Production is the plain public/ set — no badge, nothing to regenerate.

Run:  python3 scripts/gen-env-favicons.py
Deps: Pillow (already available on this machine).
"""
from __future__ import annotations

import io
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"

# Tab-visible PNGs worth badging (source name -> dest name; same names).
PNG_ICONS = [
    "favicon-16x16.png",
    "favicon-16x16-light.png",
    "favicon-16x16-dark.png",
    "favicon-32x32.png",
    "favicon-48x48.png",
    "favicon-96x96.png",
    "apple-touch-icon.png",
]
# Sizes bundled into the multi-res favicon.ico.
ICO_SIZES = [16, 32, 48]

ENVIRONMENTS = {
    "preview": "#f59e0b",  # amber-500
    "dev": "#10b981",      # emerald-500
}


def _hex(c: str) -> tuple[int, int, int]:
    c = c.lstrip("#")
    return tuple(int(c[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def badge(src: Image.Image, color: tuple[int, int, int]) -> Image.Image:
    """Composite a bottom-right corner dot (colour + white ring) onto `src`."""
    img = src.convert("RGBA")
    w, h = img.size
    # Supersample so the ring stays crisp at 16px.
    scale = 4
    big = img.resize((w * scale, h * scale), Image.LANCZOS)
    draw = ImageDraw.Draw(big)

    s = w * scale
    r = s * 0.17              # dot radius
    cx = cy = s - r - s * 0.05  # inset from the bottom-right corner
    ring = max(2, int(s * 0.03))

    # White separating ring, then the coloured dot on top.
    draw.ellipse(
        [cx - r - ring, cy - r - ring, cx + r + ring, cy + r + ring],
        fill=(255, 255, 255, 255),
    )
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (255,))

    return big.resize((w, h), Image.LANCZOS)


def main() -> None:
    for env, hex_color in ENVIRONMENTS.items():
        color = _hex(hex_color)
        out = PUBLIC / env
        out.mkdir(parents=True, exist_ok=True)

        for name in PNG_ICONS:
            src_path = PUBLIC / name
            if not src_path.exists():
                print(f"  skip {name} (missing)")
                continue
            badge(Image.open(src_path), color).save(out / name)

        # Build the multi-res .ico from freshly badged sizes.
        base32 = Image.open(PUBLIC / "favicon-32x32.png")
        ico_frames = [
            badge(base32.resize((n, n), Image.LANCZOS), color) for n in ICO_SIZES
        ]
        ico_frames[0].save(
            out / "favicon.ico",
            format="ICO",
            sizes=[(n, n) for n in ICO_SIZES],
            append_images=ico_frames[1:],
        )
        print(f"  wrote {env}/ ({hex_color}) -> {len(PNG_ICONS)} png + favicon.ico")


if __name__ == "__main__":
    main()
