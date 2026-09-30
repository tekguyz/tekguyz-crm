import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Daily Vercel cron (vercel.json): deletes every Demo Org older than 7 days,
// with every row it owns, and then its Guest (#29 user stories 39–40).
//
// The database function delete_expired_demo_orgs decides what is safe to
// delete — only is_demo orgs, never "TEKGUYZ Demo", never an org with a member
// who is not a Guest — and deletes the org rows in one statement
// (supabase/migrations/20260929120000_demo_org_per_guest.sql). This route only
// deletes the Guests it hands back, through the Auth admin API, because auth
// users are GoTrue's to delete, not SQL's.
//
// A Guest whose delete fails here is handed back again on the next run: the
// function also returns every old Guest left with no org. So a failed run
// heals itself; nothing is lost by returning 500 and trying tomorrow.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const BATCH = 100;
// A ceiling, not an expectation: 50 new Demo Orgs an hour is the cap, so a
// day is at most 1,200 — twelve batches.
const MAX_BATCHES = 20;

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString();
  let guestsDeleted = 0;
  let guestsFailed = 0;

  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const { data, error } = await admin.rpc("delete_expired_demo_orgs", {
      p_cutoff: cutoff,
      p_limit: BATCH,
    });
    if (error) {
      console.error("[demo-cleanup cron] delete_expired_demo_orgs failed:", error.message);
      return NextResponse.json({ error: "Cleanup failed", guestsDeleted, guestsFailed }, { status: 500 });
    }

    const rows = (data ?? []) as { guest_user_id: string }[];
    for (const { guest_user_id } of rows) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(guest_user_id);
      if (deleteError) {
        guestsFailed += 1;
        console.error(`[demo-cleanup cron] could not delete Guest ${guest_user_id}:`, deleteError.message);
      } else {
        guestsDeleted += 1;
      }
    }

    if (rows.length < BATCH) break;
  }

  console.log(`[demo-cleanup cron] deleted ${guestsDeleted} Guest(s); ${guestsFailed} failed.`);
  return NextResponse.json({ guestsDeleted, guestsFailed }, { status: guestsFailed ? 500 : 200 });
}
