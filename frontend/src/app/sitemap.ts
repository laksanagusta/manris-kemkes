import type { MetadataRoute } from "next";
import { documentationArticles } from "@/lib/documentation-content";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL },
    ...documentationArticles.map(({ slug }) => ({
      url: `${SITE_URL}/docs/${slug}`,
    })),
  ];
}
