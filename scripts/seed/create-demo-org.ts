// Creates (idempotently) a dedicated "TEKGUYZ Demo" organization with
// realistic mock leads/activity_logs and synthetic prospects, entirely
// separate from the real TEKGUYZ tenant — so there's something worth looking
// at for design evaluation without ever touching real data.
//
// Usage: npm run seed:demo
//
// Safe to re-run: leads and prospects are each seeded only when that table is
// empty for the demo org, so a re-run is a no-op for whichever is already
// there (use `npm run seed:demo:reset` to wipe and reseed fresh).
import { ensureDemoOrg, DEMO_ORG_NAME } from "./lib/demo-org";
import { seedDemoLeads, countDemoLeads } from "./lib/demo-data";
import { seedDemoProspects, countDemoProspects } from "./lib/demo-prospects";
import { reportNonDemoOrgSafety } from "./lib/safety";

async function main() {
  await reportNonDemoOrgSafety("before");

  console.log(`\nEnsuring "${DEMO_ORG_NAME}" exists...`);
  const { orgId, orgCreated } = await ensureDemoOrg();
  console.log(orgCreated ? `Created org ${orgId}` : `Found existing org ${orgId}`);

  // Leads and prospects are checked independently rather than behind one
  // early return. They are separate tables filled by separate units, and a
  // demo org seeded before prospects existed would otherwise never get any.
  const existingLeadCount = await countDemoLeads(orgId);
  if (existingLeadCount > 0) {
    console.log(
      `\n"${DEMO_ORG_NAME}" already has ${existingLeadCount} lead(s) — skipping lead seeding to avoid duplicates.`,
    );
  } else {
    console.log("\nSeeding demo leads and activity logs...");
    const { leadCount, logCount } = await seedDemoLeads(orgId);
    console.log(`Seeded ${leadCount} leads and ${logCount} activity log entries.`);
  }

  const existingProspectCount = await countDemoProspects(orgId);
  if (existingProspectCount > 0) {
    console.log(
      `"${DEMO_ORG_NAME}" already has ${existingProspectCount} prospect(s) — skipping prospect seeding.`,
    );
  } else {
    console.log("Seeding synthetic demo prospects...");
    const prospectCount = await seedDemoProspects(orgId);
    console.log(`Seeded ${prospectCount} prospects.`);
  }

  console.log(
    `\nRun \`npm run seed:demo:reset\` to wipe and reseed fresh.` +
      `\n\nNote: Prompt 14's weekly revenue cron sweeps every organization, including this one — once seeded, ` +
      `"${DEMO_ORG_NAME}" will start receiving real weekly report emails to its owner account. Flagging, not ` +
      `deciding: either accept that as harmless noise, or add an \`is_demo\` exclusion to the cron's org loop.`,
  );

  await reportNonDemoOrgSafety("after");
}

main().catch((err) => {
  console.error("\nSeed failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
