// Wipes and re-seeds "TEKGUYZ Demo" cleanly. Safe to run repeatedly while
// design work is in progress — creates the org first if it doesn't exist
// yet, so this also works standalone without requiring create-demo-org.ts
// to have been run first.
//
// Usage: npm run seed:demo:reset
import { ensureDemoOrg, DEMO_ORG_NAME } from "./lib/demo-org";
import { wipeDemoLeads, seedDemoLeads } from "./lib/demo-data";
import { wipeDemoProspects, seedDemoProspects } from "./lib/demo-prospects";
import { seedDemoTasks } from "./lib/demo-tasks";
import { reportNonDemoOrgSafety } from "./lib/safety";

async function main() {
  await reportNonDemoOrgSafety("before");

  console.log(`\nEnsuring "${DEMO_ORG_NAME}" exists...`);
  const { orgId } = await ensureDemoOrg();

  // Prospects first, leads second. prospects.promoted_lead_id is ON DELETE SET
  // NULL, so deleting leads first would not fail — it would quietly leave any
  // promoted demo prospect sitting at status='CONVERTED' with a NULL
  // promoted_lead_id, which is exactly the split truth this feature forbids.
  // Wiping prospects first means that state can never exist mid-reset.
  console.log("Wiping existing demo prospects...");
  const wipedProspects = await wipeDemoProspects(orgId);
  console.log(`Deleted ${wipedProspects} existing prospect(s).`);

  // Tasks need no explicit wipe: tasks.lead_id is ON DELETE CASCADE, so the
  // lead wipe below takes them with it. Wiping them separately first would be
  // a second statement that can only ever be a no-op, and a no-op statement in
  // a reset script reads like a safety measure while providing none.
  console.log("Wiping existing demo leads (activity_logs, lead_submissions and tasks cascade)...");
  const wiped = await wipeDemoLeads(orgId);
  console.log(`Deleted ${wiped} existing lead(s).`);

  console.log("Re-seeding fresh demo leads and activity logs...");
  const { leadCount, logCount } = await seedDemoLeads(orgId);
  console.log(`Seeded ${leadCount} leads and ${logCount} activity log entries.`);

  // After leads, always — tasks.lead_id is NOT NULL.
  console.log("Re-seeding demo follow-up tasks...");
  const taskCount = await seedDemoTasks(orgId);
  console.log(`Seeded ${taskCount} tasks.`);

  console.log("Re-seeding synthetic demo prospects...");
  const prospectCount = await seedDemoProspects(orgId);
  console.log(`Seeded ${prospectCount} prospects into "${DEMO_ORG_NAME}".`);

  await reportNonDemoOrgSafety("after");
}

main().catch((err) => {
  console.error("\nReset failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
