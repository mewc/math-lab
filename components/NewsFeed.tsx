import Link from "next/link";
import { CheckCircle2, Rss } from "lucide-react";

import {
  buildFeed,
  feedItemHref,
  FEED_KIND_LABEL,
  FEED_SOURCE_LABEL,
  type FeedItem,
} from "@/lib/feed";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// "The latest" — a horizontal-scroll row of shadcn cards: solves, progress
// notes, and curated updates (external write-ups, X posts). Server component:
// the data is static (derived from the registry + curated list in lib/feed.ts),
// so it renders on the server and ships no JS. The same items back /feed.xml.

function formatDate(d: string): string {
  const t = Date.parse(d);
  if (Number.isNaN(t)) return d; // keep loose labels like "Jul 2026" as-is
  return new Date(t).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function NewsFeed({ limit = 8 }: { limit?: number }) {
  const items = buildFeed(limit);
  if (items.length === 0) return null;

  return (
    <section className="my-6" aria-label="Latest updates">
      <div className="mb-3.5 flex items-baseline justify-between border-b pb-2">
        <h2 className="text-xl" style={{ fontFamily: "var(--serif)" }}>
          Latest
        </h2>
        <a
          href="/feed.xml"
          className="inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.08em] text-foreground/70 uppercase hover:text-foreground"
          title="RSS feed"
          aria-label="RSS feed"
        >
          <Rss className="size-3.5" />
          RSS
        </a>
      </div>

      <ol className="flex snap-x snap-proximity gap-3 overflow-x-auto pb-3.5 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]">
        {items.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </ol>
    </section>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const href = feedItemHref(item);
  const internal = href?.startsWith("/") ?? false;

  // Memes are image-only cards — no title/summary. A small corner tag keeps them
  // honestly labeled as memes; the image links out when there's a real source.
  if (item.kind === "meme" && item.image) {
    const media = (
      <div className="relative flex h-full w-full items-center justify-center bg-[var(--bg-inset)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* Cap the height so a portrait meme can't stretch the whole row (and
            leave the text cards with big empty gaps); object-contain + center
            letterboxes shorter memes cleanly. */}
        <img
          src={item.image}
          alt={item.imageAlt ?? item.title}
          loading="lazy"
          className="max-h-[260px] w-full object-contain"
        />
        <span className="absolute top-2 left-2 rounded bg-background/70 px-1.5 py-0.5 text-[9px] tracking-wider text-muted-foreground uppercase backdrop-blur-sm">
          Meme
        </span>
      </div>
    );
    return (
      <li className="max-md:basis-[86vw] flex shrink-0 basis-[320px] snap-start list-none">
        <Card className="h-full w-full gap-0 overflow-hidden p-0">
          {href ? (
            internal ? (
              <Link href={href} className="block h-full w-full" aria-label={item.title}>
                {media}
              </Link>
            ) : (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="block h-full w-full"
                aria-label={item.title}
              >
                {media}
              </a>
            )
          ) : (
            media
          )}
        </Card>
      </li>
    );
  }

  const title = "line-clamp-2 text-[16.5px] leading-snug text-foreground hover:text-primary";
  const titleNode = href ? (
    internal ? (
      <Link href={href} className={title} style={{ fontFamily: "var(--serif)" }}>
        {item.title}
      </Link>
    ) : (
      <a
        href={href}
        className={title}
        style={{ fontFamily: "var(--serif)" }}
        target="_blank"
        rel="noreferrer noopener"
      >
        {item.title}
      </a>
    )
  ) : (
    <span className={title} style={{ fontFamily: "var(--serif)" }}>
      {item.title}
    </span>
  );

  // Solves are the marquee outcome — ring them in blue and give the badge a
  // check so a solved problem reads as clearly "done" next to progress notes.
  const isSolve = item.kind === "solve";

  return (
    <li className="max-md:basis-[86vw] flex shrink-0 basis-[320px] snap-start list-none">
      <Card
        className={`h-full w-full gap-2.5 py-4 ${
          isSolve ? "border-blue-500/70 ring-1 ring-blue-500/25 bg-blue-500/[0.04]" : ""
        }`}
      >
        <div className="flex h-full flex-col gap-2 px-4">
          <div className="flex flex-wrap items-center gap-2">
            {isSolve ? (
              <Badge className="gap-1 border-transparent bg-blue-600 text-[9.5px] tracking-wider text-white uppercase hover:bg-blue-600">
                <CheckCircle2 className="size-3" />
                {FEED_KIND_LABEL[item.kind]}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[9.5px] tracking-wider uppercase">
                {FEED_KIND_LABEL[item.kind]}
              </Badge>
            )}
            {item.source && (
              <span className="text-[10.5px] text-muted-foreground">
                {FEED_SOURCE_LABEL[item.source]}
              </span>
            )}
            <time className="ml-auto text-[10.5px] text-muted-foreground">
              {formatDate(item.date)}
            </time>
          </div>
          {item.image && (
            <div className="overflow-hidden rounded-md border bg-[var(--bg-inset)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.imageAlt ?? ""}
                loading="lazy"
                className="h-[150px] w-full object-contain"
              />
            </div>
          )}
          {titleNode}
          <p className="line-clamp-4 text-[12.5px] leading-relaxed text-muted-foreground">
            {item.summary}
          </p>
        </div>
      </Card>
    </li>
  );
}
