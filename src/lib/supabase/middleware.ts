import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
