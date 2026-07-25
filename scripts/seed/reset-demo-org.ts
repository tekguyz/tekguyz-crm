// Wipes and re-seeds "TEKGUYZ Demo" cleanly. Safe to run repeatedly while
// design work is in progress — creates the org first if it doesn't exist
// yet, so this also works standalone without requiring create-demo-org.ts
// to have been run first.
//
// Usage: npm run seed:demo:reset
import { ensureDemoOrg, DEMO_ORG_NAME } from "./lib/demo-org";
import { wipeDemoLeads, seedDemoLeads } from "./lib/demo-data";
import { reportNonDemoOrgSafety } from "./lib/safety";

async function main() {
  await reportNonDemoOrgSafety("before");

  console.log(`\nEnsuring "${DEMO_ORG_NAME}" exists...`);
  const { orgId } = await ensureDemoOrg();

  console.log("Wiping existing demo leads (activity_logs cascade automatically)...");
  const wiped = await wipeDemoLeads(orgId);
  console.log(`Deleted ${wiped} existing lead(s).`);

  console.log("Re-seeding fresh demo leads and activity logs...");
  const { leadCount, logCount } = await seedDemoLeads(orgId);
  console.log(`Seeded ${leadCount} leads and ${logCount} activity log entries into "${DEMO_ORG_NAME}".`);

  await reportNonDemoOrgSafety("after");
}

main().catch((err) => {
  console.error("\nReset failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
