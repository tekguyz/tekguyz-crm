import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/LandingPage";
import { BRAND } from "@/lib/brand/copy";

// The Landing Page (#32). Its public address is `/`: the middleware rewrites a
// signed-out `/` here and redirects a direct /welcome back to `/`
// (src/lib/supabase/middleware.ts). A signed-in `/` never reaches this file.
//
// Its own route group, outside (app): that layout resolves the current org and
// sends a signed-out visitor to /login, which is the opposite of this page.
//
// NO openGraph OR twitter KEY HERE, ON PURPOSE. Setting either on a page
// replaces the root layout's whole object, and with it the og:image that the
// root opengraph-image.tsx supplies — measured: the card lost its image. The
// root's card (BRAND.name, BRAND.description, the branded image) is the
// Landing Page's card.
//
// THE ONE INDEXED PAGE. The root layout marks every route noindex; this page
// overrides it, because the Landing Page is how a stranger finds the app
// (DEMO-STANDARD.md § Search engines).
const TITLE = `${BRAND.name} — ${BRAND.tagline}`;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: BRAND.description,
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export default function WelcomePage() {
  return <LandingPage />;
}
