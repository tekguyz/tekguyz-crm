// Wipes and re-seeds "TEKGUYZ Demo" cleanly. Safe to run repeatedly while
// design work is in progress — creates the org first if it doesn't exist
// yet, so this also works standalone without requiring create-demo-org.ts
// to have been run first.
//
// Usage: npm run seed:demo:reset
import { ensureDemoOrg, DEMO_ORG_NAME } from "./lib/demo-org";
import { seedSampleData, wipeSampleData } from "./lib/seed-sample-data";
import { reportNonDemoOrgSafety } from "./lib/safety";

async function main() {
  await reportNonDemoOrgSafety("before");

  console.log(`\nEnsuring "${DEMO_ORG_NAME}" exists...`);
  const { orgId } = await ensureDemoOrg();

  console.log("Wiping existing demo prospects and leads (logs, submissions and tasks cascade)...");
  const wiped = await wipeSampleData(orgId);
  console.log(`Deleted ${wiped.prospects} prospect(s) and ${wiped.leads} lead(s).`);

  console.log("Re-seeding the Sample Data...");
  const counts = await seedSampleData(orgId);
  console.log(`Seeded ${JSON.stringify(counts)} into "${DEMO_ORG_NAME}".`);

  await reportNonDemoOrgSafety("after");
}

main().catch((err) => {
  console.error("\nReset failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
