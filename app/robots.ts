import type { MetadataRoute } from "next";

const siteUrl = "https://telio.sk";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api", "/dashboard", "/internal", "/bookings", "/newbookings", "/esthetic", "/driver-gps"],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "OAI-SearchBot",
          "Google-Extended",
          "PerplexityBot",
          "ClaudeBot",
          "anthropic-ai",
          "cohere-ai",
          "Applebot-Extended",
        ],
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api", "/dashboard", "/internal", "/bookings", "/newbookings", "/esthetic", "/driver-gps"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
