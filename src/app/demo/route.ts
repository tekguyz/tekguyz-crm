import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PUBLIC. Signs in the read-only demo identity and redirects into the app, so
// tekguyz.com's case study can link straight to a working instance instead of
// dead-ending an anonymous visitor on /login.
//
// WHY THIS HAS NO NODE_ENV GUARD, WHILE /api/dev-login KEEPS ITS ONE.
// dev-login signs in the demo OWNER — an identity that can read
// webhook_secret, change org settings and manage members. That is dangerous,
// so it is allowlisted to development and must stay that way; do not reuse
// this file's reasoning to loosen it.
//
// The identity behind THIS route holds the demo_readonly Postgres role, which
// has SELECT and nothing else (migration 20260904120000_demo_readonly_role.sql).
// Grants are checked below RLS, so every INSERT/UPDATE/DELETE and every
// SECURITY DEFINER RPC is denied, and it holds exactly one
// organization_members row, in TEKGUYZ Demo. Publishing this route therefore
// grants a stranger precisely the read access the case study is already
// advertising, and nothing more.
//
// Proven, not assumed: src/lib/demo/demo-visitor.rls.test.ts, 26 assertions
// run against this exact account by `npm run test:rls`.
//
// A side effect on GET is deliberate, but it is NOT harmless, and the two
// guards below are the whole reason this route is safe to publish.
//
// The comment that used to sit here said a link prefetcher hitting this route
// "mints a throwaway token and changes no state". That was wrong, and it cost
// a real operator their session on 2026-09-11. Signing in writes the session
// cookie of whatever browser made the request, so the RSC prefetch Next fires
// for the `<Link href="/demo">` on /login silently replaced a signed-in
// operator's own session with the demo one. The page in front of them still
// showed their tenant (client router cache), so the swap was invisible until
// the next server request — which surfaced as a 500 from the "Not spam"
// Server Action (demo_readonly holds SELECT only, so its activity_logs INSERT
// is denied) and as the account "switching to demo" on the next refresh.
//
// Guard 1: an RSC request is never a deliberate visit. A human clicking the
// link performs a full document navigation, which carries no RSC header.
// Guard 2: never replace a session that already exists. A signed-in user who
// reaches this route is bounced to the app as themselves; to see the demo they
// sign out first. Protecting the real session beats the convenience.
//
// Belt and braces: /login links here with a plain <a>, so no prefetch is even
// attempted. Do not change it back to <Link>.
export async function GET(request: Request) {
  // Guard 1 — prefetch / RSC. 204 rather than a redirect: the prefetcher gets
  // a valid, cheap, cookie-free answer and caches nothing that matters.
  if (request.headers.get("RSC") || request.headers.get("Next-Router-Prefetch")) {
    return new NextResponse(null, { status: 204 });
  }

  const email = process.env.DEMO_VISITOR_EMAIL?.trim();
  const password = process.env.DEMO_VISITOR_PASSWORD?.trim();

  // Fail loudly rather than 500-ing on an undefined credential. A deploy
  // missing these is a configuration bug, not a visitor's problem. Both are
  // in validate-env.ts's required list, so this should be unreachable in a
  // correctly configured deployment — it exists for the one that is not.
  if (!email || !password) {
    console.error("[/demo] DEMO_VISITOR_EMAIL or DEMO_VISITOR_PASSWORD is not set in this environment.");
    return new NextResponse("The demo is not configured for this deployment.", { status: 503 });
  }

  const supabase = await createClient();

  // Guard 2 — an existing session is never overwritten. getClaims, not
  // getUser, for the same reason every other render-path call site uses it:
  // the signature is verified locally against the project's ES256 key, so this
  // costs no round-trip. An expired or absent session yields no claims and
  // falls through to the sign-in below, which is what an anonymous visitor
  // wants.
  const { data: claimsData } = await supabase.auth.getClaims();
  if (claimsData?.claims) {
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL));
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Never echo the auth error to the visitor — it distinguishes "no such
    // user" from "wrong password" for anyone probing the endpoint.
    console.error("[/demo] demo visitor sign-in failed:", error.message);
    return new NextResponse("The demo is temporarily unavailable.", { status: 503 });
  }

  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL));
}
