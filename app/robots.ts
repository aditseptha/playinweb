import type { MetadataRoute } from "next";
import { apexHref } from "@/lib/host";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/auth/", "/manage"] },
    sitemap: apexHref("/sitemap.xml"),
  };
}
