import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations/current";
import {
  getLeadsForExport,
  leadsCsvFilename,
  leadsToCsv,
} from "@/lib/leads/export-csv";

// A route handler rather than a Server Action, because the deliverable is a
// FILE: Content-Disposition hands the browser a real download with a real
// filename, where an action would have to round-trip the whole CSV through the
// RSC payload and rebuild it as a Blob on the client.
//
// The auth check is written here and not inherited. `updateSession` in
// lib/supabase/middleware.ts deliberately exempts /api/* from its redirect (an
// unauthenticated API call should get a status, not an HTML login page), so a
// route under /api is NOT gated by the middleware and must gate itself.
// getCurrentOrg would redirect, which is wrong for a download — a 401 is the
// honest answer.
//
// Read-only, so the demo tenant's SELECT-only `demo_readonly` role can use it
// unchanged; nothing here writes, and no grant or policy is involved.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { orgId, orgName } = await getCurrentOrg();
  const leads = await getLeadsForExport(orgId);

  return new NextResponse(leadsToCsv(leads), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${leadsCsvFilename(orgName)}"`,
      // An export is a point-in-time snapshot of tenant data. Nothing may
      // cache it — not the browser, not a proxy.
      "Cache-Control": "no-store",
    },
  });
}
