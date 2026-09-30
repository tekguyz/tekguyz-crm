import { createAdminClient } from "./clients";
import { DEMO_ORG_NAME } from "./demo-org";
import { buildSampleData } from "../../../src/lib/demo/sample-data";

// Writes the Sample Data into "TEKGUYZ Demo" for /api/dev-login. The rows come
// from src/lib/demo/sample-data.ts, the same copy every Guest's Demo Org gets
// (#31). Plain inserts with the service-role client: this org already exists,
// so the create_demo_org database function (which makes a NEW org) does not fit.
//
// Not one transaction, unlike create_demo_org. A failure part-way leaves some
// rows; `npm run seed:demo:reset` wipes and starts over.
export async function seedSampleData(orgId: string): Promise<Record<string, number>> {
  const admin = createAdminClient();
  const sample = buildSampleData(new Date());

  // tasks.created_by is NOT NULL with an FK to auth.users. The org's OWNER is
  // the natural author, resolved from the membership table rather than by a
  // second copy of the owner's email.
  const { data: owner, error: ownerError } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("role", "OWNER")
    .limit(1)
    .single();
  if (ownerError || !owner) {
    throw new Error(`Failed to resolve the demo org's OWNER: ${ownerError?.message ?? "none found"}`);
  }

  const withOrg = <T extends object>(rows: T[]) => rows.map((row) => ({ ...row, organization_id: orgId }));

  // In dependency order: every child row names a lead.
  const steps: [string, object[]][] = [
    ["leads", withOrg(sample.leads)],
    ["lead_submissions", withOrg(sample.submissions)],
    ["activity_logs", withOrg(sample.activity_logs)],
    ["tasks", withOrg(sample.tasks).map((task) => ({ ...task, created_by: owner.user_id }))],
    ["prospects", withOrg(sample.prospects)],
  ];

  const counts: Record<string, number> = {};
  for (const [table, rows] of steps) {
    const { error } = await admin.from(table).insert(rows);
    if (error) throw new Error(`Failed to insert demo ${table}: ${error.message}`);
    counts[table] = rows.length;
  }
  return counts;
}

export async function countDemoLeads(orgId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);

  if (error) throw new Error(`Failed to count demo leads: ${error.message}`);
  return count ?? 0;
}

// Deletes every prospect and lead in "TEKGUYZ Demo". activity_logs,
// lead_submissions and tasks cascade from leads.
//
// Prospects first: prospects.promoted_lead_id is ON DELETE SET NULL, so
// deleting leads first would leave a promoted prospect at status CONVERTED
// with no lead id — the split truth the promotion rule forbids.
export async function wipeSampleData(orgId: string): Promise<{ prospects: number; leads: number }> {
  const admin = createAdminClient();

  // Hard safety check, right before the destructive calls, independent of
  // whatever the caller believes orgId is: refuse unless this id resolves to
  // the demo org by name.
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .single();

  if (orgError || !org) {
    throw new Error(`Refusing to wipe: could not verify org ${orgId} (${orgError?.message ?? "not found"})`);
  }
  if (org.name !== DEMO_ORG_NAME) {
    throw new Error(
      `Refusing to wipe: org ${orgId} is named "${org.name}", not "${DEMO_ORG_NAME}". Aborting to protect real data.`,
    );
  }

  const deleted = { prospects: 0, leads: 0 };
  for (const table of ["prospects", "leads"] as const) {
    const { count, error } = await admin
      .from(table)
      .delete({ count: "exact" })
      .eq("organization_id", orgId);
    if (error) throw new Error(`Failed to delete demo ${table}: ${error.message}`);
    deleted[table] = count ?? 0;
  }
  return deleted;
}
