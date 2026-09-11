import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// DEV ONLY. Signs in the disposable demo-owner account server-side and drops
// the resulting session cookie, so a local browser (or an agent driving one)
// can reach the authenticated app without a human typing a password into a
// form. This is a REAL sign-in, not an auth bypass: RLS, org membership and
// role enforcement all apply exactly as they do for any other user, which is
// the point — a bypass would let broken tenant scoping pass unnoticed.
//
// It lives under /api/ deliberately. `isApiRoute` in
// src/lib/supabase/middleware.ts already exempts that prefix from the
// unauthenticated redirect, so this route needs no change to the auth
// middleware at all.
//
// Kept in sync by hand with scripts/seed/lib/demo-org.ts, which owns this
// account and creates it. Change one, change the other.
const DEMO_OWNER_EMAIL = "tekguyz.demo.owner@example.com";
const DEMO_OWNER_PASSWORD = "Tekguyz-Demo-Seed-Owner-2026!";

export async function GET(request: Request) {
  // Allowlist rather than a `!== "production"` denylist: on any build whose
  // NODE_ENV is unset or unexpected, this route does not exist.
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_OWNER_EMAIL,
    password: DEMO_OWNER_PASSWORD,
  });

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        hint: "Run `npm run seed:demo` — it creates this account and the TEKGUYZ Demo org.",
      },
      { status: 401 },
    );
  }

  // Back to the SAME origin the request came in on, never a fixed one. This
  // used to resolve against NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // so a dev server on any other port (3001, when a stale `node` holds 3000 —
  // common on this Windows machine) signed you in and then threw you onto a
  // different server. The session cookie is host-scoped, not port-scoped, so
  // staying on the request's own origin is all that was ever needed.
  //
  // `?next=/some/path` lands on that page instead of `/`, so one link reaches
  // a dev-only route like /shell/pipeline directly. Same-origin only, checked
  // AFTER parsing rather than by string prefix: `//evil.example` and
  // `/\evil.example` both parse to a foreign host (WHATWG treats `\` as `/`),
  // and a startsWith("/") check passes the second one. Anything that resolves
  // off this origin falls back to `/`, so this cannot become an open redirect.
  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  let resolved: URL | null = null;
  try {
    resolved = next ? new URL(next, url.origin) : null;
  } catch {
    // Unparseable (e.g. `http://[`) — fall through to `/`.
  }
  const target = resolved && resolved.origin === url.origin ? resolved : new URL("/", url.origin);

  return NextResponse.redirect(target);
}
