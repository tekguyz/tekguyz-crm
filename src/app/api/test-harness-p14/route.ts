import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// TEMPORARY — local-only verification harness for Prompt 14's weekly report
// cron. Runs inside the dev server process so it can read process.env
// (CRON_SECRET, PLATFORM_RESEND_API_KEY) without ever surfacing those raw
// values to the caller. Delete this file once verification is complete —
// never ship or commit it.
export async function POST(request: NextRequest) {
  const { action, ...params } = await request.json();

  switch (action) {
    case "find-admin-user": {
      const supabase = createAdminClient();
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const user = data.users.find((u) => u.email === params.email);
      return NextResponse.json({ userId: user?.id ?? null, email: user?.email ?? null });
    }

    case "setup-fixtures": {
      const supabase = createAdminClient();
      const { adminUserId } = params as { adminUserId: string };

      const { data: orgActive, error: orgActiveErr } = await supabase
        .from("organizations")
        .insert({ name: "Prompt14 Test — Active Org" })
        .select("id")
        .single();
      if (orgActiveErr) return NextResponse.json({ error: orgActiveErr.message }, { status: 500 });

      const { data: orgQuiet, error: orgQuietErr } = await supabase
        .from("organizations")
        .insert({ name: "Prompt14 Test — Quiet Org" })
        .select("id")
        .single();
      if (orgQuietErr) return NextResponse.json({ error: orgQuietErr.message }, { status: 500 });

      const { error: memberErr } = await supabase.from("organization_members").insert([
        { organization_id: orgActive.id, user_id: adminUserId, role: "OWNER" },
        { organization_id: orgQuiet.id, user_id: adminUserId, role: "OWNER" },
      ]);
      if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

      const now = new Date().toISOString();
      const leads = [
        {
          organization_id: orgActive.id,
          client_name: "Won Co",
          email: "won@prompt14test.example.com",
          outcome: "WON",
          closed_at: now,
          actual_revenue: 5000,
          estimated_revenue: 4500,
        },
        {
          organization_id: orgActive.id,
          client_name: "Open Prospect",
          email: "open@prompt14test.example.com",
          outcome: null,
          archived: false,
          estimated_revenue: 3000,
        },
        {
          organization_id: orgActive.id,
          client_name: "Lost Co",
          email: "lost@prompt14test.example.com",
          outcome: "LOST",
          closed_at: now,
          estimated_revenue: 2000,
        },
        {
          organization_id: orgActive.id,
          client_name: "Abandoned Co",
          email: "abandoned@prompt14test.example.com",
          outcome: "ABANDONED",
          closed_at: now,
          estimated_revenue: 1000,
        },
      ];

      const { error: leadsErr } = await supabase.from("leads").insert(leads);
      if (leadsErr) return NextResponse.json({ error: leadsErr.message }, { status: 500 });

      return NextResponse.json({ orgActiveId: orgActive.id, orgQuietId: orgQuiet.id });
    }

    case "trigger-cron-authorized": {
      const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const res = await fetch(`${base}/api/cron/weekly-report`, {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      const body = await res.json().catch(() => null);
      return NextResponse.json({ status: res.status, body });
    }

    case "fetch-recent-emails": {
      const apiKey = process.env.PLATFORM_RESEND_API_KEY;
      if (!apiKey) return NextResponse.json({ error: "no platform Resend key" }, { status: 500 });
      const res = await fetch("https://api.resend.com/emails", {
        headers: { authorization: `Bearer ${apiKey}` },
      });
      const body = await res.json().catch(() => null);
      return NextResponse.json({ status: res.status, body });
    }

    case "fetch-email-detail": {
      const apiKey = process.env.PLATFORM_RESEND_API_KEY;
      if (!apiKey) return NextResponse.json({ error: "no platform Resend key" }, { status: 500 });
      const res = await fetch(`https://api.resend.com/emails/${params.emailId}`, {
        headers: { authorization: `Bearer ${apiKey}` },
      });
      const body = await res.json().catch(() => null);
      return NextResponse.json({ status: res.status, body });
    }

    case "teardown-fixtures": {
      const supabase = createAdminClient();
      const { orgIds } = params as { orgIds: string[] };
      const { error } = await supabase.from("organizations").delete().in("id", orgIds);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ deleted: orgIds });
    }

    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
}
