import type { MetadataRoute } from "next";

// robots.txt. Crawling is allowed everywhere a page lives; INDEXING is decided
// per page by its robots meta tag, and only the Landing Page at `/` says
// index (src/app/(landing)/welcome/page.tsx). Every other page inherits the
// root layout's noindex. A Disallow here would stop a crawler reading that
// noindex at all, so the pages are left crawlable on purpose. /api/ holds no
// page, so it is closed.
//
// On the middleware's public allowlist (src/lib/supabase/middleware.ts), or a
// cookie-less crawler would be redirected to /login instead of reading it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
  };
}
