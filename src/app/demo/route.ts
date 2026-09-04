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
// A side effect on GET is deliberate. Signing in is idempotent and mutates
// nothing, so a link prefetcher that hits this mints a throwaway token and
// changes no state. A POST behind an interstitial page would cost the visitor
// a second click and buy nothing.
export async function GET() {
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
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Never echo the auth error to the visitor — it distinguishes "no such
    // user" from "wrong password" for anyone probing the endpoint.
    console.error("[/demo] demo visitor sign-in failed:", error.message);
    return new NextResponse("The demo is temporarily unavailable.", { status: 503 });
  }

  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL));
}
