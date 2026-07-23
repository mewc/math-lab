import { buildFeed, feedItemHref, FEED_KIND_LABEL, type FeedItem } from "@/lib/feed";

// RSS 2.0 feed of the lab's latest — the same items the homepage NewsFeed shows,
// derived from the problem registry (solves + notes) plus curated entries. Any
// AI/human update that lands a problem note or solve in lib/problems.ts, or a
// curated item in lib/feed.ts, flows into this feed automatically. Hand-built
// XML, no dependencies.

export const dynamic = "force-static";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mathlab.drummerduck.com").replace(
  /\/$/,
  "",
);

function xml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Content is emitted inside a CDATA block, so XML entities stay literal; the only
// thing that must not appear raw is the CDATA terminator `]]>`. Our strings use
// single quotes (no `"`), so HTML attributes inside the block stay well-formed.
function cdata(s: string): string {
  return s.replace(/]]>/g, "]]&gt;");
}

/** Absolute URL for an item: its dossier on this site, else its external link. */
function absoluteLink(item: FeedItem): string {
  const href = feedItemHref(item);
  if (!href) return SITE_URL;
  if (/^https?:\/\//.test(href)) return href;
  return SITE_URL + href;
}

/** RFC-822 pubDate; falls back to omitting the date on unparseable labels. */
function pubDate(date: string): string | null {
  const t = Date.parse(date) || Date.parse(`${date} 1`);
  return Number.isNaN(t) ? null : new Date(t).toUTCString();
}

export function GET() {
  const items = buildFeed(60);

  const entries = items
    .map((item) => {
      const link = absoluteLink(item);
      const date = pubDate(item.date);
      const imgUrl = item.image ? SITE_URL + item.image : null;
      // HTML description (CDATA) so readers render the image inline; the raw
      // summary stays intact. <enclosure> covers readers that use media attachments.
      const descHtml =
        (imgUrl ? `<p><img src="${imgUrl}" alt="${cdata(item.imageAlt ?? item.title)}" /></p>` : "") +
        `<p>${cdata(item.summary)}</p>`;
      return [
        "    <item>",
        `      <title>${xml(item.title)}</title>`,
        `      <link>${xml(link)}</link>`,
        `      <guid isPermaLink="false">math-lab:${xml(item.id)}</guid>`,
        `      <category>${xml(FEED_KIND_LABEL[item.kind])}</category>`,
        date ? `      <pubDate>${date}</pubDate>` : null,
        imgUrl ? `      <enclosure url="${xml(imgUrl)}" length="0" type="image/png" />` : null,
        `      <description><![CDATA[${descHtml}]]></description>`,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Math Lab — the latest</title>
    <link>${SITE_URL}</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Solves, progress notes, and updates across the Math Lab open-problems index.</description>
    <language>en</language>
${entries}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
