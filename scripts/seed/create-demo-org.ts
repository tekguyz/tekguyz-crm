// Creates (idempotently) a dedicated "TEKGUYZ Demo" organization with
// realistic mock leads/activity_logs, entirely separate from the real
// TEKGUYZ tenant — so there's something worth looking at for design
// evaluation without ever touching real data.
//
// Usage: npm run seed:demo
//
// Safe to re-run: if "TEKGUYZ Demo" already exists and already has leads,
// this is a no-op (use `npm run seed:demo:reset` to wipe and reseed fresh).
import { ensureDemoOrg, DEMO_ORG_NAME } from "./lib/demo-org";
import { seedDemoLeads, countDemoLeads } from "./lib/demo-data";
import { reportNonDemoOrgSafety } from "./lib/safety";

async function main() {
  await reportNonDemoOrgSafety("before");

  console.log(`\nEnsuring "${DEMO_ORG_NAME}" exists...`);
  const { orgId, orgCreated } = await ensureDemoOrg();
  console.log(orgCreated ? `Created org ${orgId}` : `Found existing org ${orgId}`);

  const existingLeadCount = await countDemoLeads(orgId);
  if (existingLeadCount > 0) {
    console.log(
      `\n"${DEMO_ORG_NAME}" already has ${existingLeadCount} lead(s) — skipping seeding to avoid duplicates.` +
        `\nRun \`npm run seed:demo:reset\` to wipe and reseed fresh.`,
    );
    await reportNonDemoOrgSafety("after");
    return;
  }

  console.log("Seeding demo leads and activity logs...");
  const { leadCount, logCount } = await seedDemoLeads(orgId);
  console.log(`Seeded ${leadCount} leads and ${logCount} activity log entries into "${DEMO_ORG_NAME}".`);

  console.log(
    `\nNote: Prompt 14's weekly revenue cron sweeps every organization, including this one — once seeded, ` +
      `"${DEMO_ORG_NAME}" will start receiving real weekly report emails to its owner account. Flagging, not ` +
      `deciding: either accept that as harmless noise, or add an \`is_demo\` exclusion to the cron's org loop.`,
  );

  await reportNonDemoOrgSafety("after");
}

main().catch((err) => {
  console.error("\nSeed failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
