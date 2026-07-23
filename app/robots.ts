import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Open to all crawlers (including AI answer engines — GPTBot, ClaudeBot,
// PerplexityBot); the whole site is public research. Point them at the sitemap.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
