"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { takeDemoSlot } from "@/lib/demo/demo-caps";
import { GUEST_ORG_NAME, newGuestCredentials } from "@/lib/demo/guest";
import { buildSampleData } from "@/lib/demo/sample-data";

// "Start demo" — the only door into the demo (#29, #31;
// docs/adr/0001-each-guest-gets-their-own-demo-org.md).
//
// A Server Action, so it runs on POST only. No link, preview, prefetch or
// crawler can trigger it; only a button press can. Nothing submits it on
// page load. This is the fix for the 2026-09-11 incident, where a prefetch of
// the old `GET /demo` replaced a real signed-in session.
//
// In order, and the order is the design:
//   1. A session already exists → go home as that user. Nothing is created
//      and no cap is spent. A real session is never replaced.
//   2. Take a slot under the hourly caps. Over either → the busy message.
//   3. Make the Guest (admin API), then the Demo Org with its Sample Data (one
//      database transaction), then sign the Guest in on the server.
//   4. Go home.
//
// This is the only path besides an invite that creates an account
// (docs/SECURITY_MODEL.md rule 7). It creates only `.test` Guests, and each
// Guest owns exactly one Demo Org.

export type StartDemoState = { error: string } | null;

const BUSY = "The demo is busy. Try again in a few minutes.";
const FAILED = "The demo could not start. Try again in a few minutes.";

export async function startDemo(_prev: StartDemoState, _formData: FormData): Promise<StartDemoState> {
  const supabase = await createClient();

  // getClaims, not getUser: verified locally, no round trip
  // (docs/SECURITY_MODEL.md rule 6).
  const { data: claimsData } = await supabase.auth.getClaims();
  if (claimsData?.claims) {
    redirect("/");
  }

  if (!(await takeDemoSlot(await clientIp()))) {
    return { error: BUSY };
  }

  const admin = createAdminClient();
  const { email, password } = newGuestCredentials();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    // Pre-confirmed: no email is sent, and GoTrue's email rate limit is never
    // touched.
    email_confirm: true,
    user_metadata: { guest: true },
  });
  if (createError || !created.user) {
    console.error("[startDemo] could not create the Guest:", createError?.message);
    return { error: FAILED };
  }
  const guestId = created.user.id;

  const { error: orgError } = await admin.rpc("create_demo_org", {
    p_user_id: guestId,
    p_name: GUEST_ORG_NAME,
    p_sample: buildSampleData(new Date()),
  });
  if (orgError) {
    // The function is one transaction, so no org or row exists. The Guest
    // does; remove it now rather than leave it for the cleanup.
    console.error("[startDemo] create_demo_org failed:", orgError.message);
    await admin.auth.admin.deleteUser(guestId);
    return { error: FAILED };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    // The Guest and the Demo Org exist but nobody holds them. The daily
    // cleanup removes both after 7 days; nothing else can reach them.
    console.error("[startDemo] Guest sign-in failed:", signInError.message);
    return { error: FAILED };
  }

  redirect("/");
}

// "Leave the demo", from the demo banner. Signs out and returns to the Landing
// Page. The Guest and their Demo Org are left for the daily cleanup, so
// leaving is only a sign-out and can never lose anything by accident.
export async function leaveDemo(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// Vercel sets x-forwarded-for; its FIRST entry is the visitor. Any later entry
// is a proxy. "unknown" pools every press with no address into one per-IP
// bucket, which only makes the cap stricter for them.
async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
}
