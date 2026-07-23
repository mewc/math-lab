"use client";

import { useEffect, useState } from "react";

// A light-hearted counterpoint to the serious registry: a slow auto-rotating
// loop of research memes on the landing view. Hand-rolled (no carousel lib),
// pauses on hover, dots to jump. Images crossfade (all preloaded, so no flash).
// Purely decorative — an <aside> with alt text; the first frame links out to the
// trending X topic that kicked it off.

type Meme = { src: string; alt: string; href?: string };

const MEMES: Meme[] = [
  {
    src: "/figures/ai-disproves-conjecture.png",
    alt: "Meme: a cat captioned 'open X every 6 hours → AI disproves another conjecture', on a loop.",
    href: "https://x.com/i/trending/2080179717932458044",
  },
  {
    src: "/figures/meme-disprove-conjecture.png",
    alt: "Comic: 'Disprove the conjecture.' — 'I couldn't find a counterexample.' — 'pls continue' … 'Fine. Counterexample attached.' — 'oh my god.'",
  },
  {
    src: "/figures/meme-complete-counterexample.png",
    alt: "Comic: 'let's finish with a complete unconditional counterexample' → 'finished with complete counterexample' → 'oh my god.'",
  },
  {
    src: "/figures/meme-dont-give-up-diamonds.png",
    alt: "Cartoon: two miners — the one who turned back gave up inches from a wall of diamonds.",
  },
];

const INTERVAL_MS = 6000;

export default function HomeMemeLoop() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((n) => (n + 1) % MEMES.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, [paused]);

  const current = MEMES[active];

  return (
    <aside
      className="meme-loop"
      aria-label="Fun break — research memes"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="meme-loop-head">
        <span>Meanwhile, on the timeline</span>
        <span className="meme-loop-sub">it&apos;s not all serious maths</span>
      </div>

      <div className="meme-stage">
        {MEMES.map((m, idx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={m.src}
            src={m.src}
            alt={m.alt}
            loading={idx === 0 ? "eager" : "lazy"}
            className="meme-img"
            data-active={idx === active}
            aria-hidden={idx !== active}
          />
        ))}
        {current.href && (
          <a
            className="meme-link"
            href={current.href}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Open the trending topic on X"
          />
        )}
      </div>

      <div className="meme-dots" role="tablist" aria-label="Choose a meme">
        {MEMES.map((m, idx) => (
          <button
            key={m.src}
            type="button"
            className="meme-dot"
            data-active={idx === active}
            onClick={() => setActive(idx)}
            aria-label={`Show meme ${idx + 1} of ${MEMES.length}`}
            aria-selected={idx === active}
            role="tab"
          />
        ))}
      </div>
    </aside>
  );
}
