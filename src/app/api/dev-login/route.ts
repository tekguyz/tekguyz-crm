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

export async function GET() {
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

  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
}
