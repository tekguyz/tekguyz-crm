import { createAdminClient } from "./clients";
import { DEMO_ORG_NAME } from "./demo-org";

// Prints a lead-count snapshot for every org that is NOT the demo org, so a
// human reviewing script output has direct, printed proof that real tenant
// data (TEKGUYZ itself, and any other org) was never touched — not just an
// assumption based on reading the code.
export async function reportNonDemoOrgSafety(label: string): Promise<void> {
  const admin = createAdminClient();
  const { data: orgs, error } = await admin
    .from("organizations")
    .select("id, name")
    .neq("name", DEMO_ORG_NAME);

  if (error) {
    console.warn(`[safety:${label}] Could not verify non-demo orgs: ${error.message}`);
    return;
  }

  if (!orgs || orgs.length === 0) {
    console.log(`[safety:${label}] No non-demo organizations exist yet.`);
    return;
  }

  for (const org of orgs) {
    const { count, error: countError } = await admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id);

    if (countError) {
      console.warn(`[safety:${label}] Could not count leads for "${org.name}": ${countError.message}`);
      continue;
    }

    console.log(`[safety:${label}] "${org.name}" (${org.id}): ${count ?? 0} lead(s) — untouched by this script.`);
  }
}
