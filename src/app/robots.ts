import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";

/** Search engines may read the public pages; the signed-in app and the API stay out of results. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/overview", "/platforms", "/content", "/audience", "/reports", "/settings", "/onboarding", "/welcome"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
