import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // The old public demo link. It is NOT under /api/, so it has to be named
  // here. Since #31 it only redirects to the Landing Page and never signs
  // anyone in (src/app/demo/route.ts), so it never touches Supabase auth: no
  // getClaims() here either, because that call can refresh a token and rewrite
  // the visitor's cookies.
  if (request.nextUrl.pathname === "/demo") return NextResponse.next({ request });

  // The Landing Page's real file. Its one public address is `/` (rewritten
  // below), so a direct visit is sent there: one URL to share, to index and to
  // preview. No auth call, for the same reason as /demo above.
  if (request.nextUrl.pathname === "/welcome") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the auth token if expired. Do not add logic between
  // createServerClient and this call — it must run on every request.
  //
  // getClaims, NOT getUser. getUser() is a network round-trip to the Supabase
  // Auth server on EVERY request this matcher covers — which is every page
  // load AND every client-side RSC navigation. Measured at ~340ms of TTFB
  // before Next had rendered a single byte, on every route alike, which is
  // what made the loading.tsx skeleton flash on navigations that had almost no
  // data to fetch. getClaims verifies the JWT signature locally with the Web
  // Crypto API against the project's cached asymmetric (ES256) signing key, so
  // it is the same security guarantee without the round-trip — it is NOT
  // getSession(), which trusts the cookie unverified and must never be used
  // here. It still refreshes an expired token, because it reads the session
  // through the same storage adapter getUser() did.
  const {
    data: claimsData,
  } = await supabase.auth.getClaims();
  const user = claimsData?.claims ?? null;

  const path = request.nextUrl.pathname;
  const isAuthRoute =
    path === "/login" ||
    path === "/signup" ||
    path === "/forgot-password" ||
    path.startsWith("/auth/confirm") ||
    path.startsWith("/invite/");

  // API routes handle their own auth (or are intentionally public, like the
  // webhook ingestion endpoint) — they never rely on the cookie-based session
  // redirect that page routes use.
  const isApiRoute = path.startsWith("/api/");

  // Public metadata routes. These are fetched by link-preview crawlers and by
  // the browser itself, neither of which carries a session cookie — so the
  // auth redirect below turns every one of them into a 307 to /login and the
  // asset silently never renders. It fails invisibly to a signed-in human,
  // who has the cookie and sees the real thing, which is exactly how the OG
  // card shipped broken: the URL worked in the owner's browser and returned
  // "Redirecting..." to Slack, Vercel's OG inspector, and every other crawler.
  // Nothing here is tenant data — it is the same bytes for every visitor.
  const isPublicMetadataRoute =
    path === "/opengraph-image" ||
    path === "/twitter-image" ||
    path === "/manifest.webmanifest" ||
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path.startsWith("/icons/") ||
    path.startsWith("/brand/");

  // A signed-out `/` is the Landing Page (#32), not the sign-in form: a link
  // shared by text or WhatsApp must open on something that explains the app.
  // A REWRITE, so the address stays `/` and a signed-in user's `/` is still
  // the app. Any cookie getClaims cleared above (a stale session) is carried
  // onto the rewrite, or the browser would keep sending it.
  if (!user && path === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    const rewrite = NextResponse.rewrite(url, { request });
    for (const cookie of supabaseResponse.cookies.getAll()) rewrite.cookies.set(cookie);
    return rewrite;
  }

  if (!user && !isAuthRoute && !isApiRoute && !isPublicMetadataRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
