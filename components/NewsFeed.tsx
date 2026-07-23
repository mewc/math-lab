import Link from "next/link";
import {
  buildFeed,
  feedItemHref,
  FEED_KIND_LABEL,
  FEED_SOURCE_LABEL,
  type FeedItem,
} from "@/lib/feed";

// "The latest" — a news feed of solves, progress notes, and curated updates
// (external write-ups, X posts). Server component: the data is static (derived
// from the registry + curated list), so it renders on the server and ships no
// JS. Sources it from lib/feed.ts; the same items back /feed.xml.

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
    <section className="feed" aria-label="Latest updates">
      <div className="feed-head">
        <h2 className="feed-title">Latest</h2>
        <a className="feed-rss" href="/feed.xml" title="RSS feed" aria-label="RSS feed">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="6.18" cy="17.82" r="2.18" />
            <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83C19.56 11.4 12.6 4.44 4 4.44z" />
            <path d="M4 10.1v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83C13.9 14.4 9.5 10.1 4 10.1z" />
          </svg>
          <span>RSS</span>
        </a>
      </div>

      <ol className="feed-list">
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

  const titleNode = href ? (
    internal ? (
      <Link href={href} className="feed-item-title">
        {item.title}
      </Link>
    ) : (
      <a href={href} className="feed-item-title" target="_blank" rel="noreferrer noopener">
        {item.title}
      </a>
    )
  ) : (
    <span className="feed-item-title">{item.title}</span>
  );

  return (
    <li className="feed-item" data-kind={item.kind}>
      <div className="feed-item-meta">
        <span className="feed-kind" data-kind={item.kind}>
          {FEED_KIND_LABEL[item.kind]}
        </span>
        {item.source && <span className="feed-source">{FEED_SOURCE_LABEL[item.source]}</span>}
        <time className="feed-date">{formatDate(item.date)}</time>
      </div>
      {titleNode}
      <p className="feed-summary">{item.summary}</p>
      {item.links && item.links.length > 0 && (
        <div className="feed-links">
          {item.links.map((l, i) =>
            l.url ? (
              <a key={i} href={l.url} target="_blank" rel="noreferrer noopener">
                {l.label}
              </a>
            ) : (
              <span key={i} className="feed-link-plain">
                {l.label}
              </span>
            ),
          )}
        </div>
      )}
    </li>
  );
}
