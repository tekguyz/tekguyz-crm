import type { SupabaseClient } from "@supabase/supabase-js";

// `.in()` serializes into the query string, so a batch where most rows are
// duplicates would blow past URL length limits in one call.
const LOOKUP_CHUNK = 250;

export type DuplicateBreakdown = { active: number; archived: number };

// Purely descriptive: reports whether skipped duplicates were active or
// archived leads so the summary can say so. Deliberately changes nothing —
// archived duplicates stay skipped. The Resurrection Engine is reserved for
// webhook resubmissions (lib/webhooks/ingest-lead.ts); bulk import is a
// distinct path that must never reactivate an archived lead.
export async function reportDuplicateBreakdown(
  supabase: SupabaseClient,
  organizationId: string,
  emails: string[],
): Promise<DuplicateBreakdown> {
  const breakdown: DuplicateBreakdown = { active: 0, archived: 0 };
  if (emails.length === 0) return breakdown;

  for (let i = 0; i < emails.length; i += LOOKUP_CHUNK) {
    const chunk = emails.slice(i, i + LOOKUP_CHUNK);
    const { data, error } = await supabase
      .from("leads")
      .select("email, archived")
      .eq("organization_id", organizationId)
      .in("email", chunk);

    if (error) {
      console.error("[reportDuplicateBreakdown] lookup failed:", error.message);
      continue;
    }

    for (const row of data ?? []) {
      if (row.archived) breakdown.archived += 1;
      else breakdown.active += 1;
    }
  }

  return breakdown;
}
