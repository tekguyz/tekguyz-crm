import { notFound } from "next/navigation";
import type { ReactNode } from "react";

// DEV ONLY. Gated the same way /api/dev-login is: an ALLOWLIST on
// NODE_ENV === "development", not a `!== "production"` denylist, so on any
// build whose NODE_ENV is unset or unexpected these routes do not exist.
//
// THIS IS THE SECOND OF THREE GATES, AND ON ITS OWN IT IS NOT ENOUGH.
//
// 1. `updateSession` in src/lib/supabase/middleware.ts names no exemption for
//    /shell, so an unauthenticated production request is redirected to /login
//    before it reaches this file at all. Measured: 307 → /login.
//
// 2. This layout refuses the segment for a signed-in user on a production
//    build. Measured: the response carries React's
//    NEXT_HTTP_ERROR_FALLBACK;404 for this segment and the browser renders
//    Next's 404 page.
//
// 3. Each page.tsx repeats the check, and that repetition is NOT belt-and-
//    braces — it is the gate that actually keeps the comp markup out of the
//    production build. A layout that throws does not stop its page from
//    rendering: React renders the two concurrently, so with the check only
//    here, `next build` still prerendered 39KB of real comp markup into
//    .next/server/app/shell/sectioned.html and shipped it inside the 404
//    response. With the check at the top of the page, the page component
//    returns before it renders anything and the markup does not exist.
//    /design has always had it in the page for this reason; its prerendered
//    output is a clean 404 with none of its own markup in it, which is what
//    this directory now matches.
//
// One thing this cannot do in this app is make the HTTP STATUS 404. The root
// src/app/loading.tsx puts a Suspense boundary above every route, so Next
// flushes the shell — and commits the 200 — before any page or layout body
// has run. Every page route in this codebase therefore answers 200 and
// delivers its real outcome in the stream; /api/dev-login returns a true 404
// only because a Route Handler has no such boundary. Verified, not assumed.
//
// Lives outside the (app) route group deliberately, the same as /design:
// these pages render their OWN shell chrome as comps, so inheriting the real
// AppShell would put two sidebars and two headers on one screen.
export default function ShellPreviewLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== "development") notFound();

  return children;
}
