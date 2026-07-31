import type { MetadataRoute } from "next";

const siteUrl = "https://telio.sk";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy"],
      disallow: ["/api", "/dashboard", "/internal", "/bookings", "/newbookings", "/esthetic", "/driver-gps"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
